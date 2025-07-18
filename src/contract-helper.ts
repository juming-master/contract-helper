import { TronWeb } from "tronweb";
import {
  ContractCallArgs,
  MultiCallArgs,
  TransactionOption,
  ContractQuery,
  ContractQueryTrigger,
  ContractQueryCallback,
  SendTransaction,
  SimpleTransactionResult,
  TrxFormatValue,
  EthFormatValue,
  TronContractCallOptions,
  EthContractCallOptions,
} from "./types";
import { runWithCallback, map, retry } from "./helper";
import debounce, { DebouncedFunction } from "debounce";
import { v4 as uuidv4 } from "uuid";
import { ContractHelperOptions } from "./types";
import { TronContractHelper } from "./tron";
import { EthContractHelper } from "./eth";
import { Provider as EthProvider } from "ethers";
import { TriggerSmartContractOptions } from "tronweb/lib/esm/types";

export class ContractHelper<Provider extends TronWeb | EthProvider = any> {
  private helper: TronContractHelper<TronWeb> | EthContractHelper<EthProvider>;
  private pendingQueries: ContractQuery<Provider>[] = [];
  private debounceExecuteLazyCalls: DebouncedFunction<() => any>;
  private multicallMaxPendingLength: number;
  private isTron: boolean;

  /**
   * @param options {
   *  provider: TronWeb | Provider(ethers.js);
   *  multicallV2Address: multicallv2 address;
   *  multicallLazyQueryTimeout?: maximum wait time for executing the pending call queue.
   *  multicallMaxPendingLength?: maximum length for the pending call queue.
   *  simulateBeforeSend?: simulate the transactions(use eth_call) before send then transaction.Only support eth.
   *  formatValue?: {
   *    address?: "base58"(only tron) | "checksum" | "hex"; // default base58 in tron and checksum in eth
   *    uint?: "bigint" | "bignumber"; // default bignumber
   *  }
   * }
   */
  constructor(options: ContractHelperOptions<Provider>) {
    const provider = options.provider;
    const multicallAddr = options.multicallV2Address;
    const multicallLazyQueryTimeout = options.multicallLazyQueryTimeout ?? 1000;
    this.multicallMaxPendingLength = options.multicallMaxLazyCallsLength ?? 10;
    this.isTron = Object.hasOwn(provider, "trx");
    this.helper = this.isTron
      ? new TronContractHelper<TronWeb>(
          multicallAddr,
          provider as TronWeb,
          options.formatValue as TrxFormatValue
        )
      : new EthContractHelper<EthProvider>(
          multicallAddr,
          provider as EthProvider,
          options.simulateBeforeSend ?? true,
          options.formatValue as EthFormatValue
        );
    this.addLazyCall = this.addLazyCall.bind(this);
    this.addPendingQuery = this.addPendingQuery.bind(this);
    this.debounceExecuteLazyCalls = debounce(() => {
      return this.executeLazyCalls();
    }, multicallLazyQueryTimeout);
  }

  /**
   * @deprecated use call instead.
   */
  async getContractValue<T>(contractCallArgs: ContractCallArgs<Provider>) {
    return this.call<T>(contractCallArgs);
  }

  /**
   * Call the contract to get a readable value.
   * @param contractCallArgs
   * {
   *  address: contract address.
   *  abi: abi fragments.
   *  method: method name or full signature. If full signature is used, ABI is optional.
   *  parameters: method parameters.
   * }
   */
  async call<T>(contractCallArgs: ContractCallArgs<Provider>) {
    return this.helper.call<T>(
      // @ts-ignore
      contractCallArgs
    );
  }

  /**
   *@deprecated use multicall instead.
   */
  getMultiContractValues<T>(multicallArgs: MultiCallArgs<Provider>[]) {
    return this.multicall<T>(multicallArgs);
  }

  /**
   * Use Multicall v2 to query with multiple arguments
   */
  multicall<T>(multicallArgs: MultiCallArgs<Provider>[]) {
    return this.helper.multicall<T>(multicallArgs);
  }

  /**
   * Sign the transaction and send it to the network.
   * @param from signer address
   * @param sendTransaction sign transaction function.
   * @param contractCall contract call arguments.
   */
  async send(
    from: string,
    sendTransaction: SendTransaction<Provider>,
    contractCall: ContractCallArgs<Provider>
  ) {
    const txId = await this.helper.send(
      from,
      // @ts-ignore
      sendTransaction,
      contractCall
    );
    return txId;
  }

  /**
   * Sign the transaction and send it to the network with trx&eth options.
   * @param from signer address
   * @param sendTransaction sign transaction function.
   * @param contractCall contract call arguments.
   * @param options includes trx: {feeLimit,tokenValue...} and eth: {gasPrice,...}
   */
  async sendWithOptions(
    from: string,
    sendTransaction: SendTransaction<Provider>,
    contractCall: Omit<ContractCallArgs<Provider>, "options">,
    options?: {
      trx?: TronContractCallOptions;
      eth?: EthContractCallOptions;
    }
  ) {
    const call: ContractCallArgs<Provider> = {
      ...contractCall,
      options: (this.isTron
        ? options?.trx
        : options?.eth) as ContractCallArgs<Provider>["options"],
    };
    return this.send(from, sendTransaction, call);
  }

  async sendAndCheckResult(
    from: string,
    sendTransaction: SendTransaction<Provider>,
    contractCall: Omit<ContractCallArgs<Provider>, "options">,
    options?: {
      trx?: TronContractCallOptions;
      eth?: EthContractCallOptions;
    },
    callback?: TransactionOption
  ) {
    const txId = await this.sendWithOptions(
      from,
      sendTransaction,
      contractCall,
      options
    );
    return this.checkTransactionResult(txId, callback);
  }

  async checkTransactionResult(
    txID: string,
    options?: TransactionOption
  ): Promise<SimpleTransactionResult> {
    return this.helper.checkTransactionResult(txID, options);
  }

  /**
   * Return the pending call length.
   */
  get lazyCallsLength() {
    return this.pendingQueries.length;
  }

  /**
   * @deprecated use pendingCallLength instead.
   */
  get pendingQueriesLength() {
    return this.lazyCallsLength;
  }

  /**
   * Insert a contract call to the pending call queue, and wait for the pending calls to be executed in a multicall request.
   */
  lazyCall<T>(query: ContractCallArgs<Provider>) {
    const key = uuidv4();
    return new Promise<T>((resolve, reject) => {
      this.addLazyCall<T>({
        query: {
          key,
          ...query,
        },
        callback: {
          success: async (value: T) => {
            resolve(value);
            return value;
          },
          error: reject,
        },
      });
    });
  }

  /**
   * @deprecated use lazyCall instead.
   */
  queryByBundle<T>(query: ContractCallArgs<Provider>) {
    return this.lazyCall(query);
  }

  /**
   * Insert a contract call to the pending call queue.
   */
  addLazyCall<T = any>(
    query: ContractQuery<Provider, T>,
    trigger?: ContractQueryTrigger
  ) {
    this.pendingQueries.push(query);
    // If callback is undefined, it will be call instant.
    if (
      !query.callback ||
      trigger ||
      this.lazyCallsLength >= this.multicallMaxPendingLength
    ) {
      this.executeLazyCalls<T>();
    } else {
      this.debounceExecuteLazyCalls();
    }
  }

  /**
   * @deprecated use addLazyCall instead.
   */
  addPendingQuery<T = any>(
    query: ContractQuery<Provider, T>,
    trigger?: ContractQueryTrigger
  ) {
    this.addLazyCall(query, trigger);
  }

  /**
   * Execute the pending call queue.
   */
  executeLazyCalls<T>(callback?: ContractQueryCallback<T>) {
    if (this.lazyCallsLength === 0) {
      return Promise.resolve([]) as Promise<T>;
    }
    const queries = [...this.pendingQueries];
    this.pendingQueries = [];
    const cb = queries.reduce((prev, cur) => {
      prev[cur.query.key] = cur.callback;
      return prev;
    }, {} as Record<string, ContractQuery<Provider>["callback"]>);
    return runWithCallback(
      async () => {
        // request max 5 times for multicall query
        const values = await retry<any>(
          () => this.multicall(queries.map((el) => el.query)),
          5,
          1000
        );
        const keys = Object.keys(values);
        const cbResult = await map(
          keys,
          async (key) => {
            const value = values[key];
            if (cb[key]) {
              // request max 5 times for every callback
              return await retry(async () => cb[key]?.success(value), 5, 1000);
            } else {
              return value;
            }
          },
          {
            concurrency: keys.length,
            stopOnError: false,
          }
        );
        if (cbResult.length === 1) {
          return cbResult[0] as T;
        }
        return cbResult as T;
      },
      {
        success: callback?.success,
        error(err) {
          const keys = Object.keys(cb);
          map(
            keys,
            async (key) => {
              if (cb[key]) {
                cb[key]?.error && cb[key].error(err);
              }
            },
            {
              concurrency: keys.length,
              stopOnError: false,
            }
          );
          callback?.error && callback.error(err);
        },
      }
    );
  }

  /**
   * @deprecated use executeLazyCalls instead.
   */
  executePendingQueries<T>(callback?: ContractQueryCallback<T>) {
    return this.executeLazyCalls(callback);
  }
}

export default ContractHelper;
