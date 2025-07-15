import { InterfaceAbi, TransactionLike, Provider } from "ethers";
import { BigNumber, TronWeb } from "tronweb";
import { ContractParamter, TransactionContract, TriggerSmartContractOptions } from "tronweb/lib/esm/types";
import { PromiseCallback } from "./helper";
import { TransactionRequest as EthTransactionRequest, TransactionResponse as EthTransactionResponse } from "ethers";
import { SignedTransaction as TronTransactionResponse, Transaction as TronTransactionRequest } from "tronweb/lib/esm/types";
export { TransactionRequest as EthTransactionRequest, TransactionResponse as EthTransactionResponse, } from "ethers";
export { Transaction as TronTransactionRequest, SignedTransaction as TronTransactionResponse, } from "tronweb/lib/esm/types";
export interface ContractCallArgs {
    address: string;
    abi?: InterfaceAbi;
    method: string;
    parameters?: Array<any>;
    options?: {
        trx?: TriggerSmartContractOptions;
        eth?: Omit<TransactionLike, "to" | "from" | "nonce" | "data" | "chainId" | "type">;
    };
}
export type MultiCallArgs = Omit<ContractCallArgs, "methodOverrides"> & {
    key: string;
};
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
export type SignTransaction = {
    (tx: EthTransactionRequest): Promise<EthTransactionResponse>;
} | {
    (tx: TronTransactionRequest): Promise<TronTransactionResponse>;
};
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
    blockNumber?: BigNumber;
    id: string;
}
export declare enum CheckTransactionType {
    Fast = "fast",
    Final = "final"
}
export type TransactionOption = {
    check?: CheckTransactionType;
    success?: (transactionInfo: SimpleTransactionResult) => void;
    error?: (error: any) => void;
};
export interface ContractCallback<T> {
    (value: T): Promise<void> | void;
}
export interface ContractQuery<T = any> {
    query: MultiCallArgs;
    callback?: ContractCallback<T>;
}
export type ContractQueryCallback<T = any> = PromiseCallback<T>;
export type ContractQueryTrigger<T = any> = ContractQueryCallback<T> | boolean;
export type ContractHelperOptions = {
    provider: TronWeb | Provider;
    multicallV2Address: string;
    multicallLazyQueryTimeout?: number;
    multicallMaxPendingLength?: number;
};
//# sourceMappingURL=types.d.ts.map