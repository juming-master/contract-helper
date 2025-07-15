"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthContractHelper = void 0;
const contract_utils_1 = require("./contract-utils");
const helper_1 = require("./helper");
const wait_1 = __importDefault(require("wait"));
const contract_helper_base_1 = require("./contract-helper-base");
const ethers_1 = require("ethers");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const errors_1 = require("./errors");
const ABI = [
    {
        inputs: [
            {
                components: [
                    { internalType: "address", name: "target", type: "address" },
                    { internalType: "bytes", name: "callData", type: "bytes" },
                ],
                internalType: "struct Multicall2.Call[]",
                name: "calls",
                type: "tuple[]",
            },
        ],
        name: "aggregate",
        outputs: [
            { internalType: "uint256", name: "blockNumber", type: "uint256" },
            { internalType: "bytes[]", name: "returnData", type: "bytes[]" },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                components: [
                    { internalType: "address", name: "target", type: "address" },
                    { internalType: "bytes", name: "callData", type: "bytes" },
                ],
                internalType: "struct Multicall2.Call[]",
                name: "calls",
                type: "tuple[]",
            },
        ],
        name: "blockAndAggregate",
        outputs: [
            { internalType: "uint256", name: "blockNumber", type: "uint256" },
            { internalType: "bytes32", name: "blockHash", type: "bytes32" },
            {
                components: [
                    { internalType: "bool", name: "success", type: "bool" },
                    { internalType: "bytes", name: "returnData", type: "bytes" },
                ],
                internalType: "struct Multicall2.Result[]",
                name: "returnData",
                type: "tuple[]",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "uint256", name: "blockNumber", type: "uint256" }],
        name: "getBlockHash",
        outputs: [{ internalType: "bytes32", name: "blockHash", type: "bytes32" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "getBlockNumber",
        outputs: [
            { internalType: "uint256", name: "blockNumber", type: "uint256" },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "getCurrentBlockCoinbase",
        outputs: [{ internalType: "address", name: "coinbase", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "getCurrentBlockDifficulty",
        outputs: [{ internalType: "uint256", name: "difficulty", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "getCurrentBlockGasLimit",
        outputs: [{ internalType: "uint256", name: "gaslimit", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "getCurrentBlockTimestamp",
        outputs: [{ internalType: "uint256", name: "timestamp", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "addr", type: "address" }],
        name: "getEthBalance",
        outputs: [{ internalType: "uint256", name: "balance", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "getLastBlockHash",
        outputs: [{ internalType: "bytes32", name: "blockHash", type: "bytes32" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { internalType: "bool", name: "requireSuccess", type: "bool" },
            {
                components: [
                    { internalType: "address", name: "target", type: "address" },
                    { internalType: "bytes", name: "callData", type: "bytes" },
                ],
                internalType: "struct Multicall2.Call[]",
                name: "calls",
                type: "tuple[]",
            },
        ],
        name: "tryAggregate",
        outputs: [
            {
                components: [
                    { internalType: "bool", name: "success", type: "bool" },
                    { internalType: "bytes", name: "returnData", type: "bytes" },
                ],
                internalType: "struct Multicall2.Result[]",
                name: "returnData",
                type: "tuple[]",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "bool", name: "requireSuccess", type: "bool" },
            {
                components: [
                    { internalType: "address", name: "target", type: "address" },
                    { internalType: "bytes", name: "callData", type: "bytes" },
                ],
                internalType: "struct Multicall2.Call[]",
                name: "calls",
                type: "tuple[]",
            },
        ],
        name: "tryBlockAndAggregate",
        outputs: [
            { internalType: "uint256", name: "blockNumber", type: "uint256" },
            { internalType: "bytes32", name: "blockHash", type: "bytes32" },
            {
                components: [
                    { internalType: "bool", name: "success", type: "bool" },
                    { internalType: "bytes", name: "returnData", type: "bytes" },
                ],
                internalType: "struct Multicall2.Result[]",
                name: "returnData",
                type: "tuple[]",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
];
class EthContractHelper extends contract_helper_base_1.ContractHelperBase {
    constructor(multicallContractAddress, provider) {
        super(multicallContractAddress);
        this.provider = provider;
    }
    buildAggregateCall(multiCallArgs) {
        return (0, contract_utils_1.buildAggregateCall)(multiCallArgs, function (fragment, values) {
            const iface = new ethers_1.Interface([fragment]);
            const encodedData = iface.encodeFunctionData(fragment, values);
            return encodedData;
        });
    }
    buildUpAggregateResponse(multiCallArgs, response) {
        return (0, contract_utils_1.buildUpAggregateResponse)(multiCallArgs, response, function (fragment, data) {
            const interf = new ethers_1.Interface([fragment]);
            let result = interf.decodeFunctionData(fragment, data);
            return result;
        }, (value, fragment) => {
            return this.handleContractValue(value, fragment);
        });
    }
    formatValue(value, type) {
        switch (true) {
            case type.endsWith("[]"):
                const itemType = type.slice(0, -2);
                return value.map((el) => this.formatValue(el, itemType));
            case type.startsWith("uint"):
            case type.startsWith("int"):
                return new bignumber_js_1.default(value.toString());
            case type === "address":
                return (0, ethers_1.getAddress)(value);
            default:
                return value;
        }
    }
    handleContractValue(value, functionFragment) {
        const outputs = functionFragment.outputs;
        if (outputs && outputs.length === 1 && !outputs[0].name) {
            return this.formatValue(value, outputs[0].type);
        }
        const result = {};
        for (let output of outputs) {
            result[output.name] = this.formatValue(value[output.name], output.type);
        }
        return result;
    }
    /**
     * Execute the multicall contract call
     * @param calls The calls
     */
    async multicall(calls) {
        const multicallContract = new ethers_1.Contract(this.multicallAddress, ABI, this.provider);
        const multicalls = this.buildAggregateCall(calls);
        const response = await multicallContract.aggregate(multicalls.map((call) => [call.target, call.encodedData]));
        return this.buildUpAggregateResponse(calls, response);
    }
    async call(contractCallArgs) {
        const { address, abi, method, parameters = [], } = (0, contract_utils_1.transformContractCallArgs)(contractCallArgs);
        const contract = new ethers_1.Contract(address, abi, this.provider);
        const rawResult = await contract[method.name](...parameters);
        const result = this.handleContractValue(rawResult, method.fragment);
        return result;
    }
    async send(from, sendTransaction, contractOption) {
        const { address, abi, method, options, parameters = [], } = (0, contract_utils_1.transformContractCallArgs)(contractOption);
        const chainId = (await this.provider.getNetwork()).chainId;
        const nonce = await this.provider.getTransactionCount(from);
        const interf = new ethers_1.Interface(abi);
        const data = interf.encodeFunctionData(method.fragment, parameters);
        const tx = Object.assign(Object.assign({}, options === null || options === void 0 ? void 0 : options.eth), { from, to: address, data,
            nonce,
            chainId, type: 2 });
        const unsignedTx = ethers_1.Transaction.from(tx);
        try {
            await this.provider.call(tx);
        }
        catch (err) {
            console.error(err);
            throw err;
        }
        const transactionResponse = await sendTransaction(unsignedTx);
        const receipt = await transactionResponse.wait(1);
        return receipt.hash;
    }
    async checkReceipt(txID, confirmations) {
        return await (0, helper_1.retry)(async () => {
            const receipt = await this.provider.getTransactionReceipt(txID);
            if (!receipt) {
                await (0, wait_1.default)(1000);
                return this.checkReceipt(txID, confirmations);
            }
            const receiptConfirmations = await receipt.confirmations();
            if (receiptConfirmations < confirmations) {
                await (0, wait_1.default)(1000);
                return this.checkReceipt(txID, confirmations);
            }
            if (!receipt.status) {
                throw new errors_1.TransactionReceiptError("Transaction execute reverted", {
                    id: txID,
                });
            }
            return receipt;
        }, 10, 1000);
    }
    async finalCheckTransactionResult(txID) {
        const receipt = await this.checkReceipt(txID, 5);
        return {
            blockNumber: new bignumber_js_1.default(receipt.blockNumber),
            id: receipt.hash,
        };
    }
    async fastCheckTransactionResult(txID) {
        return (await this.checkReceipt(txID, 0)).hash;
    }
}
exports.EthContractHelper = EthContractHelper;
//# sourceMappingURL=eth.js.map