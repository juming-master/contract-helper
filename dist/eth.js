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
    runner;
    simulate;
    formatValueType;
    feeCalculation;
    chainId = null;
    constructor(multicallContractAddress, runner, simulate, formatValue, feeCalculation) {
        super(multicallContractAddress);
        if (!runner.provider) {
            throw new Error(`EVM runner should be initialized with a provider`);
        }
        this.runner = runner;
        this.simulate = simulate;
        this.formatValueType = formatValue;
        this.feeCalculation = feeCalculation;
    }
    buildAggregateCall(multiCallArgs) {
        return (0, contract_utils_1.buildAggregateCall)(multiCallArgs, function (fragment, values) {
            const iface = new ethers_1.Interface([fragment]);
            const encodedData = iface.encodeFunctionData(fragment, values);
            return encodedData;
        }, "evm");
    }
    buildUpAggregateResponse(multiCallArgs, response) {
        return (0, contract_utils_1.buildUpAggregateResponse)(multiCallArgs, response, function (fragment, data) {
            const interf = new ethers_1.Interface([fragment]);
            let result = interf.decodeFunctionResult(fragment, data);
            return result;
        }, (value, fragment) => {
            return this.handleContractValue(value, fragment);
        }, "evm");
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
        const multicallContract = new ethers_1.Contract(this.multicallAddress, ABI, this.runner);
        const multicalls = this.buildAggregateCall(calls);
        const response = await multicallContract.aggregate.staticCall(multicalls.map((call) => ({
            target: call.target,
            callData: call.encodedData,
        })));
        return this.buildUpAggregateResponse(calls, response);
    }
    async call(contractCallArgs) {
        const { address, abi, method, args = [], } = (0, contract_utils_1.transformContractCallArgs)(contractCallArgs, "evm");
        const contract = new ethers_1.Contract(address, abi, this.runner);
        const rawResult = await contract[method.name](...args);
        const result = this.handleContractValue(rawResult, method.fragment);
        return result;
    }
    maxBigInt(...args) {
        return args.reduce((a, b) => (a > b ? a : b));
    }
    /**
     * Calculate the next block's baseFee according to EIP-1559 formula.
     *
     * @param parentBaseFee Base fee of the parent block (wei)
     * @param gasUsed Gas used in the parent block
     * @param gasTarget Target gas (half of block gas limit)
     * @returns Predicted baseFeePerGas for the next block (wei)
     */
    calcNextBaseFee(parentBaseFee, gasUsed, gasTarget) {
        const delta = gasUsed - gasTarget;
        // Base fee changes by (baseFee * delta / gasTarget) / 8 (max ±12.5% per block)
        return parentBaseFee + (parentBaseFee * delta) / gasTarget / 8n;
    }
    /**
     * Get gas parameters for a "fast confirmation" EIP-1559 transaction
     * with next-block baseFee prediction.
     *
     * @param provider ethers.js Provider instance
     * @param blocksToCheck Number of historical blocks to sample for priority fee
     * @param priorityFeeExtraGwei Extra tip to add on top of historical max priority fee (gwei)
     * @returns Gas params: baseFee, predictedBaseFee, maxPriorityFeePerGas, maxFeePerGas
     */
    async getFastGasParamsWithPrediction(blocksToCheck = 10, priorityFeeExtraGwei = 1) {
        const provider = this.runner.provider;
        // Get the latest block to retrieve current baseFeePerGas and gas usage
        const latestBlock = await provider.getBlock("latest");
        if (!latestBlock?.baseFeePerGas ||
            !latestBlock?.gasUsed ||
            !latestBlock?.gasLimit) {
            throw new Error("Current network does not support EIP-1559 (no baseFeePerGas found)");
        }
        const baseFee = latestBlock.baseFeePerGas;
        const gasUsed = latestBlock.gasUsed;
        const gasTarget = latestBlock.gasLimit / 2n;
        // Predict the next block's baseFee
        const predictedBaseFee = this.calcNextBaseFee(baseFee, gasUsed, gasTarget);
        // Fetch fee history to analyze recent priority fees
        if (typeof provider.send !== "function") {
            throw new Error(`Provider dosn't support eip1193`);
        }
        const feeHistory = await provider.send("eth_feeHistory", [
            `0x${blocksToCheck.toString(16)}`, // number of blocks to check
            "latest", // end block
            [50], // use median (50th percentile) priority fee
        ]);
        // Flatten rewards array and convert from hex to bigint
        const priorityFees = feeHistory.reward
            .flat()
            .map((hex) => BigInt(hex));
        // Get the highest observed priority fee from recent history
        const historicalMaxPriority = priorityFees.length
            ? priorityFees.reduce((a, b) => (a > b ? a : b))
            : (0, ethers_1.parseUnits)("2", "gwei"); // default to 2 gwei if no data
        // Add extra tip to ensure fast confirmation
        const maxPriorityFeePerGas = historicalMaxPriority +
            (0, ethers_1.parseUnits)(priorityFeeExtraGwei.toString(), "gwei");
        // Total maxFee = predicted baseFee + tip
        const maxFeePerGas = predictedBaseFee + maxPriorityFeePerGas;
        return {
            baseFee: predictedBaseFee,
            maxPriorityFeePerGas,
            maxFeePerGas,
        };
    }
    calcTransactionType(tx) {
        if (tx.type !== null && tx.type !== undefined && !Number.isNaN(tx.type)) {
            return Number(tx.type);
        }
        const hasEip1559Fees = (tx.maxFeePerGas !== undefined && tx.maxFeePerGas !== null) ||
            (tx.maxPriorityFeePerGas !== undefined &&
                tx.maxPriorityFeePerGas !== null);
        if (hasEip1559Fees) {
            return 2; // Type 2 (EIP-1559)
        }
        const hasLegacyGasPrice = tx.gasPrice !== undefined && tx.gasPrice !== null;
        if (hasLegacyGasPrice) {
            // 检查 accessList 字段是否存在，如果存在且不为空，则为 Type 1
            const hasAccessList = tx.accessList !== undefined &&
                tx.accessList !== null &&
                tx.accessList?.length;
            if (hasAccessList) {
                return 1; // Type 1 (EIP-2930)
            }
            return 0; // Type 0 (Legacy)
        }
        return 0; // Default 0, is supported by all EVM.
    }
    hasGasParams(tx) {
        const hasEip1559Fees = (tx.maxFeePerGas !== undefined && tx.maxFeePerGas !== null) ||
            (tx.maxPriorityFeePerGas !== undefined &&
                tx.maxPriorityFeePerGas !== null);
        if (hasEip1559Fees) {
            return true;
        }
        const hasLegacyGasPrice = tx.gasPrice !== undefined && tx.gasPrice !== null;
        return hasLegacyGasPrice;
    }
    async getGasParams(tx, ignoreFeeCalculation) {
        const provider = this.runner.provider;
        const feeCalculation = this.feeCalculation;
        if (feeCalculation && !ignoreFeeCalculation) {
            return await feeCalculation({
                provider,
                tx,
            });
        }
        const [block, estimatedGas, feeData] = await Promise.all([
            (0, helper_1.retry)(() => provider.getBlock("latest"), 5, 100),
            (0, helper_1.retry)(() => provider.estimateGas(tx), 5, 100),
            (0, helper_1.retry)(() => provider.getFeeData(), 5, 100),
        ]);
        const gasLimit = (estimatedGas * 120n) / 100n;
        if (block?.baseFeePerGas &&
            feeData.maxFeePerGas &&
            feeData.maxPriorityFeePerGas) {
            let maxFeePerGas, maxPriorityFeePerGas;
            try {
                const gas = await this.getFastGasParamsWithPrediction(10, 2);
                maxFeePerGas = gas.maxFeePerGas;
                maxPriorityFeePerGas = gas.maxPriorityFeePerGas;
            }
            catch (e) {
                maxPriorityFeePerGas = (feeData.maxPriorityFeePerGas * 120n) / 100n;
                maxFeePerGas =
                    (block.baseFeePerGas * 1125n) / 1000n + maxPriorityFeePerGas;
            }
            return {
                gasLimit,
                maxFeePerGas: this.maxBigInt(maxFeePerGas, maxPriorityFeePerGas),
                maxPriorityFeePerGas,
            };
        }
        return {
            gasLimit,
            gasPrice: (feeData.gasPrice * 120n) / 100n,
        };
    }
    async createTransaction(from, contractOption) {
        const { address, abi, method, options, args = [], } = (0, contract_utils_1.transformContractCallArgs)(contractOption, "evm");
        const interf = new ethers_1.Interface(abi);
        const data = interf.encodeFunctionData(method.fragment, args);
        const provider = this.runner.provider;
        const [chainId, nonce] = await Promise.all([
            (0, helper_1.retry)(async () => {
                if (this.chainId === null) {
                    const network = await provider.getNetwork();
                    this.chainId = network.chainId;
                }
                return this.chainId;
            }, 5, 100),
            (0, helper_1.retry)(() => provider.getTransactionCount(from), 5, 100),
        ]);
        let tx = {
            ...options,
            to: address,
            data,
            nonce,
            chainId,
            from,
        };
        if (!this.hasGasParams(tx)) {
            const gasParams = await this.getGasParams(tx, false);
            tx = {
                ...tx,
                ...gasParams,
            };
        }
        const type = this.calcTransactionType(tx);
        tx = { ...tx, type };
        return tx;
    }
    async sendTransaction(transaction, sendTransaction) {
        const provider = this.runner.provider;
        if (this.simulate) {
            await provider.call(transaction);
        }
        try {
            const txId = await sendTransaction(transaction, provider, "evm");
            return txId;
        }
        catch (e) {
            const error = e.error || {};
            if (error.code === -32000 &&
                error.message === "transaction underpriced") {
                const gasParams = await this.getGasParams(transaction, true);
                let tx = { ...transaction, ...gasParams };
                const type = this.calcTransactionType(gasParams);
                tx = { ...tx, type };
                const txId = await sendTransaction(tx, provider, "evm");
                return txId;
            }
            throw e;
        }
    }
    async send(from, sendTransaction, contractOption) {
        const transaction = await this.createTransaction(from, contractOption);
        return await this.sendTransaction(transaction, sendTransaction);
    }
    async checkReceipt(txId, confirmations) {
        const receipt = await (0, helper_1.retry)(async () => {
            const receipt = await this.runner.provider.waitForTransaction(txId, confirmations);
            if (!receipt) {
                await (0, wait_1.default)(1000);
                return this.checkReceipt(txId, confirmations);
            }
            return receipt;
        }, 10, 1000);
        if (!receipt.status) {
            throw new errors_1.TransactionReceiptError("Transaction execute reverted", {
                txId: txId,
                blockNumber: confirmations >= 5 ? BigInt(receipt.blockNumber) : undefined,
            });
        }
        return receipt;
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