import {
  AggregateContractResponse,
  ContractCallArgs,
  ContractSendArgs,
  EvmFormatValue,
  EvmProvider,
  EvmRunner,
  EvmTransactionRequest,
  MultiCallArgs,
  SendTransaction,
  SetEvmFee,
  SimpleTransactionResult,
} from "./types";
import {
  buildAggregateCall,
  buildUpAggregateResponse,
  transformContractCallArgs,
} from "./contract-utils";
import { retry } from "./helper";
import wait from "wait";
import { ContractHelperBase } from "./contract-helper-base";
import {
  Contract,
  Eip1193Provider,
  FunctionFragment,
  Interface,
  JsonRpcApiProvider,
  TransactionReceipt,
  WebSocketProvider,
  getAddress,
  parseUnits,
} from "ethers";
import BigNumber from "bignumber.js";
import { TransactionReceiptError } from "./errors";

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

export class EthContractHelper extends ContractHelperBase<"evm"> {
  private runner: EvmRunner;
  private simulate: boolean;
  private formatValueType: EvmFormatValue;
  private feeCalculation?: SetEvmFee;

  constructor(
    multicallContractAddress: string,
    runner: EvmRunner,
    simulate: boolean,
    formatValue: EvmFormatValue,
    feeCalculation: SetEvmFee
  ) {
    super(multicallContractAddress);
    if (!runner.provider) {
      throw new Error(`EVM runner should be initialized with a provider`);
    }
    this.runner = runner;
    this.simulate = simulate;
    this.formatValueType = formatValue;
    this.feeCalculation = feeCalculation;
  }

  private buildAggregateCall(multiCallArgs: MultiCallArgs[]) {
    return buildAggregateCall(
      multiCallArgs,
      function (fragment: FunctionFragment, values?: ReadonlyArray<any>) {
        const iface = new Interface([fragment]);
        const encodedData = iface.encodeFunctionData(fragment, values);
        return encodedData;
      },
      "evm"
    );
  }

  private buildUpAggregateResponse<T>(
    multiCallArgs: MultiCallArgs[],
    response: AggregateContractResponse
  ) {
    return buildUpAggregateResponse<T>(
      multiCallArgs,
      response,
      function (fragment, data) {
        const interf = new Interface([fragment]);
        let result = interf.decodeFunctionResult(fragment, data);
        return result;
      },
      (value, fragment) => {
        return this.handleContractValue(value, fragment);
      },
      "evm"
    );
  }

  private formatValue(value: any, type: string) {
    switch (true) {
      case type.endsWith("[]"):
        const itemType = type.slice(0, -2);
        return value.map((el: any) => this.formatValue(el, itemType));
      case type.startsWith("uint"):
      case type.startsWith("int"):
        return this.formatValueType?.uint === "bigint"
          ? BigInt(value.toString())
          : new BigNumber(value.toString());
      case type === "address":
        return this.formatValueType?.address === "hex"
          ? getAddress(value).toLowerCase()
          : getAddress(value);
      default:
        return value;
    }
  }

  private handleContractValue<T>(
    value: any,
    functionFragment: FunctionFragment
  ) {
    const outputs = functionFragment.outputs;
    if (outputs && outputs.length === 1 && !outputs[0].name) {
      return this.formatValue(value, outputs[0].type);
    }
    const result: Array<any> = [];
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
  public async multicall<T>(calls: MultiCallArgs[]) {
    const multicallContract = new Contract(
      this.multicallAddress,
      ABI,
      this.runner
    );
    const multicalls = this.buildAggregateCall(calls);
    const response: AggregateContractResponse =
      await multicallContract.aggregate.staticCall(
        multicalls.map((call) => ({
          target: call.target,
          callData: call.encodedData,
        }))
      );
    return this.buildUpAggregateResponse<T>(calls, response);
  }

  public async call<T>(contractCallArgs: ContractCallArgs) {
    const {
      address,
      abi,
      method,
      args = [],
    } = transformContractCallArgs(contractCallArgs, "evm");
    const contract = new Contract(address, abi, this.runner);
    const rawResult = await contract[method.name](...args);
    const result = this.handleContractValue(rawResult, method.fragment);
    return result as T;
  }

  private maxBigInt(...args: bigint[]): bigint {
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
  private calcNextBaseFee(
    parentBaseFee: bigint,
    gasUsed: bigint,
    gasTarget: bigint
  ) {
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
  async getFastGasParamsWithPrediction(
    blocksToCheck = 10,
    priorityFeeExtraGwei = 1
  ) {
    const provider = this.runner.provider!;
    // Get the latest block to retrieve current baseFeePerGas and gas usage
    const latestBlock = await provider.getBlock("latest");
    if (
      !latestBlock?.baseFeePerGas ||
      !latestBlock?.gasUsed ||
      !latestBlock?.gasLimit
    ) {
      throw new Error(
        "Current network does not support EIP-1559 (no baseFeePerGas found)"
      );
    }
    const baseFee = latestBlock.baseFeePerGas;
    const gasUsed = latestBlock.gasUsed;
    const gasTarget = latestBlock.gasLimit / 2n;

    // Predict the next block's baseFee
    const predictedBaseFee = this.calcNextBaseFee(baseFee, gasUsed, gasTarget);

    // Fetch fee history to analyze recent priority fees
    if (
      typeof (provider as unknown as JsonRpcApiProvider).send !== "function"
    ) {
      throw new Error(`Provider dosn't support eip1193`);
    }
    const feeHistory: {
      baseFeePerBlobGas: string[];
      baseFeePerGas: string[];
      blobGasUsedRatio: number[];
      gasUsedRatio: number[];
      oldestBlock: string;
      reward: string[][];
    } = await (provider as unknown as JsonRpcApiProvider).send(
      "eth_feeHistory",
      [
        `0x${blocksToCheck.toString(16)}`, // number of blocks to check
        "latest", // end block
        [50], // use median (50th percentile) priority fee
      ]
    );

    // Flatten rewards array and convert from hex to bigint
    const priorityFees = feeHistory.reward
      .flat()
      .map((hex: string) => BigInt(hex));

    // Get the highest observed priority fee from recent history
    const historicalMaxPriority = priorityFees.length
      ? priorityFees.reduce((a, b) => (a > b ? a : b))
      : parseUnits("2", "gwei"); // default to 2 gwei if no data

    // Add extra tip to ensure fast confirmation
    const maxPriorityFeePerGas =
      historicalMaxPriority +
      parseUnits(priorityFeeExtraGwei.toString(), "gwei");

    // Total maxFee = predicted baseFee + tip
    const maxFeePerGas = predictedBaseFee + maxPriorityFeePerGas;

    return {
      baseFee: predictedBaseFee,
      maxPriorityFeePerGas,
      maxFeePerGas,
    };
  }

  private async getGasParams(tx: EvmTransactionRequest) {
    const provider = this.runner.provider!;
    const block = await provider.getBlock("latest");
    const estimatedGas = await provider.estimateGas(tx);
    const feeData = await provider.getFeeData();
    const feeCalculation = this.feeCalculation;
    if (feeCalculation) {
      return await feeCalculation({
        latestBlockBaseFeePerGas: block?.baseFeePerGas ?? undefined,
        estimatedGas,
        gasPrice: feeData.gasPrice ?? undefined,
        maxFeePerGas: feeData.maxFeePerGas ?? undefined,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? undefined,
      });
    }
    const gasLimit = (estimatedGas * 120n) / 100n;
    if (
      block?.baseFeePerGas &&
      feeData.maxFeePerGas &&
      feeData.maxPriorityFeePerGas
    ) {
      let maxFeePerGas: bigint, maxPriorityFeePerGas: bigint;
      try {
        const gas = await this.getFastGasParamsWithPrediction(10, 2);
        maxFeePerGas = gas.maxFeePerGas;
        maxPriorityFeePerGas = gas.maxPriorityFeePerGas;
      } catch (e) {
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
      gasPrice: (feeData.gasPrice! * 120n) / 100n,
    };
  }

  async send(
    from: string,
    sendTransaction: SendTransaction<"evm">,
    contractOption: ContractSendArgs<"evm">
  ) {
    const {
      address,
      abi,
      method,
      options,
      args = [],
    } = transformContractCallArgs<"evm">(contractOption, "evm");
    const provider = this.runner.provider!;
    const chainId = (await provider.getNetwork()).chainId;
    const nonce = await provider.getTransactionCount(from);
    const interf = new Interface(abi);
    const data = interf.encodeFunctionData(method.fragment, args);
    const tx: any = {
      ...options,
      to: address,
      data,
      nonce,
      chainId,
      type: 2,
      from,
    };
    let txParams = { ...tx };
    try {
      const gasParams = await this.getGasParams(tx);
      txParams = { ...gasParams, ...tx };
    } catch (e: any) {
      console.error(e.message);
    }
    if (this.simulate) {
      try {
        await provider.call({ ...txParams, from });
      } catch (err: any) {
        console.error(err);
        throw err;
      }
    }
    const txId = await sendTransaction({ ...txParams }, provider, "evm");
    return txId;
  }

  private async checkReceipt(
    txId: string,
    confirmations: number
  ): Promise<TransactionReceipt> {
    return retry(
      async () => {
        const receipt = await this.runner.provider!.waitForTransaction(
          txId,
          confirmations
        );
        if (!receipt) {
          await wait(1000);
          return this.checkReceipt(txId, confirmations);
        }
        if (!receipt.status) {
          throw new TransactionReceiptError("Transaction execute reverted", {
            txId: txId,
            blockNumber:
              confirmations >= 5 ? BigInt(receipt.blockNumber) : undefined,
          });
        }
        return receipt;
      },
      10,
      1000
    );
  }

  public async finalCheckTransactionResult(
    txId: string
  ): Promise<SimpleTransactionResult> {
    const receipt = await this.checkReceipt(txId, 5);
    return {
      blockNumber: BigInt(receipt.blockNumber),
      txId: receipt.hash,
    };
  }

  public async fastCheckTransactionResult(txId: string) {
    const receipt = await this.checkReceipt(txId, 0);
    return { txId: receipt.hash };
  }
}
