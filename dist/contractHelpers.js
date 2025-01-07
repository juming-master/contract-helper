"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackTransaction = exports.fastCheck = exports.slowCheck = exports.formatToEthAddress = exports.formatHexAddress = void 0;
exports.formatBase58Address = formatBase58Address;
exports.validateContractOptions = validateContractOptions;
exports.getInterfaceAndFragments = getInterfaceAndFragments;
exports.handleValue = handleValue;
exports.handleContractValue = handleContractValue;
const tronweb_1 = require("tronweb");
const ethers_1 = require("ethers");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const types_1 = require("./types");
const wait_1 = __importDefault(require("wait"));
const helper_1 = require("./helper");
function formatBase58Address(address) {
    if (!tronweb_1.TronWeb.isAddress(address)) {
        return address;
    }
    return tronweb_1.TronWeb.address.fromHex(tronweb_1.TronWeb.address.toChecksumAddress(address));
}
const formatHexAddress = function (address) {
    if (!tronweb_1.TronWeb.isAddress(address)) {
        return address;
    }
    return tronweb_1.TronWeb.address.toChecksumAddress(address);
};
exports.formatHexAddress = formatHexAddress;
const formatToEthAddress = function (address) {
    if (tronweb_1.TronWeb.isAddress(address)) {
        return "0x" + (0, exports.formatHexAddress)(address).slice(2).toLowerCase();
    }
    throw new Error(`${address} is invalid address.`);
};
exports.formatToEthAddress = formatToEthAddress;
function validateContractOptions(contractOption) {
    const { address, abi, method } = contractOption;
    if (!address) {
        throw new Error(`No contract address is provided.`);
    }
    if (!abi) {
        throw new Error(`No contract abi is provided.`);
    }
    if (!method) {
        throw new Error(`No contract method is provided.`);
    }
}
function getInterfaceAndFragments(contractOption) {
    const { address, abi, method, parameters = [] } = contractOption;
    const iface = new ethers_1.Interface(abi);
    const functionFragment = iface.getFunction(method);
    if (!functionFragment ||
        functionFragment.inputs.length !== parameters.length) {
        throw new Error(`${address} ${method} is not matched in abi!`);
    }
    return {
        functionFragment,
        iface,
    };
}
function handleValue(value, type) {
    switch (true) {
        case type.endsWith("[]"):
            const itemType = type.slice(0, -2);
            return value.map((el) => handleValue(el, itemType));
        case type.startsWith("uint"):
        case type.startsWith("int"):
            // value is BigInt type.
            return new bignumber_js_1.default(value.toString());
        case type === "address":
            return formatBase58Address(value);
        default:
            return value;
    }
}
function handleContractValue(value, functionFragment) {
    const outputs = functionFragment.outputs;
    if (outputs.length === 1 && !outputs[0].name) {
        return handleValue(value, outputs[0].type);
    }
    const result = {};
    for (let output of outputs) {
        result[output.name] = handleValue(value[output.name], output.type);
    }
    return result;
}
const slowCheck = async function (provider, txID) {
    const output = await provider.trx.getTransactionInfo(txID);
    if (!Object.keys(output).length) {
        await (0, wait_1.default)(3000);
        return (0, exports.slowCheck)(provider, txID);
    }
    if (output.result && output.result === "FAILED") {
        const errMsg = provider.toUtf8(output.resMessage);
        throw new types_1.TransactionError(errMsg, output);
    }
    if (!Object.prototype.hasOwnProperty.call(output, "contractResult")) {
        const errMsg = "Failed to execute: " + JSON.stringify(output, null, 2);
        throw new types_1.TransactionError(errMsg, output);
    }
    return output;
};
exports.slowCheck = slowCheck;
const fastCheck = async function (provider, txID) {
    return await (0, helper_1.retry)(async () => {
        var _a;
        const transaction = (await provider.trx.getTransaction(txID));
        if (!((_a = transaction.ret) === null || _a === void 0 ? void 0 : _a.length)) {
            await (0, wait_1.default)(1000);
            return (0, exports.fastCheck)(provider, txID);
        }
        if (!transaction.ret.every((result) => result.contractRet === types_1.CONTRACT_SUCCESS)) {
            throw new types_1.TransactionError(transaction.ret
                .filter((el) => el.contractRet !== types_1.CONTRACT_SUCCESS)
                .map((el) => el.contractRet)
                .join(","), { id: transaction.txID });
        }
        return transaction;
    }, 10, 1000);
};
exports.fastCheck = fastCheck;
const trackTransaction = async function (signedTransaction, provider, options = {}) {
    var _a;
    const checkOption = (_a = options.check) !== null && _a !== void 0 ? _a : "slow";
    if (checkOption === "fast") {
        return await (0, exports.fastCheck)(provider, signedTransaction.txID)
            .then((transaction) => {
            (0, helper_1.executePromiseAndCallback)((0, exports.slowCheck)(provider, signedTransaction.txID), options);
            return transaction;
        })
            .catch((error) => {
            (0, helper_1.executePromiseAndCallback)(Promise.reject(error), options);
            throw error;
        });
    }
    return await (0, exports.slowCheck)(provider, signedTransaction.txID)
        .then((transaction) => {
        (0, helper_1.executePromiseAndCallback)(Promise.resolve(transaction), options);
        return transaction;
    })
        .catch((error) => {
        (0, helper_1.executePromiseAndCallback)(Promise.reject(error), options);
        throw error;
    });
};
exports.trackTransaction = trackTransaction;
//# sourceMappingURL=contractHelpers.js.map