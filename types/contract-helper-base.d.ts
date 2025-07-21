import { AggregateCall, AggregateContractResponse, ContractCallArgs, MultiCallArgs as MultiCallArgs, SimpleTransactionResult, TransactionOption, SendTransaction, ChainType, ContractSendArgs } from "./types";
export interface Contract {
    multicall(calls: AggregateCall[]): AggregateContractResponse;
}
export declare abstract class ContractHelperBase<Chain extends ChainType> {
    protected multicallAddress: string;
    /**
     * @param multicallAddress MulticallV2 contract address
     */
    constructor(multicallAddress: string);
    abstract call<T>(contractOption: ContractCallArgs): Promise<T>;
    abstract multicall<T>(calls: MultiCallArgs[]): Promise<T>;
    abstract send(from: string, sendFn: SendTransaction<Chain>, args: ContractSendArgs<Chain>): Promise<string>;
    abstract fastCheckTransactionResult(txID: string): Promise<SimpleTransactionResult>;
    abstract finalCheckTransactionResult(txID: string): Promise<SimpleTransactionResult>;
    checkTransactionResult(txID: string, options?: TransactionOption): Promise<SimpleTransactionResult>;
}
//# sourceMappingURL=contract-helper-base.d.ts.map