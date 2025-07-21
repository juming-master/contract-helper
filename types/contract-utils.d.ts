import { BytesLike, FunctionFragment } from "ethers";
import { AggregateCall, AggregateContractResponse, ChainType, ContractCall, ContractSendArgs, MultiCallArgs } from "./types";
/**
 * Convert a Tron hex address or base58 address to a base58 address.
 */
export declare function formatBase58Address(address: string): string;
/**
 * Convert a Tron hex address or base58 address to a hex address.
 */
export declare const formatHexAddress: (address: string) => string;
/**
 * Convert a Tron hex address or base58 address or eth address to a formatted hex address.
 */
export declare const formatToEthAddress: (address: string) => string;
export declare function transformContractCallArgs<Chain extends ChainType>(contractCallArgs: ContractSendArgs<Chain>, network: ChainType): {
    abi: any;
    method: {
        abi: any;
        selector: string;
        signature: string;
        fragment: FunctionFragment;
        name: string;
    };
    address: string;
    options?: (Chain extends "tron" ? import("tronweb/lib/esm/types").TriggerSmartContractOptions : import("./types").EvmContractCallOptions) | undefined;
    args?: Array<any>;
};
export declare function findFragmentFromAbi<T>(contractCallContext: ContractCall<T>): FunctionFragment | null;
/**
 * Build aggregate call context
 * @param multiCallArgs The contract call contexts
 */
export declare function buildAggregateCall(multiCallArgs: MultiCallArgs[], encodeFunctionData: {
    (fragment: FunctionFragment, values: any[]): string;
}, network: ChainType): AggregateCall[];
export declare function buildUpAggregateResponse<T>(multiCallArgs: MultiCallArgs[], response: AggregateContractResponse, decodeFunctionData: {
    (fragment: FunctionFragment, data: BytesLike): any[];
}, handleContractValue: {
    <T>(value: any, functionFragment: FunctionFragment): T;
}, network: ChainType): T;
//# sourceMappingURL=contract-utils.d.ts.map