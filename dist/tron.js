"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TronContractHelper = void 0;
const tronweb_1 = require("tronweb");
const types_1 = require("./types");
const contract_utils_1 = require("./contract-utils");
const contract_helper_base_1 = require("./contract-helper-base");
const wait_1 = __importDefault(require("wait"));
const helper_1 = require("./helper");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const errors_1 = require("./errors");
const ABI = [
    {
        inputs: [
            {
                components: [
                    {
                        internalType: "address",
                        name: "target",
                        type: "address",
                    },
                    {
                        internalType: "bytes",
                        name: "callData",
                        type: "bytes",
                    },
                ],
                internalType: "struct TronMulticall.Call[]",
                name: "calls",
                type: "tuple[]",
            },
        ],
        name: "aggregate",
        outputs: [
            {
                internalType: "uint256",
                name: "blockNumber",
                type: "uint256",
            },
            {
                internalType: "bytes[]",
                name: "returnData",
                type: "bytes[]",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "getBasefee",
        outputs: [
            {
                internalType: "uint256",
                name: "basefee",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "blockNumber",
                type: "uint256",
            },
        ],
        name: "getBlockHash",
        outputs: [
            {
                internalType: "bytes32",
                name: "blockHash",
                type: "bytes32",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "getBlockNumber",
        outputs: [
            {
                internalType: "uint256",
                name: "blockNumber",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "getChainId",
        outputs: [
            {
                internalType: "uint256",
                name: "chainid",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "getCurrentBlockCoinbase",
        outputs: [
            {
                internalType: "address",
                name: "coinbase",
                type: "address",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "getCurrentBlockDifficulty",
        outputs: [
            {
                internalType: "uint256",
                name: "difficulty",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "getCurrentBlockTimestamp",
        outputs: [
            {
                internalType: "uint256",
                name: "timestamp",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "addr",
                type: "address",
            },
        ],
        name: "getEthBalance",
        outputs: [
            {
                internalType: "uint256",
                name: "balance",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "getLastBlockHash",
        outputs: [
            {
                internalType: "bytes32",
                name: "blockHash",
                type: "bytes32",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "accountAddress",
                type: "address",
            },
            {
                internalType: "trcToken",
                name: "id",
                type: "trcToken",
            },
        ],
        name: "getTokenBalance",
        outputs: [
            {
                internalType: "uint256",
                name: "balance",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "addr",
                type: "address",
            },
        ],
        name: "isContract",
        outputs: [
            {
                internalType: "bool",
                name: "result",
                type: "bool",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes[]",
                name: "data",
                type: "bytes[]",
            },
        ],
        name: "multicall",
        outputs: [
            {
                internalType: "bytes[]",
                name: "results",
                type: "bytes[]",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
];
class TronContractHelper extends contract_helper_base_1.ContractHelperBase {
    provider;
    formatValueType;
    feeCalculation;
    constructor(multicallContractAddress, provider, formatValue, feeCalculation) {
        super(multicallContractAddress);
        this.provider = provider;
        this.formatValueType = formatValue;
        this.feeCalculation = feeCalculation;
    }
    formatToEthAddress(address) {
        if (tronweb_1.TronWeb.isAddress(address)) {
            return ("0x" + tronweb_1.TronWeb.address.toChecksumAddress(address).slice(2).toLowerCase());
        }
        throw new Error(`${address} is invalid address.`);
    }
    /**
     * Map call contract to match contract format
     * @param calls The calls context
     */
    mapCallContextToMatchContractFormat(calls) {
        return calls.map((call) => [
            this.formatToEthAddress(call.target),
            call.encodedData,
        ]);
    }
    buildAggregateCall(multiCallArgs) {
        return (0, contract_utils_1.buildAggregateCall)(multiCallArgs, (fragment, values) => {
            const funcABI = JSON.parse(fragment.format("json"));
            const params = this.provider.utils.abi.encodeParamsV2ByABI(funcABI, values);
            const selector = fragment.selector;
            const encodedData = `${selector}${params.slice(2)}`;
            return encodedData;
        }, "tron");
    }
    buildUpAggregateResponse(multiCallArgs, response) {
        return (0, contract_utils_1.buildUpAggregateResponse)(multiCallArgs, response, (fragment, data) => {
            const funcABI = JSON.parse(fragment.format("json"));
            return this.provider.utils.abi.decodeParamsV2ByABI(
            // @ts-ignore
            funcABI, data);
        }, (value, fragment) => {
            return this.handleContractValue(value, fragment);
        }, "tron");
    }
    formatValue(value, type) {
        switch (true) {
            case type.endsWith("[]"):
                const itemType = type.slice(0, -2);
                return value.map((el) => this.formatValue(el, itemType));
            case type.startsWith("uint"):
            case type.startsWith("int"):
                return this.formatValueType?.uint === "bigint"
                    ? BigInt(value.toString())
                    : new bignumber_js_1.default(value.toString());
            case type === "address":
                return this.formatValueType?.address === "checksum"
                    ? tronweb_1.TronWeb.address.toChecksumAddress(value)
                    : this.formatValueType?.address === "hex"
                        ? tronweb_1.TronWeb.address.toHex(value).toLowerCase()
                        : (0, contract_utils_1.formatBase58Address)(value);
            default:
                return value;
        }
    }
    handleContractValue(value, functionFragment) {
        const outputs = functionFragment.outputs;
        if (outputs.length === 1 && !outputs[0].name) {
            return this.formatValue(value, outputs[0].type);
        }
        const result = [];
        for (let [index, output] of outputs.entries()) {
            result[index] = this.formatValue(value[index], output.type);
            if (output.name) {
                result[output.name] = this.formatValue(value[output.name], output.type);
            }
        }
        return result;
    }
    /**
     * Execute the multicall contract call
     * @param calls The calls
     */
    async multicall(calls) {
        const provider = this.provider;
        const address = this.multicallAddress;
        const contract = provider.contract(ABI, address);
        const paramters = this.mapCallContextToMatchContractFormat(this.buildAggregateCall(calls));
        const contractResponse = await contract.aggregate(paramters).call();
        return this.buildUpAggregateResponse(calls, contractResponse);
    }
    async call(contractCallArgs) {
        const { address, abi, method, args = [], } = (0, contract_utils_1.transformContractCallArgs)(contractCallArgs, "tron");
        const contract = this.provider.contract(abi, address);
        const rawResult = await contract[method.name](...args).call();
        const result = this.handleContractValue(rawResult, method.fragment);
        return result;
    }
    static async broadcastTransaction(provider, signedTransaction) {
        const broadcast = await provider.trx.sendRawTransaction(signedTransaction);
        if (broadcast.code) {
            const err = new errors_1.BroadcastTronTransactionError(broadcast.message);
            err.code = broadcast.code;
            if (broadcast.message) {
                err.message = provider.toUtf8(broadcast.message);
            }
            const error = new errors_1.BroadcastTronTransactionError(err.message);
            error.code = broadcast.code;
            throw error;
        }
        return broadcast.transaction.txID;
    }
    async getFeeParams(provider, options) {
        const feeCalculation = this.feeCalculation;
        if (feeCalculation) {
            return await feeCalculation({ provider, options });
        }
        return {};
    }
    async createTransaction(from, contractOption, sendOptions) {
        const { address, method, options, args = [], } = (0, contract_utils_1.transformContractCallArgs)(contractOption, "tron");
        const functionFragment = method.fragment;
        const provider = this.provider;
        const fee = await this.getFeeParams(provider, sendOptions);
        const feeParams = fee.feeLimit
            ? {
                feeLimit: Number(fee.feeLimit.toString()),
            }
            : {};
        const transaction = await provider.transactionBuilder.triggerSmartContract(address, functionFragment.format("sighash"), { ...feeParams, ...(options ? options : {}) }, functionFragment.inputs.map((el, i) => ({
            type: el.type,
            value: args[i],
        })), from);
        return transaction.transaction;
    }
    async sendTransaction(transaction, sendTransaction, options) {
        let txId = await sendTransaction(transaction, this.provider, "tron");
        return txId;
    }
    async send(from, sendTransaction, contractOption, options) {
        const transaction = await this.createTransaction(from, contractOption, options);
        return await this.sendTransaction(transaction, sendTransaction, options);
    }
    async fastCheckTransactionResult(txId, timeoutMs) {
        return this.fastCheckTransactionResultWithDeadline(txId, (0, helper_1.getDeadline)(timeoutMs));
    }
    async finalCheckTransactionResult(txId, timeoutMs) {
        return this.finalCheckTransactionResultWithDeadline(txId, (0, helper_1.getDeadline)(timeoutMs));
    }
    async fastCheckTransactionResultWithDeadline(txId, deadline) {
        (0, helper_1.ensureNotTimedOut)(txId, deadline);
        const transaction = await (0, helper_1.retry)(async () => (await this.provider.trx.getTransaction(txId)), 10, 1000);
        (0, helper_1.ensureNotTimedOut)(txId, deadline);
        if (!transaction.ret?.length) {
            await (0, wait_1.default)(1000);
            return this.fastCheckTransactionResultWithDeadline(txId, deadline);
        }
        if (!transaction.ret.every((result) => result.contractRet === types_1.CONTRACT_SUCCESS)) {
            const txInfo = await this.finalCheckTransactionResultWithDeadline(txId, deadline);
            return { txId: txInfo.txId };
        }
        return { txId: transaction.txID };
    }
    async finalCheckTransactionResultWithDeadline(txId, deadline) {
        (0, helper_1.ensureNotTimedOut)(txId, deadline);
        const output = await (0, helper_1.retry)(async () => await this.provider.trx.getTransactionInfo(txId), 10, 1000);
        (0, helper_1.ensureNotTimedOut)(txId, deadline);
        if (!Object.keys(output).length) {
            await (0, wait_1.default)(3000);
            return this.finalCheckTransactionResultWithDeadline(txId, deadline);
        }
        const transactionInfo = {
            blockNumber: BigInt(output.blockNumber),
            txId: output.id,
        };
        if (output.result && output.result === "FAILED") {
            const errMsg = this.provider.toUtf8(output.resMessage);
            throw new errors_1.TransactionReceiptError(errMsg, transactionInfo);
        }
        if (!Object.prototype.hasOwnProperty.call(output, "contractResult")) {
            const errMsg = "Failed to execute: " + JSON.stringify(output, null, 2);
            throw new errors_1.TransactionReceiptError(errMsg, transactionInfo);
        }
        return transactionInfo;
    }
}
exports.TronContractHelper = TronContractHelper;
//# sourceMappingURL=tron.js.map