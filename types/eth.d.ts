import { ContractCallArgs, ContractSendArgs, EvmFormatValue, EvmRunner, MultiCallArgs, SendTransaction, SetEvmFee, SimpleTransactionResult } from "./types";
import { ContractHelperBase } from "./contract-helper-base";
export declare class EthContractHelper extends ContractHelperBase<"evm"> {
    private runner;
    private simulate;
    private formatValueType;
    private feeCalculation?;
    constructor(multicallContractAddress: string, runner: EvmRunner, simulate: boolean, formatValue: EvmFormatValue, feeCalculation: SetEvmFee);
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
    private maxBigInt;
    private getGasParams;
    send(from: string, sendTransaction: SendTransaction<"evm">, contractOption: ContractSendArgs<"evm">): Promise<string>;
    private checkReceipt;
    finalCheckTransactionResult(txId: string): Promise<SimpleTransactionResult>;
    fastCheckTransactionResult(txId: string): Promise<{
        txId: string;
    }>;
}
//# sourceMappingURL=eth.d.ts.map