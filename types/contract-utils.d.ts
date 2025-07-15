import { BytesLike, FunctionFragment, InterfaceAbi } from "ethers";
import { AggregateCall, AggregateContractResponse, ContractCall, ContractCallArgs, MultiCallArgs } from "./types";
/**
 * Convert a Tron hex address or base58 address to a base58 address.
 */
export declare function formatBase58Address(address: string): string;
/**
 * Convert a Tron hex address or base58 address or eth address to a formatted hex address.
 */
export declare const formatToEthAddress: (address: string) => string;
export declare function transformContractCallArgs(contractCallArgs: ContractCallArgs): {
    abi: InterfaceAbi;
    method: {
        selector: string;
        signature: string;
        fragment: FunctionFragment;
        name: string;
    };
    address: string;
    parameters?: Array<any>;
    options?: {
        trx?: import("tronweb/lib/esm/types").TriggerSmartContractOptions;
        eth?: Omit<import("ethers").TransactionLike, "to" | "from" | "nonce" | "data" | "chainId" | "type">;
    };
};
export declare function findFragmentFromAbi<T>(contractCallContext: ContractCall<T>): FunctionFragment | null;
/**
 * Build aggregate call context
 * @param multiCallArgs The contract call contexts
 */
export declare function buildAggregateCall(multiCallArgs: MultiCallArgs[], encodeFunctionData: {
    (fragment: FunctionFragment, values: any[]): string;
}): AggregateCall[];
export declare function buildUpAggregateResponse<T>(multiCallArgs: MultiCallArgs[], response: AggregateContractResponse, decodeFunctionData: {
    (fragment: FunctionFragment, data: BytesLike): any[];
}, handleContractValue: {
    <T>(value: any, functionFragment: FunctionFragment): T;
}): T;
//# sourceMappingURL=contract-utils.d.ts.map