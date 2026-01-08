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
  ChainType,
  ContractCall,
  ContractCallResults,
  ContractCallReturnContext,
  ContractSendArgs,
  MultiCallArgs,
} from "./types";
import { deepClone } from "./helper";
import {
  ABIFunctionNotProvidedError,
  ContractAddressNotProvidedError,
  ContractMethodNotProvidedError,
} from "./errors";
import { TronWeb } from "tronweb";

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
  method: string,
  _abi?: InterfaceAbi
) {
  let interf: Interface;
  let methodFragment: FunctionFragment | null;
  if (_abi) {
    try {
      interf = new Interface(_abi as any);
      methodFragment = interf.getFunction(method);
    } catch (e) {
      throw new ABIFunctionNotProvidedError({ address, method });
    }
  } else {
    try {
      let m = method.trim();
      const item = m.startsWith("function") ? m : `function ${m}`;
      methodFragment = FunctionFragment.from(item);
      interf = new Interface([methodFragment]);
    } catch (e) {
      throw new ABIFunctionNotProvidedError({ address, method });
    }
  }

  if (!methodFragment) {
    throw new ABIFunctionNotProvidedError({ address, method });
  }

  const abi = JSON.parse(interf.formatJson());
  const signature = methodFragment.format("full");
  const selector = dataSlice(id(signature), 0, 4);
  return {
    abi,
    selector, // "0xa9059cbb"
    signature, // "function transfer(address receipt,uint256 amount) returns (bool)"
    fragment: methodFragment, // {type: "function", name: "transfer", inputs: [...], outputs:[...]}
    name: methodFragment.name, // "transfer"
  };
};

export function transformContractCallArgs<Chain extends ChainType>(
  contractCallArgs: ContractSendArgs<Chain>,
  network: ChainType
) {
  let { address, abi, method } = contractCallArgs;
  if (!address) {
    throw new ContractAddressNotProvidedError();
  }
  if (!method) {
    throw new ContractMethodNotProvidedError();
  }
  const methodConfig = getMethodConfig(address, method, abi);
  return {
    ...contractCallArgs,
    abi: methodConfig.abi,
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
export function buildAggregateCall(
  multiCallArgs: MultiCallArgs[],
  encodeFunctionData: {
    (fragment: FunctionFragment, values: any[]): string;
  },
  network: ChainType
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
        methodParameters: transformedArgs.args || [],
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

export function buildUpAggregateResponse<T>(
  multiCallArgs: MultiCallArgs[],
  response: AggregateContractResponse,
  decodeFunctionData: { (fragment: FunctionFragment, data: BytesLike): any[] },
  handleContractValue: {
    <T>(value: any, functionFragment: FunctionFragment): T;
  },
  network: ChainType
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
        methodParameters: transformedArgs.args || [],
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
