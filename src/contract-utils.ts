import { TronWeb } from "tronweb";
import {
  BytesLike,
  dataSlice,
  FunctionFragment,
  getAddress,
  id,
  Interface,
  InterfaceAbi,
  isAddress,
} from "ethers";
import {
  AggregateCall,
  AggregateContractResponse,
  ContractCall,
  ContractCallArgs,
  ContractCallResults,
  ContractCallReturnContext,
  EthProvider,
  MultiCallArgs,
} from "./types";
import { deepClone } from "./helper";
import {
  ABIFunctionNotProvidedError,
  ContractAddressNotProvidedError,
  ContractMethodNotProvidedError,
} from "./errors";

/**
 * Convert a Tron hex address or base58 address to a base58 address.
 */
export function formatBase58Address(address: string) {
  if (!TronWeb.isAddress(address)) {
    return address;
  }
  return TronWeb.address.fromHex(TronWeb.address.toChecksumAddress(address));
}

/**
 * Convert a Tron hex address or base58 address to a hex address.
 */
export const formatHexAddress = function (address: string) {
  if (!TronWeb.isAddress(address)) {
    return address;
  }
  return TronWeb.address.toChecksumAddress(address);
};

/**
 * Convert a Tron hex address or base58 address or eth address to a formatted hex address.
 */
export const formatToEthAddress = function (address: string) {
  if (TronWeb.isAddress(address)) {
    return getAddress("0x" + formatHexAddress(address).slice(2));
  }
  if (isAddress(address)) {
    return getAddress(address);
  }
  return address;
};

const getMethodConfig = function (
  address: string,
  abi: InterfaceAbi,
  method: string
) {
  let interf: Interface;
  try {
    interf = new Interface(abi as any);
  } catch (e) {
    throw new ABIFunctionNotProvidedError({ address, method });
  }
  const fn = interf!.getFunction(method);
  if (!fn) {
    throw new ABIFunctionNotProvidedError({ address, method });
  }
  const signature = fn.format("minimal");
  const selector = dataSlice(id(signature), 0, 4);
  return {
    selector, // "0xa9059cbb"
    signature, // "transfer(address,uint256)"
    fragment: fn, // {type: "function", name: "transfer", inputs: [...], outputs:[...]}
    name: method, // "transfer"
  };
};

export function transformContractCallArgs<
  Provider extends TronWeb | EthProvider
>(contractCallArgs: ContractCallArgs<Provider>, network: "tron" | "eth") {
  let { address, abi, method } = contractCallArgs;
  if (!address) {
    throw new ContractAddressNotProvidedError();
  }
  if (!method) {
    throw new ContractMethodNotProvidedError();
  }
  if (!abi) {
    let fragment = method.trim();
    fragment = fragment.startsWith("function")
      ? fragment
      : `function ${fragment}`;
    abi = [fragment];
  }
  const methodConfig = getMethodConfig(address, abi, method);
  return {
    ...contractCallArgs,
    abi: abi!,
    method: methodConfig,
    address:
      network === "tron"
        ? formatBase58Address(address)
        : formatToEthAddress(address),
  };
}

export function findFragmentFromAbi<T>(
  contractCallContext: ContractCall<T>
): FunctionFragment | null {
  const { abi, call } = contractCallContext;
  const { methodName } = call;
  const targetName = methodName.trim();
  const interf = new Interface(abi);
  try {
    return interf.getFunction(targetName);
  } catch {
    return null;
  }
}

/**
 * Build aggregate call context
 * @param multiCallArgs The contract call contexts
 */
export function buildAggregateCall<Provider extends TronWeb | EthProvider>(
  multiCallArgs: MultiCallArgs<Provider>[],
  encodeFunctionData: {
    (fragment: FunctionFragment, values: any[]): string;
  },
  network: "tron" | "eth"
) {
  const aggregateCalls: AggregateCall[] = [];

  for (let i = 0; i < multiCallArgs.length; i++) {
    const transformedArgs = transformContractCallArgs(
      multiCallArgs[i],
      network
    );
    const contractCall = {
      key: multiCallArgs[i].key,
      address: transformedArgs.address,
      abi: transformedArgs.abi,
      call: {
        methodName: transformedArgs.method.name,
        methodParameters: transformedArgs.parameters || [],
      },
    };
    const fragment = findFragmentFromAbi(contractCall);
    if (!fragment) {
      throw new ABIFunctionNotProvidedError({
        address: contractCall.address,
        method: contractCall.call.methodName,
      });
    }
    const encodedData = encodeFunctionData(
      fragment,
      contractCall.call.methodParameters
    );
    aggregateCalls.push({
      contractCallIndex: i,
      target: contractCall.address,
      encodedData,
    });
  }
  return aggregateCalls;
}

export function buildUpAggregateResponse<
  Provider extends TronWeb | EthProvider,
  T
>(
  multiCallArgs: MultiCallArgs<Provider>[],
  response: AggregateContractResponse,
  decodeFunctionData: { (fragment: FunctionFragment, data: BytesLike): any[] },
  handleContractValue: {
    <T>(value: any, functionFragment: FunctionFragment): T;
  },
  network: "tron" | "eth"
) {
  const returnObject: ContractCallResults = {
    results: {},
    blockNumber: response.blockNumber,
  };

  for (let i = 0; i < response.returnData.length; i++) {
    const returnData = response.returnData[i];
    const transformedArgs = transformContractCallArgs(
      multiCallArgs[i],
      network
    );
    const contractCall = {
      key: multiCallArgs[i].key,
      address: transformedArgs.address,
      abi: transformedArgs.abi,
      call: {
        methodName: transformedArgs.method.name,
        methodParameters: transformedArgs.parameters || [],
      },
    };

    const returnObjectResult: ContractCallReturnContext = {
      originalContractCallContext: deepClone(contractCall),
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
    } else {
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
      .map(
        (el) =>
          `${el.originalContractCallContext.address}:${
            el.originalContractCallContext.call.methodName
          }(${el.originalContractCallContext.call.methodParameters.join(",")})`
      )
      .join(";");
    throw new Error(`Fetch data error from multicall contract: ${methods}`);
  }
  return Object.keys(returnObject.results).reduce((prev, cur) => {
    prev[cur] = returnObject.results[cur].callReturnContext.returnValue;
    return prev;
  }, {} as T);
}
