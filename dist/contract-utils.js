"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatToEthAddress = exports.formatHexAddress = void 0;
exports.formatBase58Address = formatBase58Address;
exports.transformContractCallArgs = transformContractCallArgs;
exports.findFragmentFromAbi = findFragmentFromAbi;
exports.buildAggregateCall = buildAggregateCall;
exports.buildUpAggregateResponse = buildUpAggregateResponse;
const ethers_1 = require("ethers");
const helper_1 = require("./helper");
const errors_1 = require("./errors");
const tronweb_1 = require("tronweb");
/**
 * Convert a Tron hex address or base58 address to a base58 address.
 */
function formatBase58Address(address) {
    if (!tronweb_1.TronWeb.isAddress(address)) {
        return address;
    }
    return tronweb_1.TronWeb.address.fromHex(tronweb_1.TronWeb.address.toChecksumAddress(address));
}
/**
 * Convert a Tron hex address or base58 address to a hex address.
 */
const formatHexAddress = function (address) {
    if (!tronweb_1.TronWeb.isAddress(address)) {
        return address;
    }
    return tronweb_1.TronWeb.address.toChecksumAddress(address);
};
exports.formatHexAddress = formatHexAddress;
/**
 * Convert a Tron hex address or base58 address or eth address to a formatted hex address.
 */
const formatToEthAddress = function (address) {
    if (tronweb_1.TronWeb.isAddress(address)) {
        return (0, ethers_1.getAddress)("0x" + (0, exports.formatHexAddress)(address).slice(2));
    }
    if ((0, ethers_1.isAddress)(address)) {
        return (0, ethers_1.getAddress)(address);
    }
    return address;
};
exports.formatToEthAddress = formatToEthAddress;
const getMethodConfig = function (address, method, _abi) {
    let interf;
    let methodFragment;
    if (_abi) {
        try {
            interf = new ethers_1.Interface(_abi);
            methodFragment = interf.getFunction(method);
        }
        catch (e) {
            throw new errors_1.ABIFunctionNotProvidedError({ address, method });
        }
    }
    else {
        try {
            let m = method.trim();
            const item = m.startsWith("function") ? m : `function ${m}`;
            methodFragment = ethers_1.FunctionFragment.from(item);
            interf = new ethers_1.Interface([methodFragment]);
        }
        catch (e) {
            throw new errors_1.ABIFunctionNotProvidedError({ address, method });
        }
    }
    if (!methodFragment) {
        throw new errors_1.ABIFunctionNotProvidedError({ address, method });
    }
    const abi = JSON.parse(interf.formatJson());
    const signature = methodFragment.format("full");
    const selector = (0, ethers_1.dataSlice)((0, ethers_1.id)(signature), 0, 4);
    return {
        abi,
        selector, // "0xa9059cbb"
        signature, // "function transfer(address receipt,uint256 amount) returns (bool)"
        fragment: methodFragment, // {type: "function", name: "transfer", inputs: [...], outputs:[...]}
        name: methodFragment.name, // "transfer"
    };
};
function transformContractCallArgs(contractCallArgs, network) {
    let { address, abi, method } = contractCallArgs;
    if (!address) {
        throw new errors_1.ContractAddressNotProvidedError();
    }
    if (!method) {
        throw new errors_1.ContractMethodNotProvidedError();
    }
    const methodConfig = getMethodConfig(address, method, abi);
    return {
        ...contractCallArgs,
        abi: methodConfig.abi,
        method: methodConfig,
        address: network === "tron"
            ? formatBase58Address(address)
            : (0, exports.formatToEthAddress)(address),
    };
}
function findFragmentFromAbi(contractCallContext) {
    const { abi, call } = contractCallContext;
    const { methodName } = call;
    const targetName = methodName.trim();
    const interf = new ethers_1.Interface(abi);
    try {
        return interf.getFunction(targetName);
    }
    catch {
        return null;
    }
}
/**
 * Build aggregate call context
 * @param multiCallArgs The contract call contexts
 */
function buildAggregateCall(multiCallArgs, encodeFunctionData, network) {
    const aggregateCalls = [];
    for (let i = 0; i < multiCallArgs.length; i++) {
        const transformedArgs = transformContractCallArgs(multiCallArgs[i], network);
        const contractCall = {
            key: multiCallArgs[i].key,
            address: transformedArgs.address,
            abi: transformedArgs.abi,
            call: {
                methodName: transformedArgs.method.name,
                methodParameters: transformedArgs.args || [],
            },
        };
        const fragment = findFragmentFromAbi(contractCall);
        if (!fragment) {
            throw new errors_1.ABIFunctionNotProvidedError({
                address: contractCall.address,
                method: contractCall.call.methodName,
            });
        }
        const encodedData = encodeFunctionData(fragment, contractCall.call.methodParameters);
        aggregateCalls.push({
            contractCallIndex: i,
            target: contractCall.address,
            encodedData,
        });
    }
    return aggregateCalls;
}
function buildUpAggregateResponse(multiCallArgs, response, decodeFunctionData, handleContractValue, network) {
    const returnObject = {
        results: {},
        blockNumber: response.blockNumber,
    };
    for (let i = 0; i < response.returnData.length; i++) {
        const returnData = response.returnData[i];
        const transformedArgs = transformContractCallArgs(multiCallArgs[i], network);
        const contractCall = {
            key: multiCallArgs[i].key,
            address: transformedArgs.address,
            abi: transformedArgs.abi,
            call: {
                methodName: transformedArgs.method.name,
                methodParameters: transformedArgs.args || [],
            },
        };
        const returnObjectResult = {
            originalContractCallContext: (0, helper_1.deepClone)(contractCall),
            // @ts-ignore
            callReturnContext: null,
        };
        const fragment = findFragmentFromAbi(contractCall);
        if (fragment) {
            let result = decodeFunctionData(fragment, returnData);
            const outputs = fragment.outputs;
            if (outputs.length === 1 && !outputs[0].name && result.length === 1) {
                result = result[0];
            }
            const decodedReturnValues = handleContractValue(result, fragment);
            returnObjectResult.callReturnContext = {
                returnValue: decodedReturnValues,
                decoded: true,
                methodName: contractCall.call.methodName,
                methodParameters: contractCall.call.methodParameters,
                success: true,
            };
        }
        else {
            returnObjectResult.callReturnContext = {
                returnValue: returnData,
                decoded: false,
                methodName: contractCall.call.methodName,
                methodParameters: contractCall.call.methodParameters,
                success: true,
            };
        }
        returnObject.results[returnObjectResult.originalContractCallContext.key] =
            returnObjectResult;
    }
    const resultValues = Object.values(returnObject.results);
    const filters = resultValues.filter((el) => !el.callReturnContext.success);
    if (filters.length > 0) {
        const methods = filters
            .map((el) => `${el.originalContractCallContext.address}:${el.originalContractCallContext.call.methodName}(${el.originalContractCallContext.call.methodParameters.join(",")})`)
            .join(";");
        throw new Error(`Fetch data error from multicall contract: ${methods}`);
    }
    return Object.keys(returnObject.results).reduce((prev, cur) => {
        prev[cur] = returnObject.results[cur].callReturnContext.returnValue;
        return prev;
    }, {});
}
//# sourceMappingURL=contract-utils.js.map