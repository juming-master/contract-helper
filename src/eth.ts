import {
  AggregateContractResponse,
  ContractCallArgs,
  ContractSendArgs,
  EvmFormatValue,
  EvmProvider,
  EvmRunner,
  EvmTransactionRequest,
  MultiCallArgs,
  SendOptions,
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
  FunctionFragment,
  Interface,
  JsonRpcApiProvider,
  TransactionReceipt,
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
  private chainId: bigint | null = null;

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

  private calcTransactionType(tx: EvmTransactionRequest) {
    if (tx.type !== null && tx.type !== undefined && !Number.isNaN(tx.type)) {
      return Number(tx.type);
    }
    const hasEip1559Fees =
      (tx.maxFeePerGas !== undefined && tx.maxFeePerGas !== null) ||
      (tx.maxPriorityFeePerGas !== undefined &&
        tx.maxPriorityFeePerGas !== null);
    if (hasEip1559Fees) {
      return 2; // Type 2 (EIP-1559)
    }
    const hasLegacyGasPrice = tx.gasPrice !== undefined && tx.gasPrice !== null;
    if (hasLegacyGasPrice) {
      // 检查 accessList 字段是否存在，如果存在且不为空，则为 Type 1
      const hasAccessList =
        tx.accessList !== undefined &&
        tx.accessList !== null &&
        tx.accessList?.length;

      if (hasAccessList) {
        return 1; // Type 1 (EIP-2930)
      }

      return 0; // Type 0 (Legacy)
    }

    return 0; // Default 0, is supported by all EVM.
  }

  private hasGasParams(tx: EvmTransactionRequest) {
    const hasEip1559Fees =
      (tx.maxFeePerGas !== undefined && tx.maxFeePerGas !== null) ||
      (tx.maxPriorityFeePerGas !== undefined &&
        tx.maxPriorityFeePerGas !== null);
    if (hasEip1559Fees) {
      return true;
    }
    const hasLegacyGasPrice = tx.gasPrice !== undefined && tx.gasPrice !== null;
    return hasLegacyGasPrice;
  }

  private async getGasParams(
    tx: EvmTransactionRequest,
    ignoreFeeCalculation: boolean,
    options?: SendOptions
  ) {
    const provider = this.runner.provider!;
    const feeCalculation = this.feeCalculation;
    if (feeCalculation && !ignoreFeeCalculation) {
      return await feeCalculation({
        provider,
        tx,
        options,
      });
    }
    const estimateFeeRequired = this.getEstimatedFeeRequired(options);
    const [block, estimatedGas, feeData] = await Promise.all([
      retry(() => provider.getBlock("latest"), 5, 100),
      retry(
        async () => {
          return estimateFeeRequired
            ? await provider.estimateGas(tx)
            : undefined;
        },
        5,
        100
      ),
      retry(() => provider.getFeeData(), 5, 100),
    ]);

    const gasLimit =
      estimatedGas !== undefined ? (estimatedGas * 120n) / 100n : undefined;
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

  async createTransaction(
    from: string,
    contractOption: ContractSendArgs<"evm">,
    sendOptions?: SendOptions
  ): Promise<EvmTransactionRequest> {
    const {
      address,
      abi,
      method,
      options,
      args = [],
    } = transformContractCallArgs<"evm">(contractOption, "evm");
    const interf = new Interface(abi);
    const data = interf.encodeFunctionData(method.fragment, args);
    const provider = this.runner.provider!;
    const [chainId, nonce] = await Promise.all([
      retry(
        async () => {
          if (options?.chainId) {
            return options.chainId;
          }
          if (this.chainId === null) {
            const network = await provider.getNetwork();
            this.chainId = network.chainId;
          }
          return this.chainId;
        },
        5,
        100
      ),
      retry(
        async () => {
          if (typeof options?.nonce === "number") {
            return options.nonce;
          }
          return await provider.getTransactionCount(from, "pending");
        },
        5,
        100
      ),
    ]);
    let tx: EvmTransactionRequest = {
      ...options,
      to: address,
      data,
      nonce,
      chainId,
      from,
    };
    if (!this.hasGasParams(tx)) {
      const gasParams = await this.getGasParams(tx, false, sendOptions);
      tx = {
        ...tx,
        ...gasParams,
      };
    }
    const type = this.calcTransactionType(tx);
    tx = { ...tx, type };
    return tx;
  }

  async sendTransaction(
    transaction: EvmTransactionRequest,
    sendTransaction: SendTransaction<"evm">,
    options?: SendOptions
  ) {
    const provider = this.runner.provider!;
    if (this.simulate) {
      await provider.call(transaction);
    }
    try {
      const txId = await sendTransaction(transaction, provider, "evm");
      return txId;
    } catch (e: any) {
      const error = e.error || {};
      if (
        error.code === -32000 &&
        error.message === "transaction underpriced"
      ) {
        const gasParams = await this.getGasParams(transaction, true, options);
        let tx = { ...transaction, ...gasParams };
        const type = this.calcTransactionType(gasParams);
        tx = { ...tx, type };
        const txId = await sendTransaction(tx, provider, "evm");
        return txId;
      }
      throw e;
    }
  }

  async send(
    from: string,
    sendTransaction: SendTransaction<"evm">,
    contractOption: ContractSendArgs<"evm">,
    options?: SendOptions
  ) {
    const transaction = await this.createTransaction(
      from,
      contractOption,
      options
    );
    return await this.sendTransaction(transaction, sendTransaction, options);
  }

  private async checkReceipt(
    txId: string,
    confirmations: number
  ): Promise<TransactionReceipt> {
    const receipt = await retry(
      async () => {
        const receipt = await this.runner.provider!.waitForTransaction(
          txId,
          confirmations
        );
        if (!receipt) {
          await wait(1000);
          return this.checkReceipt(txId, confirmations);
        }
        return receipt;
      },
      10,
      1000
    );
    if (!receipt.status) {
      throw new TransactionReceiptError("Transaction execute reverted", {
        txId: txId,
        blockNumber:
          confirmations >= 5 ? BigInt(receipt.blockNumber) : undefined,
      });
    }
    return receipt;
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
