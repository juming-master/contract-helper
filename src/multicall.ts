import BigNumber from "bignumber.js";
import { FunctionFragment, Interface } from "ethers";
import { handleContractValue, formatToEthAddress } from "./contractHelpers";
import {
  AggregateCallContext,
  AggregateContractResponse,
  AggregateResponse,
  ContractCallContext,
  ContractCallResults,
  ContractCallReturnContext,
  MulticallOption,
} from "./types";

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

export class Utils {
  /**
   * Deep clone a object
   * @param object The object
   */
  public static deepClone<T>(object: T): T {
    return JSON.parse(JSON.stringify(object)) as T;
  }
}

export class Multicall {
  private options: MulticallOption;

  /**
   * MulticallOptions {
   *   provider: TronWeb;
   *   contractAddress: string;
   * }
}
   */
  constructor(options: MulticallOption) {
    this.options = options;
  }

  async call(
    _contractCallContexts: ContractCallContext[] | ContractCallContext
  ) {
    const contractCallContexts = Array.isArray(_contractCallContexts)
      ? _contractCallContexts
      : [_contractCallContexts];

    const aggregateResponse = await this.execute(
      this.buildAggregateCallContext(contractCallContexts)
    );

    const returnObject: ContractCallResults = {
      results: {},
      blockNumber: aggregateResponse.blockNumber,
    };

    for (let i = 0; i < aggregateResponse.results.length; i++) {
      const contractCallsResults = aggregateResponse.results[i];
      const originalContractCallContext =
        contractCallContexts[contractCallsResults.contractContextIndex];

      const returnObjectResult: ContractCallReturnContext = {
        originalContractCallContext: Utils.deepClone(
          originalContractCallContext
        ),
        // @ts-ignore
        callReturnContext: null,
      };

      const methodResult = contractCallsResults.methodResult;
      const originalContractCallMethodContext =
        originalContractCallContext.call;

      const functionFragment = this.findFragmentFromAbi(
        originalContractCallContext
      );
      if (functionFragment) {
        const funcABI = JSON.parse(functionFragment.format("json"));
        let result = this.options.provider.utils.abi.decodeParamsV2ByABI(
          funcABI,
          methodResult
        );
        const outputs = functionFragment.outputs;
        if (outputs.length === 1 && !outputs[0].name && result.length === 1) {
          result = result[0];
        }
        const decodedReturnValues = handleContractValue(
          result,
          functionFragment
        );
        returnObjectResult.callReturnContext = {
          returnValue: decodedReturnValues,
          decoded: true,
          methodName: originalContractCallMethodContext.methodName,
          methodParameters: originalContractCallMethodContext.methodParameters,
          success: true,
        };
      } else {
        returnObjectResult.callReturnContext = {
          returnValue: methodResult,
          decoded: false,
          methodName: originalContractCallMethodContext.methodName,
          methodParameters: originalContractCallMethodContext.methodParameters,
          success: true,
        };
      }

      returnObject.results[returnObjectResult.originalContractCallContext.key] =
        returnObjectResult;
    }
    return returnObject;
  }

  /**
   * Build aggregate call context
   * @param contractCallContexts The contract call contexts
   */
  buildAggregateCallContext(contractCallContexts: ContractCallContext[]) {
    const aggregateCallContext: AggregateCallContext[] = [];

    for (let i = 0; i < contractCallContexts.length; i++) {
      const contractContext = contractCallContexts[i];
      const methodContext = contractContext.call;
      const fragment = this.findFragmentFromAbi(contractContext);
      if (!fragment) {
        throw new Error(
          `ABI fragment is not found in ${contractContext.contractAddress}[name=${methodContext.methodName}]`
        );
      }
      const funcABI = JSON.parse(fragment.format("json"));
      const params = this.options.provider.utils.abi.encodeParamsV2ByABI(
        funcABI,
        methodContext.methodParameters
      );
      const selector = fragment.selector;
      const encodedData = `${selector}${params.slice(2)}`; // remove the 0x from params
      aggregateCallContext.push({
        contractContextIndex: i,
        target: contractContext.contractAddress,
        encodedData,
      });
    }

    return aggregateCallContext;
  }

  /**
   * Find output types from abi
   * @param abi The abi
   * @param methodName The method name
   */
  private findFragmentFromAbi<T>(
    contractCallContext: ContractCallContext<T>
  ): FunctionFragment | undefined {
    const abi = contractCallContext.abi;
    const callContext = contractCallContext.call;
    const methodName = callContext.methodName.trim();
    const parameters = callContext.methodParameters;
    const iface = new Interface(abi);
    const functionFragment = iface.getFunction(methodName);
    if (
      !functionFragment ||
      functionFragment.inputs.length !== parameters.length
    ) {
      return undefined;
    }

    return functionFragment;
  }

  /**
   * Execute the multicall contract call
   * @param calls The calls
   */
  private async execute(calls: AggregateCallContext[]) {
    const provider = this.options.provider;
    const address = this.options.contractAddress;
    const contract = provider.contract(ABI, address);
    const paramters = this.mapCallContextToMatchContractFormat(calls);
    const contractResponse = await contract.aggregate(paramters).call();
    return this.buildUpAggregateResponse(contractResponse, calls);
  }

  /**
   * Map call contract to match contract format
   * @param calls The calls context
   */
  private mapCallContextToMatchContractFormat(calls: AggregateCallContext[]) {
    return calls.map((call) => [
      formatToEthAddress(call.target),
      call.encodedData,
    ]);
  }

  /**
   * Build up the aggregated response from the contract response mapping
   * metadata from the calls
   * @param contractResponse The contract response
   * @param calls The calls
   */
  private buildUpAggregateResponse(
    contractResponse: AggregateContractResponse,
    calls: AggregateCallContext[]
  ) {
    const aggregateResponse: AggregateResponse = {
      blockNumber: new BigNumber(
        contractResponse.blockNumber.toString()
      ).toNumber(),
      results: [],
    };

    for (let i = 0; i < contractResponse.returnData.length; i++) {
      const existingResponse = aggregateResponse.results.find(
        (c) => c.contractContextIndex === calls[i].contractContextIndex
      );
      if (existingResponse) {
        existingResponse.methodResult = contractResponse.returnData[i];
      } else {
        aggregateResponse.results.push({
          methodResult: contractResponse.returnData[i],
          contractContextIndex: calls[i].contractContextIndex,
        });
      }
    }

    return aggregateResponse;
  }
}
