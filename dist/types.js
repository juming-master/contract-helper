"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionError = exports.CONTRACT_SUCCESS = exports.TronResultError = void 0;
class TronResultError extends Error {
    constructor(message) {
        super(message);
        this.code = 0;
        this.error = "";
        this.transaction = "";
        this.output = null;
    }
}
exports.TronResultError = TronResultError;
exports.CONTRACT_SUCCESS = "SUCCESS";
class TransactionError extends Error {
    constructor(message, transactionInfo) {
        super(message);
        this.transactionInfo = transactionInfo;
    }
}
exports.TransactionError = TransactionError;
//# sourceMappingURL=types.js.map