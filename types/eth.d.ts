import { ContractCallArgs, EthFormatValue, EthProvider, MultiCallArgs, SendTransaction, SimpleTransactionResult, TronProvider } from "./types";
import { ContractHelperBase } from "./contract-helper-base";
export declare class EthContractHelper<Provider extends TronProvider | EthProvider> extends ContractHelperBase<Provider> {
    private provider;
    private simulate;
    private formatValueType;
    constructor(multicallContractAddress: string, provider: EthProvider, simulate: boolean, formatValue: EthFormatValue);
    private buildAggregateCall;
    private buildUpAggregateResponse;
    private formatValue;
    private handleContractValue;
    /**
     * Execute the multicall contract call
     * @param calls The calls
     */
    multicall<T>(calls: MultiCallArgs<Provider>[]): Promise<T>;
    call<T>(contractCallArgs: ContractCallArgs<Provider>): Promise<T>;
    send(from: string, sendTransaction: SendTransaction<Provider>, contractOption: ContractCallArgs<Provider>): Promise<string>;
    private checkReceipt;
    finalCheckTransactionResult(txId: string): Promise<SimpleTransactionResult>;
    fastCheckTransactionResult(txId: string): Promise<{
        txId: string;
    }>;
}
//# sourceMappingURL=eth.d.ts.map