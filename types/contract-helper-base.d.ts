import { AggregateCall, AggregateContractResponse, ContractCallArgs, MultiCallArgs as MultiCallArgs, SimpleTransactionResult, TransactionOption, SignTransaction } from "./types";
export interface Contract {
    multicall(calls: AggregateCall[]): AggregateContractResponse;
}
export declare abstract class ContractHelperBase {
    protected multicallAddress: string;
    /**
     * @param multicallAddress MulticallV2 contract address
     */
    constructor(multicallAddress: string);
    /**
     * @param calls
     */
    abstract multicall<T>(calls: MultiCallArgs[]): Promise<T>;
    abstract call<T>(contractOption: ContractCallArgs): Promise<T>;
    abstract send(from: string, signTransaction: SignTransaction, contractOption: ContractCallArgs): Promise<string>;
    abstract fastCheckTransactionResult(txID: string): Promise<string>;
    abstract finalCheckTransactionResult(txID: string): Promise<SimpleTransactionResult>;
    checkTransactionResult(txID: string, options?: TransactionOption): Promise<string | SimpleTransactionResult>;
}
//# sourceMappingURL=contract-helper-base.d.ts.map