import { InterfaceAbi } from "ethers";
import { TronWeb } from "tronweb";
import { ContractParamter, SignedTransaction, Transaction, TransactionContract, TransactionInfo, TriggerSmartContractOptions } from "tronweb/lib/esm/types";
import { PromiseCallback } from "./helper";
export interface ContractOption {
    address: string;
    abi?: InterfaceAbi;
    method: string;
    parameters?: Array<any>;
    methodOverrides?: TriggerSmartContractOptions;
}
export type MultiCallContractOption = Omit<ContractOption, "methodOverrides"> & {
    key: string;
};
export interface MulticallOption {
    provider: TronWeb;
    contractAddress: string;
}
export interface CallContext {
    /**
     * your contract method name
     */
    methodName: string;
    /**
     * Method parameters you want it to pass in
     */
    methodParameters: any[];
}
export interface ContractCallContext<TContext = any> {
    /**
     * Reference to this contract call context
     */
    key: string;
    /**
     * The contract address
     */
    contractAddress: string;
    /**
     * The abi for the contract
     */
    abi: InterfaceAbi;
    /**
     * All the calls you want to do for this contract
     */
    call: CallContext;
    /**
     * Store any context or state in here so you don't need
     * to look back over arrays once you got the result back.
     */
    context?: TContext | undefined;
}
export interface CallReturnContext extends CallContext {
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
    blockNumber: number;
}
export interface ContractCallReturnContext {
    originalContractCallContext: ContractCallContext;
    callReturnContext: CallReturnContext;
}
export interface AggregateCallContext {
    contractContextIndex: number;
    target: string;
    encodedData: string;
}
export interface AggregateContractResponse {
    blockNumber: BigInt;
    returnData: string[];
}
export interface AggregateResponse {
    blockNumber: number;
    results: Array<{
        contractContextIndex: number;
        methodResult: any;
    }>;
}
export declare class TronResultError extends Error {
    code: number;
    error: string;
    transaction: string;
    output: TransactionInfo | null;
    constructor(message: string);
}
export interface SignTransaction {
    (transaction: Transaction, privateKey?: string): Promise<SignedTransaction>;
}
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
    blockNumber?: number;
    id: string;
}
export declare class TransactionError extends Error {
    transactionInfo: SimpleTransactionResult;
    constructor(message: string, transactionInfo: SimpleTransactionResult);
}
export type TransactionOption = {
    check?: "fast" | "slow";
    success?: (transactionInfo: SimpleTransactionResult) => void;
    error?: (error: any) => void;
};
export interface ContractCallback<T> {
    (value: T): Promise<void> | void;
}
export interface ContractQuery<T = any> {
    query: MultiCallContractOption;
    callback?: ContractCallback<T>;
}
export type ContractQueryCallback<T = any> = PromiseCallback<T>;
export type ContractQueryTrigger<T = any> = ContractQueryCallback<T> | boolean;
//# sourceMappingURL=types.d.ts.map