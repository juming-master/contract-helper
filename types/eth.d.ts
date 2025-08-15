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
    /**
     * Calculate the next block's baseFee according to EIP-1559 formula.
     *
     * @param parentBaseFee Base fee of the parent block (wei)
     * @param gasUsed Gas used in the parent block
     * @param gasTarget Target gas (half of block gas limit)
     * @returns Predicted baseFeePerGas for the next block (wei)
     */
    private calcNextBaseFee;
    /**
     * Get gas parameters for a "fast confirmation" EIP-1559 transaction
     * with next-block baseFee prediction.
     *
     * @param provider ethers.js Provider instance
     * @param blocksToCheck Number of historical blocks to sample for priority fee
     * @param priorityFeeExtraGwei Extra tip to add on top of historical max priority fee (gwei)
     * @returns Gas params: baseFee, predictedBaseFee, maxPriorityFeePerGas, maxFeePerGas
     */
    getFastGasParamsWithPrediction(blocksToCheck?: number, priorityFeeExtraGwei?: number): Promise<{
        baseFee: bigint;
        maxPriorityFeePerGas: bigint;
        maxFeePerGas: bigint;
    }>;
    private getGasParams;
    send(from: string, sendTransaction: SendTransaction<"evm">, contractOption: ContractSendArgs<"evm">): Promise<string>;
    private checkReceipt;
    finalCheckTransactionResult(txId: string): Promise<SimpleTransactionResult>;
    fastCheckTransactionResult(txId: string): Promise<{
        txId: string;
    }>;
}
//# sourceMappingURL=eth.d.ts.map