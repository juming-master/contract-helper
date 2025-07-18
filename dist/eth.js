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
    provider;
    simulate;
    formatValueType;
    constructor(multicallContractAddress, provider, simulate, formatValue) {
        super(multicallContractAddress);
        this.provider = provider;
        this.simulate = simulate;
        this.formatValueType = formatValue;
    }
    buildAggregateCall(multiCallArgs) {
        return (0, contract_utils_1.buildAggregateCall)(multiCallArgs, function (fragment, values) {
            const iface = new ethers_1.Interface([fragment]);
            const encodedData = iface.encodeFunctionData(fragment, values);
            return encodedData;
        }, "eth");
    }
    buildUpAggregateResponse(multiCallArgs, response) {
        return (0, contract_utils_1.buildUpAggregateResponse)(multiCallArgs, response, function (fragment, data) {
            const interf = new ethers_1.Interface([fragment]);
            let result = interf.decodeFunctionResult(fragment, data);
            return result;
        }, (value, fragment) => {
            return this.handleContractValue(value, fragment);
        }, "eth");
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
                return this.formatValueType?.address === "hex"
                    ? (0, ethers_1.getAddress)(value).toLowerCase()
                    : (0, ethers_1.getAddress)(value);
            default:
                return value;
        }
    }
    handleContractValue(value, functionFragment) {
        const outputs = functionFragment.outputs;
        if (outputs && outputs.length === 1 && !outputs[0].name) {
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
        const multicallContract = new ethers_1.Contract(this.multicallAddress, ABI, this.provider);
        const multicalls = this.buildAggregateCall(calls);
        const response = await multicallContract.aggregate.staticCall(multicalls.map((call) => ({
            target: call.target,
            callData: call.encodedData,
        })));
        return this.buildUpAggregateResponse(calls, response);
    }
    async call(contractCallArgs) {
        const { address, abi, method, parameters = [], } = (0, contract_utils_1.transformContractCallArgs)(contractCallArgs, "eth");
        const contract = new ethers_1.Contract(address, abi, this.provider);
        const rawResult = await contract[method.name](...parameters);
        const result = this.handleContractValue(rawResult, method.fragment);
        return result;
    }
    async send(from, sendTransaction, contractOption) {
        const { address, abi, method, options, parameters = [], } = (0, contract_utils_1.transformContractCallArgs)(contractOption, "eth");
        const chainId = (await this.provider.getNetwork()).chainId;
        const nonce = await this.provider.getTransactionCount(from);
        const interf = new ethers_1.Interface(abi);
        const data = interf.encodeFunctionData(method.fragment, parameters);
        const tx = {
            ...options,
            to: address,
            data,
            nonce,
            chainId,
            type: 2,
            from,
        };
        if (!tx?.gasPrice) {
            const feeData = await this.provider.getFeeData();
            if (!tx?.maxFeePerGas) {
                tx.maxFeePerGas = feeData.maxFeePerGas;
            }
            if (!tx?.maxPriorityFeePerGas) {
                tx.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
            }
        }
        if (!tx?.gasLimit) {
            const estimatedGas = await this.provider.estimateGas(tx);
            const gasLimit = (estimatedGas * 120n) / 100n;
            tx.gasLimit = gasLimit;
        }
        if (this.simulate) {
            try {
                await this.provider.call({ ...tx, from });
            }
            catch (err) {
                console.error(err);
                throw err;
            }
        }
        const txId = await sendTransaction({ ...tx }, 
        // @ts-ignore
        this.provider, false);
        return txId;
    }
    async checkReceipt(txId, confirmations) {
        return (0, helper_1.retry)(async () => {
            const receipt = await this.provider.getTransactionReceipt(txId);
            if (!receipt) {
                await (0, wait_1.default)(1000);
                return this.checkReceipt(txId, confirmations);
            }
            const receiptConfirmations = await receipt.confirmations();
            if (receiptConfirmations < confirmations) {
                await (0, wait_1.default)(1000);
                return this.checkReceipt(txId, confirmations);
            }
            if (!receipt.status) {
                throw new errors_1.TransactionReceiptError("Transaction execute reverted", {
                    txId: txId,
                    blockNumber: confirmations >= 5 ? BigInt(receipt.blockNumber) : undefined,
                });
            }
            return receipt;
        }, 10, 1000);
    }
    async finalCheckTransactionResult(txId) {
        const receipt = await this.checkReceipt(txId, 5);
        return {
            blockNumber: BigInt(receipt.blockNumber),
            txId: receipt.hash,
        };
    }
    async fastCheckTransactionResult(txId) {
        const receipt = await this.checkReceipt(txId, 0);
        return { txId: receipt.hash };
    }
}
exports.EthContractHelper = EthContractHelper;
//# sourceMappingURL=eth.js.map