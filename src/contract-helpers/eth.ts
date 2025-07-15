import {
  AggregateContractResponse,
  ContractCallArgs,
  MultiCallArgs,
  SimpleTransactionResult,
} from "../types";
import {
  buildAggregateCall,
  buildUpAggregateResponse,
  transformContractCallArgs,
} from "./utils";
import { retry } from "../helper";
import wait from "wait";
import { ContractHelperBase } from "./contract-helper-base";
import {
  Contract,
  FunctionFragment,
  Interface,
  Provider,
  Transaction,
  TransactionReceipt,
  TransactionRequest,
  TransactionResponse,
  getAddress,
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

export class EthContractHelper extends ContractHelperBase {
  private provider: Provider;

  constructor(multicallContractAddress: string, provider: Provider) {
    super(multicallContractAddress);
    this.provider = provider;
  }

  private buildAggregateCall(multiCallArgs: MultiCallArgs[]) {
    return buildAggregateCall(
      multiCallArgs,
      function (fragment: FunctionFragment, values?: ReadonlyArray<any>) {
        const iface = new Interface([fragment]);
        const encodedData = iface.encodeFunctionData(fragment, values);
        return encodedData;
      }
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
        let result = interf.decodeFunctionData(fragment, data);
        return result;
      },
      (value, fragment) => {
        return this.handleContractValue(value, fragment);
      }
    );
  }

  private formatValue(value: any, type: string) {
    switch (true) {
      case type.endsWith("[]"):
        const itemType = type.slice(0, -2);
        return value.map((el: any) => this.formatValue(el, itemType));
      case type.startsWith("uint"):
      case type.startsWith("int"):
        return new BigNumber(value.toString());
      case type === "address":
        return getAddress(value);
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
    const result: Record<string, any> = {};
    for (let output of outputs) {
      result[output.name] = this.formatValue(value[output.name], output.type);
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
      this.provider
    );
    const multicalls = this.buildAggregateCall(calls);
    const response: AggregateContractResponse =
      await multicallContract.aggregate(
        multicalls.map((call) => [call.target, call.encodedData])
      );
    return this.buildUpAggregateResponse<T>(calls, response);
  }

  public async call<T>(contractCallArgs: ContractCallArgs) {
    const {
      address,
      abi,
      method,
      parameters = [],
    } = transformContractCallArgs(contractCallArgs);
    const contract = new Contract(address, abi, this.provider);
    const rawResult = await contract[method.name](...parameters);
    const result = this.handleContractValue(rawResult, method.fragment);
    return result as T;
  }

  async send(
    from: string,
    sendTransaction: { (tx: TransactionRequest): Promise<TransactionResponse> },
    contractOption: ContractCallArgs
  ) {
    const {
      address,
      abi,
      method,
      options,
      parameters = [],
    } = transformContractCallArgs(contractOption);
    const chainId = (await this.provider.getNetwork()).chainId;
    const nonce = await this.provider.getTransactionCount(from);
    const interf = new Interface(abi);
    const data = interf.encodeFunctionData(method.fragment, parameters);
    const tx = {
      ...options?.eth,
      from,
      to: address,
      data,
      nonce,
      chainId,
      type: 2,
    };
    const unsignedTx = Transaction.from(tx);
    try {
      await this.provider.call(tx);
    } catch (err: any) {
      console.error(err);
      throw err;
    }
    const transactionResponse = await sendTransaction(unsignedTx);
    const receipt = await transactionResponse.wait(1);
    return receipt!.hash;
  }

  private async checkReceipt(
    txID: string,
    confirmations: number
  ): Promise<TransactionReceipt> {
    return await retry(
      async () => {
        const receipt = await this.provider.getTransactionReceipt(txID);
        if (!receipt) {
          await wait(1000);
          return this.checkReceipt(txID, confirmations);
        }
        const receiptConfirmations = await receipt.confirmations();
        if (receiptConfirmations < confirmations) {
          await wait(1000);
          return this.checkReceipt(txID, confirmations);
        }
        if (!receipt.status) {
          throw new TransactionReceiptError("Transaction execute reverted", {
            id: txID,
          });
        }
        return receipt;
      },
      10,
      1000
    );
  }

  public async finalCheckTransactionResult(
    txID: string
  ): Promise<SimpleTransactionResult> {
    const receipt = await this.checkReceipt(txID, 5);
    return {
      blockNumber: new BigNumber(receipt.blockNumber),
      id: receipt.hash,
    };
  }

  public async fastCheckTransactionResult(txID: string): Promise<string> {
    return (await this.checkReceipt(txID, 0)).hash;
  }
}
