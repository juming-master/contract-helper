import { TronWeb } from "tronweb";
import { ContractCallArgs, MultiCallArgs, SimpleTransactionResult } from "./types";
import { SignedTransaction, Transaction } from "tronweb/lib/esm/types";
import { ContractHelperBase } from "./contract-helper-base";
export declare class TronContractHelper extends ContractHelperBase {
    private provider;
    constructor(multicallContractAddress: string, provider: TronWeb);
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
    private broadcastTransaction;
    send(from: string, signTransaction: {
        (tx: Transaction): Promise<SignedTransaction>;
    }, contractOption: ContractCallArgs): Promise<string>;
    fastCheckTransactionResult(txID: string): Promise<string>;
    finalCheckTransactionResult(txID: string): Promise<SimpleTransactionResult>;
}
//# sourceMappingURL=tron.d.ts.map