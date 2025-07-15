import { ContractCallArgs, MultiCallArgs, TransactionOption, ContractQuery, ContractQueryTrigger, ContractQueryCallback, SignTransaction } from "./types";
import { ContractHelperOptions } from "./types";
export declare class ContractHelper {
    private helper;
    private pendingQueries;
    private lazyExec;
    private multicallMaxPendingLength;
    /**
     * @param options {
     *  provider: TronWeb | Provider(ethers.js);
     *  multicallV2Address: multicallv2 address;
     *  multicallLazyQueryTimeout?: maximum wait time for executing the pending call queue.
     *  multicallMaxPendingLength?: maximum length for the pending call queue.
     * }
     */
    constructor(options: ContractHelperOptions);
    /**
     * @deprecated use call instead.
     */
    getContractValue<T>(contractCallArgs: ContractCallArgs): Promise<T>;
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
    call<T>(contractCallArgs: ContractCallArgs): Promise<T>;
    /**
     *@deprecated use multicall instead.
     */
    getMultiContractValues<T>(multicallArgs: MultiCallArgs[]): Promise<unknown>;
    /**
     * Use Multicall v2 to query with multiple arguments
     */
    multicall<T>(multicallArgs: MultiCallArgs[]): Promise<T>;
    /**
     * Sign the transaction and send it to the network.
     * @param from signer address
     * @param signTransaction sign transaction function.
     * @param contractCall contract call arguments.
     * @param options execute callback.
     */
    send(from: string, signTransaction: SignTransaction, contractCall: ContractCallArgs, options?: TransactionOption): Promise<string | import("./types").SimpleTransactionResult>;
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
    lazyCall<T>(query: ContractCallArgs): Promise<T>;
    /**
     * @deprecated use lazyCall instead.
     */
    queryByBundle<T>(query: ContractCallArgs): Promise<unknown>;
    /**
     * Insert a contract call to the pending call queue.
     */
    addLazyCall<T = any>(query: ContractQuery<T>, trigger?: ContractQueryTrigger): Promise<T>;
    /**
     * @deprecated use addLazyCall instead.
     */
    addPendingQuery<T = any>(query: ContractQuery<T>, trigger?: ContractQueryTrigger): Promise<T>;
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