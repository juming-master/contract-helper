"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionReceiptError = exports.BroadcastTronTransactionError = exports.ABIFunctionNotProvidedError = exports.ContractMethodNotProvidedError = exports.ContractAddressNotProvidedError = void 0;
class ContractAddressNotProvidedError extends Error {
    constructor() {
        super(`Contract address is not provided.`);
    }
}
exports.ContractAddressNotProvidedError = ContractAddressNotProvidedError;
class ContractMethodNotProvidedError extends Error {
    constructor() {
        super(`Contract method is not provided.`);
    }
}
exports.ContractMethodNotProvidedError = ContractMethodNotProvidedError;
class ABIFunctionNotProvidedError extends Error {
    constructor(contractCall) {
        super(`ABI function is not found for method ${contractCall.method} in ${contractCall.address}, abi or full method signature is needed.`);
    }
}
exports.ABIFunctionNotProvidedError = ABIFunctionNotProvidedError;
class BroadcastTronTransactionError extends Error {
    code = 0;
    error = "";
    transaction = "";
    output = null;
    constructor(message) {
        super(message);
    }
}
exports.BroadcastTronTransactionError = BroadcastTronTransactionError;
class TransactionReceiptError extends Error {
    transactionInfo;
    constructor(message, transactionInfo) {
        super(message);
        this.transactionInfo = transactionInfo;
    }
}
exports.TransactionReceiptError = TransactionReceiptError;
//# sourceMappingURL=errors.js.map