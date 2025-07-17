import { InterfaceAbi, TransactionLike, Provider as EthProvider } from "ethers";
import { BigNumber, TronWeb } from "tronweb";
import { ContractParamter, TransactionContract, TriggerSmartContractOptions } from "tronweb/lib/esm/types";
import { PromiseCallback } from "./helper";
import { TransactionRequest as EthTransactionRequest } from "ethers";
import { Transaction as TronTransactionRequest } from "tronweb/lib/esm/types";
export { TransactionRequest as EthTransactionRequest, TransactionResponse as EthTransactionResponse, Provider as EthProvider, } from "ethers";
export { Transaction as TronTransactionRequest, SignedTransaction as TronTransactionResponse, } from "tronweb/lib/esm/types";
export type TronContractCallOptions = TriggerSmartContractOptions;
export type EthContractCallOptions = Omit<TransactionLike, "to" | "from" | "nonce" | "data" | "chainId" | "type">;
export interface ContractCallArgs<Provider extends TronWeb | EthProvider> {
    address: string;
    abi?: InterfaceAbi;
    method: string;
    parameters?: Array<any>;
    options?: Provider extends TronWeb ? TronContractCallOptions : EthContractCallOptions;
}
export type MultiCallArgs<Provider extends TronWeb | EthProvider> = Omit<ContractCallArgs<Provider>, "options"> & {
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
export interface EthSendTransaction {
    (tx: EthTransactionRequest, provider: EthProvider): Promise<string>;
}
export interface TronSendTransaction {
    (tx: TronTransactionRequest, provider: TronWeb): Promise<string>;
}
export type SendTransaction<Provider extends TronWeb | EthProvider> = Provider extends TronWeb ? TronSendTransaction : EthSendTransaction;
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
    txId: string;
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
    success: (value: T) => Promise<any> | void;
    error?: (error: any) => void;
}
export interface ContractQuery<Provider extends TronWeb | EthProvider, T = any> {
    query: MultiCallArgs<Provider>;
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
export type ContractHelperOptions<Provider extends TronWeb | EthProvider> = {
    provider: Provider;
    multicallV2Address: string;
    multicallLazyQueryTimeout?: number;
    multicallMaxLazyCallsLength?: number;
    simulateBeforeSend?: boolean;
    formatValue?: Provider extends TronWeb ? TrxFormatValue : EthFormatValue;
};
//# sourceMappingURL=types.d.ts.map