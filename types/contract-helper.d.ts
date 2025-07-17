import { TronWeb } from "tronweb";
import { ContractCallArgs, MultiCallArgs, TransactionOption, ContractQuery, ContractQueryTrigger, ContractQueryCallback, SendTransaction, SimpleTransactionResult } from "./types";
import { ContractHelperOptions } from "./types";
import { Provider as EthProvider } from "ethers";
export declare class ContractHelper<Provider extends TronWeb | EthProvider> {
    private helper;
    private pendingQueries;
    private debounceExecuteLazyCalls;
    private multicallMaxPendingLength;
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
    constructor(options: ContractHelperOptions<Provider>);
    /**
     * @deprecated use call instead.
     */
    getContractValue<T>(contractCallArgs: ContractCallArgs<Provider>): Promise<T>;
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
    call<T>(contractCallArgs: ContractCallArgs<Provider>): Promise<T>;
    /**
     *@deprecated use multicall instead.
     */
    getMultiContractValues<T>(multicallArgs: MultiCallArgs<Provider>[]): Promise<unknown>;
    /**
     * Use Multicall v2 to query with multiple arguments
     */
    multicall<T>(multicallArgs: MultiCallArgs<Provider>[]): Promise<T>;
    /**
     * Sign the transaction and send it to the network.
     * @param from signer address
     * @param sendTransaction sign transaction function.
     * @param contractCall contract call arguments.
     * @param options execute callback.
     */
    send(from: string, sendTransaction: SendTransaction<Provider>, contractCall: ContractCallArgs<Provider>): Promise<string>;
    checkTransactionResult(txID: string, options?: TransactionOption): Promise<SimpleTransactionResult>;
    /**
     * Return the pending call length.
     */
    get lazyCallsLength(): number;
    /**
     * @deprecated use pendingCallLength instead.
     */
    get pendingQueriesLength(): number;
    /**
     * Insert a contract call to the pending call queue, and wait for the pending calls to be executed in a multicall request.
     */
    lazyCall<T>(query: ContractCallArgs<Provider>): Promise<T>;
    /**
     * @deprecated use lazyCall instead.
     */
    queryByBundle<T>(query: ContractCallArgs<Provider>): Promise<unknown>;
    /**
     * Insert a contract call to the pending call queue.
     */
    addLazyCall<T = any>(query: ContractQuery<Provider, T>, trigger?: ContractQueryTrigger): void;
    /**
     * @deprecated use addLazyCall instead.
     */
    addPendingQuery<T = any>(query: ContractQuery<Provider, T>, trigger?: ContractQueryTrigger): void;
    /**
     * Execute the pending call queue.
     */
    executeLazyCalls<T>(callback?: ContractQueryCallback<T>): Promise<T>;
    /**
     * @deprecated use executeLazyCalls instead.
     */
    executePendingQueries<T>(callback?: ContractQueryCallback<T>): Promise<T>;
}
export default ContractHelper;
//# sourceMappingURL=contract-helper.d.ts.map