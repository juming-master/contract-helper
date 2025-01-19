"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TronContractHelper = void 0;
const contractHelpers_1 = require("./contractHelpers");
const multicall_1 = require("./multicall");
const types_1 = require("./types");
const helper_1 = require("./helper");
const debounce_1 = __importDefault(require("debounce"));
const uuid_1 = require("uuid");
class TronContractHelper {
    /**
     * @param provider - Tronweb instance
     * @param signer - Adapter, reference the @tronweb3/tronwallet-abstract-adapter
     */
    constructor(provider, multicallAddress, multicallLazyQueryTimeout = 3000) {
        this.multicall = null;
        this.pendingQueries = [];
        this.provider = provider;
        if (multicallAddress) {
            this.multicall = new multicall_1.Multicall({
                provider,
                contractAddress: multicallAddress,
            });
        }
        this.addPendingQuery = this.addPendingQuery.bind(this);
        this.lazyExec = (0, debounce_1.default)(() => {
            return this.executePendingQueries();
        }, multicallLazyQueryTimeout);
    }
    /**
     * contractOption: {
     *  address:string;// contract address
     *  abi: ABI Fragments (copy from tronscan, not include the entry points, reference the ethers abi.); // contract abi
     *  method: method name, such as transfer
     *  parameters: method parameters.
     * }
     */
    async getContractValue(contractOption) {
        const { address, abi, method, parameters = [], } = (0, contractHelpers_1.transformContractOptions)(contractOption);
        const contract = this.provider.contract(abi, address);
        const rawResult = await contract[method](...parameters).call();
        const { functionFragment } = (0, contractHelpers_1.getInterfaceAndFragments)(contractOption);
        const result = (0, contractHelpers_1.handleContractValue)(rawResult, functionFragment);
        return result;
    }
    async getMultiContractValues(contractOptions) {
        if (!this.multicall) {
            throw new Error(`Please supply the multicallAddress parameter in the constructor.`);
        }
        const results = await this.multicall.call(contractOptions.map((o) => {
            const contractOption = (0, contractHelpers_1.transformContractOptions)(o);
            return {
                key: o.key,
                contractAddress: contractOption.address,
                abi: contractOption.abi,
                call: {
                    methodName: contractOption.method,
                    methodParameters: contractOption.parameters || [],
                },
            };
        }));
        const resultValues = Object.values(results.results);
        const filters = resultValues.filter((el) => !el.callReturnContext.success);
        if (filters.length > 0) {
            const methods = filters
                .map((el) => `${el.originalContractCallContext.contractAddress}:${el.originalContractCallContext.call.methodName}(${el.originalContractCallContext.call.methodParameters.join(",")})`)
                .join(";");
            throw new Error(`Fetch data error from multicall contract: ${methods}`);
        }
        return Object.keys(results.results).reduce((prev, cur) => {
            prev[cur] = results.results[cur].callReturnContext.returnValue;
            return prev;
        }, {});
    }
    async signTransaction(signer, sign, contractOption) {
        const { address, methodOverrides, parameters = [] } = contractOption;
        const { functionFragment } = (0, contractHelpers_1.getInterfaceAndFragments)(contractOption);
        const provider = this.provider;
        const transaction = await provider.transactionBuilder.triggerSmartContract(address, functionFragment.format("sighash"), methodOverrides ? methodOverrides : {}, functionFragment.inputs.map((el, i) => ({
            type: el.type,
            value: parameters[i],
        })), signer);
        let signedTransaction = await sign(transaction.transaction);
        return signedTransaction;
    }
    async broadcastTransaction(signedTransaction, options) {
        const broadcast = await this.provider.trx.sendRawTransaction(signedTransaction);
        if (broadcast.code) {
            const err = new types_1.TronResultError(broadcast.message);
            err.code = broadcast.code;
            if (broadcast.message) {
                err.message = this.provider.toUtf8(broadcast.message);
            }
            const error = new types_1.TronResultError(err.message);
            error.code = broadcast.code;
            throw error;
        }
        if (options && options.success) {
            return await (0, contractHelpers_1.trackTransaction)(signedTransaction, this.provider, options);
        }
        return (0, contractHelpers_1.trackTransaction)(signedTransaction, this.provider, options);
    }
    /**
     * options: TransactionOptions
     * TransactionOptions = {
     *    success?: () => void;
     *    error?: (error: any) => void;
     * }
     */
    async send(signer, sign, contractOption, options) {
        const signedTransaction = await this.signTransaction(signer, sign, contractOption);
        return this.broadcastTransaction(signedTransaction, options);
    }
    get pendingQueriesLength() {
        return this.pendingQueries.length;
    }
    queryByBundle(query) {
        const key = (0, uuid_1.v4)();
        return new Promise((resolve, reject) => {
            this.addPendingQuery({
                query: Object.assign({ key }, query),
                callback: (value) => {
                    resolve(value);
                },
            });
        });
    }
    addPendingQuery(query, trigger) {
        this.pendingQueries.push(query);
        // If callback is undefined, it will be call instant.
        if (!query.callback || trigger || this.pendingQueriesLength >= 10) {
            return this.executePendingQueries();
        }
        else {
            return this.lazyExec();
        }
    }
    executePendingQueries(callback) {
        if (this.pendingQueriesLength === 0) {
            return Promise.resolve([]);
        }
        const queries = [...this.pendingQueries];
        this.pendingQueries = [];
        const cb = queries.reduce((prev, cur) => {
            prev[cur.query.key] = cur.callback;
            return prev;
        }, {});
        return (0, helper_1.executePromise)(async () => {
            // request max 5 times for multicall query
            const values = await (0, helper_1.retry)(() => this.getMultiContractValues(queries.map((el) => el.query)), 5, 1000);
            const keys = Object.keys(values);
            const cbResult = await (0, helper_1.mapSeries)(keys, async (key) => {
                const value = values[key];
                if (cb[key]) {
                    // request max 5 times for every callback
                    return await (0, helper_1.retry)(async () => await cb[key](value), 5, 1000);
                }
                else {
                    return value;
                }
            });
            if (cbResult.length === 1) {
                return cbResult[0];
            }
            return cbResult;
        }, callback);
    }
}
exports.TronContractHelper = TronContractHelper;
exports.default = TronContractHelper;
//# sourceMappingURL=contract.js.map