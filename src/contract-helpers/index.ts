import { TronWeb } from "tronweb";
import {
  ContractCallArgs,
  MultiCallArgs,
  TransactionOption,
  ContractQuery,
  ContractQueryTrigger,
  ContractQueryCallback,
  SignTransaction,
} from "../types";
import { executePromise, mapSeries, retry } from "../helper";
import debounce, { DebouncedFunction } from "debounce";
import { v4 as uuidv4 } from "uuid";
import { ContractHelperOptions } from "../types";
import { ContractHelperBase } from "./contract-helper-base";
import { TronContractHelper } from "./tron";
import { EthContractHelper } from "./eth";

export class ContractHelper {
  private helper: ContractHelperBase;
  private pendingQueries: ContractQuery[] = [];
  private lazyExec: DebouncedFunction<() => any>;
  private multicallMaxPendingLength: number;

  /**
   * @param provider - Tronweb instance
   * @param signer - Adapter, reference the @tronweb3/tronwallet-abstract-adapter
   */
  /**
   * @param options {
   *  provider: TronWeb | Provider(ethers.js);
   *  multicallV2Address: multicall v2 address;
   *  multicallLazyQueryTimeout?: number;
   * }
   */
  constructor(options: ContractHelperOptions) {
    const provider = options.provider;
    const multicallAddr = options.multicallV2Address;
    const multicallLazyQueryTimeout = options.multicallLazyQueryTimeout ?? 1000;
    this.multicallMaxPendingLength = options.multicallMaxPendingLength ?? 10;
    this.helper =
      provider instanceof TronWeb
        ? new TronContractHelper(multicallAddr, provider)
        : new EthContractHelper(multicallAddr, provider);
    this.addPendingCall = this.addPendingCall.bind(this);
    this.addPendingQuery = this.addPendingQuery.bind(this);
    this.lazyExec = debounce(() => {
      return this.executePendingCalls();
    }, multicallLazyQueryTimeout);
  }

  /**
   * @deprecated use call instead.
   */
  async getContractValue<T>(contractCallArgs: ContractCallArgs) {
    return this.call<T>(contractCallArgs);
  }

  /**
   * Call the contract readable value.
   * @param contractCallArgs
   * {
   *  address: contract address.
   *  abi: abi fragments.
   *  method: method name or full signature(if you use full signature, abi is optional).
   *  parameters: method parameters.
   * }
   */
  async call<T>(contractCallArgs: ContractCallArgs) {
    return this.helper.call<T>(contractCallArgs);
  }

  /**
   *@deprecated use multicall instead.
   */
  getMultiContractValues<T>(multicallArgs: MultiCallArgs[]) {
    return this.multicall(multicallArgs);
  }

  /**
   * Call the multicall.
   */
  multicall<T>(multicallArgs: MultiCallArgs[]) {
    return this.helper.multicall<T>(multicallArgs);
  }

  /**
   * options: TransactionOptions
   * TransactionOptions = {
   *    success?: () => void;
   *    error?: (error: any) => void;
   * }
   */
  /**
   * Sign the transaction and send it to network.
   * @param from signer address
   * @param signTransaction sign transaction function.
   * @param contractCall contract call arguments.
   * @param options execute callback options.
   */
  async send(
    from: string,
    signTransaction: SignTransaction,
    contractCall: ContractCallArgs,
    options?: TransactionOption
  ) {
    const txID = await this.helper.send(from, signTransaction, contractCall);
    return await this.helper.checkTransactionResult(txID, options);
  }

  /**
   * Return the pending call length.
   */
  get pendingCallLength() {
    return this.pendingQueries.length;
  }

  /**
   * @deprecated use pendingCallLength instead.
   */
  get pendingQueriesLength() {
    return this.pendingCallLength;
  }

  /**
   * Insert contract call to pending call queue, wait for the pending calls to be executed in a multicall request.
   */
  pendingCall<T>(query: ContractCallArgs) {
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

  /**
   * @deprecated use pendingCall instead.
   */
  queryByBundle<T>(query: ContractCallArgs) {
    return this.pendingCall(query);
  }

  /**
   * Insert contract call to pending call queue.
   */
  addPendingCall<T = any>(
    query: ContractQuery<T>,
    trigger?: ContractQueryTrigger
  ): Promise<T> {
    this.pendingQueries.push(query);
    // If callback is undefined, it will be call instant.
    if (
      !query.callback ||
      trigger ||
      this.pendingCallLength >= this.multicallMaxPendingLength
    ) {
      return this.executePendingCalls<T>();
    } else {
      return this.lazyExec();
    }
  }

  /**
   * @deprecated use addPendingCall instead.
   */
  addPendingQuery<T = any>(
    query: ContractQuery<T>,
    trigger?: ContractQueryTrigger
  ): Promise<T> {
    return this.addPendingCall(query, trigger);
  }

  /**
   * Execute the pending call queue.
   */
  executePendingCalls<T>(callback?: ContractQueryCallback<T>) {
    if (this.pendingCallLength === 0) {
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
        () => this.multicall(queries.map((el) => el.query)),
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

  /**
   * @deprecated use executePendingCalls instead.
   */
  executePendingQueries<T>(callback?: ContractQueryCallback<T>) {
    return this.executePendingCalls(callback);
  }
}

export default TronContractHelper;
