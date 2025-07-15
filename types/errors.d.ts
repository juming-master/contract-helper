import { TransactionInfo } from "tronweb/lib/esm/types";
import { SimpleTransactionResult } from "./types";
export declare class ContractAddressNotProvidedError extends Error {
    constructor();
}
export declare class ContractMethodNotProvidedError extends Error {
    constructor();
}
export declare class ABIFunctionNotProvidedError extends Error {
    constructor(contractCall: {
        address: string;
        method: string;
    });
}
export declare class BroadcastTronTransactionError extends Error {
    code: number;
    error: string;
    transaction: string;
    output: TransactionInfo | null;
    constructor(message: string);
}
export declare class TransactionReceiptError extends Error {
    transactionInfo: SimpleTransactionResult;
    constructor(message: string, transactionInfo: SimpleTransactionResult);
}
//# sourceMappingURL=errors.d.ts.map