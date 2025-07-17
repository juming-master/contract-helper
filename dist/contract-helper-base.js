"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractHelperBase = void 0;
const helper_1 = require("./helper");
const types_1 = require("./types");
class ContractHelperBase {
    multicallAddress;
    /**
     * @param multicallAddress MulticallV2 contract address
     */
    constructor(multicallAddress) {
        this.multicallAddress = multicallAddress;
    }
    async checkTransactionResult(txID, options = {}) {
        const checkOption = options.check ?? types_1.CheckTransactionType.Fast;
        if (checkOption === types_1.CheckTransactionType.Final) {
            return await this.fastCheckTransactionResult(txID)
                .then((transaction) => {
                (0, helper_1.runPromiseWithCallback)(this.finalCheckTransactionResult(txID), options);
                return transaction;
            })
                .catch((error) => {
                (0, helper_1.runPromiseWithCallback)(Promise.reject(error), options);
                throw error;
            });
        }
        return await this.finalCheckTransactionResult(txID)
            .then((transaction) => {
            (0, helper_1.runPromiseWithCallback)(Promise.resolve(transaction), options);
            return transaction;
        })
            .catch((error) => {
            (0, helper_1.runPromiseWithCallback)(Promise.reject(error), options);
            throw error;
        });
    }
}
exports.ContractHelperBase = ContractHelperBase;
//# sourceMappingURL=contract-helper-base.js.map