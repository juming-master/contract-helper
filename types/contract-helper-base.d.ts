import { AggregateCall, AggregateContractResponse, ContractCallArgs, MultiCallArgs as MultiCallArgs, SimpleTransactionResult, TransactionOption, SendTransaction } from "./types";
import { TronWeb } from "tronweb";
import { Provider as EthProvider } from "ethers";
export interface Contract {
    multicall(calls: AggregateCall[]): AggregateContractResponse;
}
export declare abstract class ContractHelperBase<Provider extends TronWeb | EthProvider> {
    protected multicallAddress: string;
    /**
     * @param multicallAddress MulticallV2 contract address
     */
    constructor(multicallAddress: string);
    /**
     * @param calls
     */
    abstract multicall<T>(calls: MultiCallArgs<Provider>[]): Promise<T>;
    abstract call<T>(contractOption: ContractCallArgs<Provider>): Promise<T>;
    abstract send(from: string, signTransaction: SendTransaction<Provider>, contractOption: ContractCallArgs<Provider>): Promise<string>;
    abstract fastCheckTransactionResult(txID: string): Promise<SimpleTransactionResult>;
    abstract finalCheckTransactionResult(txID: string): Promise<SimpleTransactionResult>;
    checkTransactionResult(txID: string, options?: TransactionOption): Promise<SimpleTransactionResult>;
}
//# sourceMappingURL=contract-helper-base.d.ts.map