import { ContractCallArgs, ContractSendArgs, EthFormatValue, EvmRunner, MultiCallArgs, SendTransaction, SimpleTransactionResult } from "./types";
import { ContractHelperBase } from "./contract-helper-base";
export declare class EthContractHelper extends ContractHelperBase<"evm"> {
    private runner;
    private simulate;
    private formatValueType;
    constructor(multicallContractAddress: string, runner: EvmRunner, simulate: boolean, formatValue: EthFormatValue);
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
    send(from: string, sendTransaction: SendTransaction<"evm">, contractOption: ContractSendArgs<"evm">): Promise<string>;
    private checkReceipt;
    finalCheckTransactionResult(txId: string): Promise<SimpleTransactionResult>;
    fastCheckTransactionResult(txId: string): Promise<{
        txId: string;
    }>;
}
//# sourceMappingURL=eth.d.ts.map