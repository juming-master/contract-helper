import { ContractCallArgs, EthProvider, MultiCallArgs, SendTransaction, SimpleTransactionResult, TronProvider, TrxFormatValue } from "./types";
import { ContractParamter, SignedTransaction } from "tronweb/lib/esm/types";
import { ContractHelperBase } from "./contract-helper-base";
export declare class TronContractHelper<Provider extends TronProvider | EthProvider> extends ContractHelperBase<Provider> {
    private provider;
    private formatValueType;
    constructor(multicallContractAddress: string, provider: TronProvider, formatValue: TrxFormatValue);
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
    multicall<T>(calls: MultiCallArgs<Provider>[]): Promise<T>;
    call<T>(contractCallArgs: ContractCallArgs<Provider>): Promise<T>;
    static broadcastTransaction(provider: TronProvider, signedTransaction: SignedTransaction<ContractParamter>): Promise<string>;
    send(from: string, sendTransaction: SendTransaction<Provider>, contractOption: ContractCallArgs<Provider>): Promise<string>;
    fastCheckTransactionResult(txId: string): any;
    finalCheckTransactionResult(txId: string): Promise<SimpleTransactionResult>;
}
//# sourceMappingURL=tron.d.ts.map