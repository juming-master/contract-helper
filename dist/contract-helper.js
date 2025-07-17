"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractHelper = void 0;
const tronweb_1 = require("tronweb");
const helper_1 = require("./helper");
const debounce_1 = __importDefault(require("debounce"));
const uuid_1 = require("uuid");
const tron_1 = require("./tron");
const eth_1 = require("./eth");
class ContractHelper {
    helper;
    pendingQueries = [];
    debounceExecuteLazyCalls;
    multicallMaxPendingLength;
    /**
     * @param options {
     *  provider: TronWeb | Provider(ethers.js);
     *  multicallV2Address: multicallv2 address;
     *  multicallLazyQueryTimeout?: maximum wait time for executing the pending call queue.
     *  multicallMaxPendingLength?: maximum length for the pending call queue.
     *  simulateBeforeSend?: simulate the transactions(use eth_call) before send then transaction.Only support eth.
     *  formatValue?: {
     *    address?: "base58"(only tron) | "checksum" | "hex"; // default base58 in tron and checksum in eth
     *    uint?: "bigint" | "bignumber"; // default bignumber
     *  }
     * }
     */
    constructor(options) {
        const provider = options.provider;
        const multicallAddr = options.multicallV2Address;
        const multicallLazyQueryTimeout = options.multicallLazyQueryTimeout ?? 1000;
        this.multicallMaxPendingLength = options.multicallMaxLazyCallsLength ?? 10;
        this.helper =
            provider instanceof tronweb_1.TronWeb
                ? new tron_1.TronContractHelper(multicallAddr, provider, options.formatValue)
                : new eth_1.EthContractHelper(multicallAddr, provider, options.simulateBeforeSend ?? true, options.formatValue);
        this.addLazyCall = this.addLazyCall.bind(this);
        this.addPendingQuery = this.addPendingQuery.bind(this);
        this.debounceExecuteLazyCalls = (0, debounce_1.default)(() => {
            return this.executeLazyCalls();
        }, multicallLazyQueryTimeout);
    }
    /**
     * @deprecated use call instead.
     */
    async getContractValue(contractCallArgs) {
        return this.call(contractCallArgs);
    }
    /**
     * Call the contract to get a readable value.
     * @param contractCallArgs
     * {
     *  address: contract address.
     *  abi: abi fragments.
     *  method: method name or full signature. If full signature is used, ABI is optional.
     *  parameters: method parameters.
     * }
     */
    async call(contractCallArgs) {
        return this.helper.call(
        // @ts-ignore
        contractCallArgs);
    }
    /**
     *@deprecated use multicall instead.
     */
    getMultiContractValues(multicallArgs) {
        return this.multicall(multicallArgs);
    }
    /**
     * Use Multicall v2 to query with multiple arguments
     */
    multicall(multicallArgs) {
        return this.helper.multicall(multicallArgs);
    }
    /**
     * Sign the transaction and send it to the network.
     * @param from signer address
     * @param sendTransaction sign transaction function.
     * @param contractCall contract call arguments.
     * @param options execute callback.
     */
    async send(from, sendTransaction, contractCall) {
        const txId = await this.helper.send(from, 
        // @ts-ignore
        sendTransaction, contractCall);
        return txId;
    }
    async checkTransactionResult(txID, options) {
        return this.helper.checkTransactionResult(txID, options);
    }
    /**
     * Return the pending call length.
     */
    get lazyCallsLength() {
        return this.pendingQueries.length;
    }
    /**
     * @deprecated use pendingCallLength instead.
     */
    get pendingQueriesLength() {
        return this.lazyCallsLength;
    }
    /**
     * Insert a contract call to the pending call queue, and wait for the pending calls to be executed in a multicall request.
     */
    lazyCall(query) {
        const key = (0, uuid_1.v4)();
        return new Promise((resolve, reject) => {
            this.addLazyCall({
                query: {
                    key,
                    ...query,
                },
                callback: {
                    success: async (value) => {
                        resolve(value);
                        return value;
                    },
                    error: reject,
                },
            });
        });
    }
    /**
     * @deprecated use lazyCall instead.
     */
    queryByBundle(query) {
        return this.lazyCall(query);
    }
    /**
     * Insert a contract call to the pending call queue.
     */
    addLazyCall(query, trigger) {
        this.pendingQueries.push(query);
        // If callback is undefined, it will be call instant.
        if (!query.callback ||
            trigger ||
            this.lazyCallsLength >= this.multicallMaxPendingLength) {
            this.executeLazyCalls();
        }
        else {
            this.debounceExecuteLazyCalls();
        }
    }
    /**
     * @deprecated use addLazyCall instead.
     */
    addPendingQuery(query, trigger) {
        this.addLazyCall(query, trigger);
    }
    /**
     * Execute the pending call queue.
     */
    executeLazyCalls(callback) {
        if (this.lazyCallsLength === 0) {
            return Promise.resolve([]);
        }
        const queries = [...this.pendingQueries];
        this.pendingQueries = [];
        const cb = queries.reduce((prev, cur) => {
            prev[cur.query.key] = cur.callback;
            return prev;
        }, {});
        return (0, helper_1.runWithCallback)(async () => {
            // request max 5 times for multicall query
            const values = await (0, helper_1.retry)(() => this.multicall(queries.map((el) => el.query)), 5, 1000);
            const keys = Object.keys(values);
            const cbResult = await (0, helper_1.map)(keys, async (key) => {
                const value = values[key];
                if (cb[key]) {
                    // request max 5 times for every callback
                    return await (0, helper_1.retry)(async () => cb[key]?.success(value), 5, 1000);
                }
                else {
                    return value;
                }
            }, {
                concurrency: keys.length,
                stopOnError: false,
            });
            if (cbResult.length === 1) {
                return cbResult[0];
            }
            return cbResult;
        }, {
            success: callback?.success,
            error(err) {
                const keys = Object.keys(cb);
                (0, helper_1.map)(keys, async (key) => {
                    if (cb[key]) {
                        cb[key]?.error && cb[key].error(err);
                    }
                }, {
                    concurrency: keys.length,
                    stopOnError: false,
                });
                callback?.error && callback.error(err);
            },
        });
    }
    /**
     * @deprecated use executeLazyCalls instead.
     */
    executePendingQueries(callback) {
        return this.executeLazyCalls(callback);
    }
}
exports.ContractHelper = ContractHelper;
exports.default = ContractHelper;
//# sourceMappingURL=contract-helper.js.map