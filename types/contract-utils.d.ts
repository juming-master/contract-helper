import { TronWeb } from "tronweb";
import { BytesLike, FunctionFragment } from "ethers";
import { AggregateCall, AggregateContractResponse, ContractCall, ContractCallArgs, EthProvider, MultiCallArgs, TronProvider } from "./types";
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
export declare function transformContractCallArgs<Provider extends TronProvider | EthProvider>(contractCallArgs: ContractCallArgs<Provider>, network: "tron" | "eth"): {
    abi: any;
    method: {
        abi: any;
        selector: string;
        signature: string;
        fragment: FunctionFragment;
        name: string;
    };
    address: string;
    parameters?: Array<any>;
    options?: (Provider extends TronWeb ? import("tronweb/lib/esm/types").TriggerSmartContractOptions : import("./types").EthContractCallOptions) | undefined;
};
export declare function findFragmentFromAbi<T>(contractCallContext: ContractCall<T>): FunctionFragment | null;
/**
 * Build aggregate call context
 * @param multiCallArgs The contract call contexts
 */
export declare function buildAggregateCall<Provider extends TronWeb | EthProvider>(multiCallArgs: MultiCallArgs<Provider>[], encodeFunctionData: {
    (fragment: FunctionFragment, values: any[]): string;
}, network: "tron" | "eth"): AggregateCall[];
export declare function buildUpAggregateResponse<Provider extends TronWeb | EthProvider, T>(multiCallArgs: MultiCallArgs<Provider>[], response: AggregateContractResponse, decodeFunctionData: {
    (fragment: FunctionFragment, data: BytesLike): any[];
}, handleContractValue: {
    <T>(value: any, functionFragment: FunctionFragment): T;
}, network: "tron" | "eth"): T;
//# sourceMappingURL=contract-utils.d.ts.map