"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckTransactionType = exports.CONTRACT_SUCCESS = exports.TronSigner = exports.TronProvider = exports.EvmTransactionResponse = void 0;
var ethers_1 = require("ethers");
Object.defineProperty(exports, "EvmTransactionResponse", { enumerable: true, get: function () { return ethers_1.TransactionResponse; } });
var tronweb_1 = require("tronweb");
Object.defineProperty(exports, "TronProvider", { enumerable: true, get: function () { return tronweb_1.TronWeb; } });
var tronweb_2 = require("tronweb");
Object.defineProperty(exports, "TronSigner", { enumerable: true, get: function () { return tronweb_2.TronWeb; } });
exports.CONTRACT_SUCCESS = "SUCCESS";
var CheckTransactionType;
(function (CheckTransactionType) {
    CheckTransactionType["Fast"] = "fast";
    CheckTransactionType["Final"] = "final";
})(CheckTransactionType || (exports.CheckTransactionType = CheckTransactionType = {}));
//# sourceMappingURL=types.js.map