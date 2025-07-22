import { InterfaceAbi, TransactionLike, Provider as EvmProvider, ContractRunner as EvmRunner } from "ethers";
import { TronWeb as TronProvider } from "tronweb";
import BigNumber from "bignumber.js";
import { ContractParamter, TransactionContract, TriggerSmartContractOptions } from "tronweb/lib/esm/types";
import { PromiseCallback } from "./helper";
import { TransactionRequest as EvmTransactionRequest } from "ethers";
import { Transaction as TronTransactionRequest } from "tronweb/lib/esm/types";
import { TransactionReceiptError } from "./errors";
export { TransactionRequest as EvmTransactionRequest, TransactionResponse as EvmTransactionResponse, ContractRunner as EvmRunner, Provider as EvmProvider, Signer as EvmSigner, } from "ethers";
export { Transaction as TronTransactionRequest, SignedTransaction as TronTransactionResponse, } from "tronweb/lib/esm/types";
export { TronWeb as TronProvider } from "tronweb";
export { TronWeb as TronSigner } from "tronweb";
export type TronContractCallOptions = TriggerSmartContractOptions;
export type EvmContractCallOptions = Omit<TransactionLike, "to" | "from" | "nonce" | "data" | "chainId" | "type">;
export type ChainType = "tron" | "evm";
export interface ContractCallArgs {
    address: string;
    abi?: InterfaceAbi;
    method: string;
    args?: Array<any>;
}
export type MultiCallArgs = Omit<ContractCallArgs, "options"> & {
    key: string;
};
export interface ContractSendArgs<Chain extends ChainType> extends ContractCallArgs {
    options?: Chain extends "tron" ? TronContractCallOptions : EvmContractCallOptions;
}
export interface Call {
    /**
     * your contract method name
     */
    methodName: string;
    /**
     * Method parameters you want it to pass in
     */
    methodParameters: any[];
}
export interface ContractCall<TContext = any> {
    /**
     * Reference to this contract call context
     */
    key: string;
    /**
     * The contract address
     */
    address: string;
    /**
     * The abi for the contract
     */
    abi: InterfaceAbi;
    /**
     * All the calls you want to do for this contract
     */
    call: Call;
    /**
     * Store any context or state in here so you don't need
     * to look back over arrays once you got the result back.
     */
    context?: TContext | undefined;
}
export interface CallReturnContext extends Call {
    returnValue: any;
    /**
     * This stats if it could decode the result or not
     */
    decoded: boolean;
    /**
     * If this context was successful, this will always be try
     * if you dont use the try aggregate logic
     */
    success: boolean;
}
export interface ContractCallResults {
    results: {
        [key: string]: ContractCallReturnContext;
    };
    blockNumber: BigNumber;
}
export interface ContractCallReturnContext {
    originalContractCallContext: ContractCall;
    callReturnContext: CallReturnContext;
}
export interface AggregateCall {
    contractCallIndex: number;
    target: string;
    encodedData: string;
}
export interface AggregateContractResponse {
    blockNumber: BigNumber;
    returnData: string[];
}
export interface AggregateResponse {
    blockNumber: BigNumber;
    results: Array<{
        contractCallIndex: number;
        methodResult: any;
    }>;
}
export interface SendTransaction<Chain extends ChainType> {
    (tx: Chain extends "tron" ? TronTransactionRequest : EvmTransactionRequest, provider: Chain extends "tron" ? TronProvider : EvmProvider, chain: Chain): Promise<string>;
}
export type EvmSendTransaction = SendTransaction<"evm">;
export type TronSendTransaction = SendTransaction<"tron">;
export declare const CONTRACT_SUCCESS = "SUCCESS";
export interface FastTransactionResult<T = ContractParamter> {
    txID: string;
    signature: string[];
    ret?: {
        contractRet: string;
    }[];
    raw_data: {
        contract: TransactionContract<T>[];
        ref_block_bytes: string;
        ref_block_hash: string;
        expiration: number;
        timestamp: number;
        data?: unknown;
        fee_limit?: unknown;
    };
    raw_data_hex: string;
}
export interface SimpleTransactionResult {
    blockNumber?: BigInt;
    txId: string;
}
export declare enum CheckTransactionType {
    Fast = "fast",
    Final = "final"
}
export type TransactionOption = {
    check?: CheckTransactionType;
    success?: (transactionInfo: SimpleTransactionResult) => void;
    error?: (error: TransactionReceiptError) => void;
};
export interface ContractCallback<T> {
    success: (value: T) => Promise<any> | void;
    error?: (error: any) => void;
}
export interface ContractQuery<T = any> {
    query: MultiCallArgs;
    callback?: ContractCallback<T>;
}
export type ContractQueryCallback<T = any> = PromiseCallback<T>;
export type ContractQueryTrigger<T = any> = ContractQueryCallback<T> | boolean;
export interface TrxFormatValue {
    address?: "base58" | "checksum" | "hex";
    uint?: "bigint" | "bignumber";
}
export interface EthFormatValue {
    address?: "checksum" | "hex";
    uint?: "bigint" | "bignumber";
}
export type ContractHelperOptions<Chain extends ChainType> = {
    chain: Chain;
    provider: Chain extends "tron" ? TronProvider : EvmRunner;
    multicallV2Address: string;
    multicallLazyQueryTimeout?: number;
    multicallMaxLazyCallsLength?: number;
    simulateBeforeSend?: boolean;
    formatValue?: Chain extends "tron" ? TrxFormatValue : EthFormatValue;
};
//# sourceMappingURL=types.d.ts.map