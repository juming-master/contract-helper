"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckTransactionType = exports.CONTRACT_SUCCESS = exports.EthTransactionResponse = void 0;
var ethers_1 = require("ethers");
Object.defineProperty(exports, "EthTransactionResponse", { enumerable: true, get: function () { return ethers_1.TransactionResponse; } });
exports.CONTRACT_SUCCESS = "SUCCESS";
var CheckTransactionType;
(function (CheckTransactionType) {
    CheckTransactionType["Fast"] = "fast";
    CheckTransactionType["Final"] = "final";
})(CheckTransactionType || (exports.CheckTransactionType = CheckTransactionType = {}));
//# sourceMappingURL=types.js.map