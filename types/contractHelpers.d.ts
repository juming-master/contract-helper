import { TronWeb } from "tronweb";
import { FunctionFragment, Interface } from "ethers";
import { ContractOption, FastTransactionResult, TransactionOption } from "./types";
import { SignedTransaction, TransactionInfo } from "tronweb/lib/esm/types";
export declare function formatBase58Address(address: string): string;
export declare const formatHexAddress: (address: string) => string;
export declare const formatToEthAddress: (address: string) => string;
export declare function transformContractOptions(contractOption: ContractOption): {
    abi: import("ethers").InterfaceAbi;
    method: string;
    address: string;
    parameters?: Array<any>;
    methodOverrides?: import("tronweb/lib/esm/types").TriggerSmartContractOptions;
};
export declare function getInterfaceAndFragments(contractOption: ContractOption): {
    functionFragment: FunctionFragment;
    iface: Interface;
};
export declare function handleValue(value: any, type: string): any;
export declare function handleContractValue<T>(value: any, functionFragment: FunctionFragment): any;
export declare const slowCheck: (provider: TronWeb, txID: string) => Promise<TransactionInfo>;
export declare const fastCheck: (provider: TronWeb, txID: string) => Promise<FastTransactionResult>;
export declare const trackTransaction: (signedTransaction: SignedTransaction, provider: TronWeb, options?: TransactionOption) => Promise<TransactionInfo | FastTransactionResult<import("tronweb/lib/esm/types").ContractParamter>>;
//# sourceMappingURL=contractHelpers.d.ts.map