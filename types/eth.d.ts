import { ContractCallArgs, MultiCallArgs, SimpleTransactionResult } from "./types";
import { ContractHelperBase } from "./contract-helper-base";
import { Provider, TransactionRequest, TransactionResponse } from "ethers";
export declare class EthContractHelper extends ContractHelperBase {
    private provider;
    constructor(multicallContractAddress: string, provider: Provider);
    private buildAggregateCall;
    private buildUpAggregateResponse;
    private formatValue;
    private handleContractValue;
    /**
     * Execute the multicall contract call
     * @param calls The calls
     */
    multicall<T>(calls: MultiCallArgs[]): Promise<T>;
    call<T>(contractCallArgs: ContractCallArgs): Promise<T>;
    send(from: string, sendTransaction: {
        (tx: TransactionRequest): Promise<TransactionResponse>;
    }, contractOption: ContractCallArgs): Promise<string>;
    private checkReceipt;
    finalCheckTransactionResult(txID: string): Promise<SimpleTransactionResult>;
    fastCheckTransactionResult(txID: string): Promise<string>;
}
//# sourceMappingURL=eth.d.ts.map