import { TronWeb } from "tronweb";
import {
  transformContractOptions,
  getInterfaceAndFragments,
  trackTransaction,
  handleContractValue,
} from "./contractHelpers";
import { Multicall } from "./multicall";
import {
  ContractOption,
  MultiCallContractOption,
  TransactionOption,
  TronResultError,
  ContractQuery,
  ContractQueryTrigger,
  ContractQueryCallback,
  SignTransaction,
} from "./types";
import { executePromise, mapSeries, retry } from "./helper";
import debounce, { DebouncedFunction } from "debounce";
import { v4 as uuidv4 } from "uuid";
import { ContractParamter, SignedTransaction } from "tronweb/lib/esm/types";

export class TronContractHelper {
  private provider: TronWeb;
  private multicall: Multicall | null = null;
  private pendingQueries: ContractQuery[] = [];
  private lazyExec: DebouncedFunction<() => any>;

  /**
   * @param provider - Tronweb instance
   * @param signer - Adapter, reference the @tronweb3/tronwallet-abstract-adapter
   */
  constructor(
    provider: TronWeb,
    multicallAddress?: string,
    multicallLazyQueryTimeout = 3000
  ) {
    this.provider = provider;
    if (multicallAddress) {
      this.multicall = new Multicall({
        provider,
        contractAddress: multicallAddress,
      });
    }
    this.addPendingQuery = this.addPendingQuery.bind(this);
    this.lazyExec = debounce(() => {
      return this.executePendingQueries();
    }, multicallLazyQueryTimeout);
  }

  /**
   * contractOption: {
   *  address:string;// contract address
   *  abi: ABI Fragments (copy from tronscan, not include the entry points, reference the ethers abi.); // contract abi
   *  method: method name, such as transfer
   *  parameters: method parameters.
   * }
   */
  async getContractValue<T>(contractOption: ContractOption) {
    const {
      address,
      abi,
      method,
      parameters = [],
    } = transformContractOptions(contractOption);
    const contract = this.provider.contract(abi as any, address);
    const rawResult = await contract[method](...parameters).call();
    const { functionFragment } = getInterfaceAndFragments(contractOption);
    const result = handleContractValue(rawResult, functionFragment);
    return result as T;
  }

  async getMultiContractValues<T>(contractOptions: MultiCallContractOption[]) {
    if (!this.multicall) {
      throw new Error(
        `Please supply the multicallAddress parameter in the constructor.`
      );
    }
    const results = await this.multicall.call(
      contractOptions.map((o) => {
        const contractOption = transformContractOptions(o);
        return {
          key: o.key,
          contractAddress: contractOption.address,
          abi: contractOption.abi,
          call: {
            methodName: contractOption.method,
            methodParameters: contractOption.parameters || [],
          },
        };
      })
    );
    const resultValues = Object.values(results.results);
    const filters = resultValues.filter((el) => !el.callReturnContext.success);
    if (filters.length > 0) {
      const methods = filters
        .map(
          (el) =>
            `${el.originalContractCallContext.contractAddress}:${
              el.originalContractCallContext.call.methodName
            }(${el.originalContractCallContext.call.methodParameters.join(
              ","
            )})`
        )
        .join(";");
      throw new Error(`Fetch data error from multicall contract: ${methods}`);
    }
    return Object.keys(results.results).reduce((prev, cur) => {
      prev[cur] = results.results[cur].callReturnContext.returnValue;
      return prev;
    }, {} as T);
  }

  async signTransaction(
    signer: string,
    sign: SignTransaction,
    contractOption: ContractOption
  ) {
    const { address, methodOverrides, parameters = [] } = contractOption;
    const { functionFragment } = getInterfaceAndFragments(contractOption);
    const provider = this.provider;
    const transaction = await provider.transactionBuilder.triggerSmartContract(
      address,
      functionFragment.format("sighash"),
      methodOverrides ? methodOverrides : {},
      functionFragment.inputs.map((el, i) => ({
        type: el.type,
        value: parameters[i],
      })),
      signer
    );
    let signedTransaction = await sign(transaction.transaction);
    return signedTransaction;
  }

  async broadcastTransaction(
    signedTransaction: SignedTransaction<ContractParamter>,
    options?: TransactionOption
  ) {
    const broadcast = await this.provider.trx.sendRawTransaction(
      signedTransaction
    );
    if (broadcast.code) {
      const err = new TronResultError(broadcast.message);
      err.code = broadcast.code;
      if (broadcast.message) {
        err.message = this.provider.toUtf8(broadcast.message);
      }
      const error = new TronResultError(err.message);
      error.code = broadcast.code;
      throw error;
    }
    if (options && options.success) {
      return await trackTransaction(signedTransaction, this.provider, options);
    }
    return trackTransaction(signedTransaction, this.provider, options);
  }

  /**
   * options: TransactionOptions
   * TransactionOptions = {
   *    success?: () => void;
   *    error?: (error: any) => void;
   * }
   */
  async send(
    signer: string,
    sign: SignTransaction,
    contractOption: ContractOption,
    options?: TransactionOption
  ) {
    const signedTransaction = await this.signTransaction(
      signer,
      sign,
      contractOption
    );
    return this.broadcastTransaction(signedTransaction, options);
  }

  get pendingQueriesLength() {
    return this.pendingQueries.length;
  }

  queryByBundle<T>(query: Omit<MultiCallContractOption, "key">) {
    const key = uuidv4();
    return new Promise<T>((resolve, reject) => {
      this.addPendingQuery<T>({
        query: {
          key,
          ...query,
        },
        callback: (value) => {
          resolve(value);
        },
      });
    });
  }

  addPendingQuery<T = any>(
    query: ContractQuery<T>,
    trigger?: ContractQueryTrigger
  ): Promise<T> {
    this.pendingQueries.push(query);
    // If callback is undefined, it will be call instant.
    if (!query.callback || trigger || this.pendingQueriesLength >= 10) {
      return this.executePendingQueries<T>();
    } else {
      return this.lazyExec();
    }
  }

  executePendingQueries<T>(callback?: ContractQueryCallback<T>) {
    if (this.pendingQueriesLength === 0) {
      return Promise.resolve([]) as Promise<T>;
    }
    const queries = [...this.pendingQueries];
    this.pendingQueries = [];
    const cb = queries.reduce((prev, cur) => {
      prev[cur.query.key] = cur.callback;
      return prev;
    }, {} as Record<string, ContractQuery["callback"]>);
    return executePromise(async () => {
      // request max 5 times for multicall query
      const values = await retry<any>(
        () => this.getMultiContractValues(queries.map((el) => el.query)),
        5,
        1000
      );
      const keys = Object.keys(values);
      const cbResult = await mapSeries(keys, async (key) => {
        const value = values[key];
        if (cb[key]) {
          // request max 5 times for every callback
          return await retry(async () => await cb[key]!(value), 5, 1000);
        } else {
          return value;
        }
      });
      if (cbResult.length === 1) {
        return cbResult[0] as T;
      }
      return cbResult as T;
    }, callback);
  }
}

export default TronContractHelper;
