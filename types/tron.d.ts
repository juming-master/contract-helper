import { ContractCallArgs, ContractSendArgs, MultiCallArgs, SendTransaction, SimpleTransactionResult, TronProvider, TronFormatValue, TronTransactionRequest, SetTronFee, SendOptions } from "./types";
import { ContractParamter, SignedTransaction } from "tronweb/lib/esm/types";
import { ContractHelperBase } from "./contract-helper-base";
export declare class TronContractHelper extends ContractHelperBase<"tron"> {
    private provider;
    private formatValueType;
    private feeCalculation?;
    constructor(multicallContractAddress: string, provider: TronProvider, formatValue: TronFormatValue, feeCalculation?: SetTronFee);
    private formatToEthAddress;
    /**
     * Map call contract to match contract format
     * @param calls The calls context
     */
    private mapCallContextToMatchContractFormat;
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
    static broadcastTransaction(provider: TronProvider, signedTransaction: SignedTransaction<ContractParamter>): Promise<string>;
    private getFeeParams;
    createTransaction(from: string, contractOption: ContractSendArgs<"tron">, sendOptions?: SendOptions): Promise<TronTransactionRequest<ContractParamter>>;
    sendTransaction(transaction: TronTransactionRequest<ContractParamter>, sendTransaction: SendTransaction<"tron">, options?: SendOptions): Promise<string>;
    send(from: string, sendTransaction: SendTransaction<"tron">, contractOption: ContractSendArgs<"tron">, options?: SendOptions): Promise<string>;
    fastCheckTransactionResult(txId: string): any;
    finalCheckTransactionResult(txId: string): Promise<SimpleTransactionResult>;
}
//# sourceMappingURL=tron.d.ts.map