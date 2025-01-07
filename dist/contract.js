"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TronContractHelper = void 0;
const contractHelpers_1 = require("./contractHelpers");
const multicall_1 = require("./multicall");
const types_1 = require("./types");
class TronContractHelper {
    /**
     * @param provider - Tronweb instance
     * @param signer - Adapter, reference the @tronweb3/tronwallet-abstract-adapter
     */
    constructor(provider, signer, multicallAddress) {
        this.multicall = null;
        this.signer = null;
        this.provider = provider;
        this.signer = signer;
        if (multicallAddress) {
            this.multicall = new multicall_1.Multicall({
                provider,
                contractAddress: multicallAddress,
            });
        }
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
        (0, contractHelpers_1.validateContractOptions)(contractOption);
        const { address, abi, method, parameters = [] } = contractOption;
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
        const results = await this.multicall.call(contractOptions.map((contractOption) => {
            (0, contractHelpers_1.validateContractOptions)(contractOption);
            return {
                key: contractOption.key,
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
    /**
     * options: TransactionOptions
     * TransactionOptions = {
     *    success?: () => void;
     *    error?: (error: any) => void;
     * }
     */
    async send(contractOption, options) {
        if (!this.signer) {
            throw new Error(`The adapter parameter is not set.`);
        }
        if (!this.signer.address) {
            throw new Error(`Wallet is not connected.`);
        }
        const { address, methodOverrides, parameters = [] } = contractOption;
        const { functionFragment } = (0, contractHelpers_1.getInterfaceAndFragments)(contractOption);
        const provider = this.provider;
        const transaction = await provider.transactionBuilder.triggerSmartContract(address, functionFragment.format("sighash"), methodOverrides ? methodOverrides : {}, functionFragment.inputs.map((el, i) => ({
            type: el.type,
            value: parameters[i],
        })), this.signer.address);
        let signedTransaction = await this.signer.signTransaction(transaction.transaction);
        const broadcast = await provider.trx.sendRawTransaction(signedTransaction);
        if (broadcast.code) {
            const err = new types_1.TronResultError(broadcast.message);
            err.code = broadcast.code;
            if (broadcast.message) {
                err.message = provider.toUtf8(broadcast.message);
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
}
exports.TronContractHelper = TronContractHelper;
exports.default = TronContractHelper;
//# sourceMappingURL=contract.js.map