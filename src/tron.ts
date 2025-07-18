import { TronWeb } from "tronweb";
import {
  AggregateCall,
  AggregateContractResponse,
  CONTRACT_SUCCESS,
  ContractCallArgs,
  FastTransactionResult,
  MultiCallArgs,
  SendTransaction,
  SimpleTransactionResult,
  TrxFormatValue,
} from "./types";
import {
  buildAggregateCall,
  buildUpAggregateResponse,
  formatBase58Address,
  formatHexAddress,
  transformContractCallArgs,
} from "./contract-utils";
import { ContractParamter, SignedTransaction } from "tronweb/lib/esm/types";
import { ContractHelperBase } from "./contract-helper-base";
import wait from "wait";
import { retry } from "./helper";
import BigNumber from "bignumber.js";
import { FunctionFragment } from "ethers";
import {
  BroadcastTronTransactionError,
  TransactionReceiptError,
} from "./errors";

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

export class TronContractHelper<
  Provider extends TronWeb
> extends ContractHelperBase<Provider> {
  private provider: TronWeb;
  private formatValueType: TrxFormatValue;

  constructor(
    multicallContractAddress: string,
    provider: Provider,
    formatValue: TrxFormatValue
  ) {
    super(multicallContractAddress);
    this.provider = provider;
    this.formatValueType = formatValue;
  }

  private formatToEthAddress(address: string) {
    if (TronWeb.isAddress(address)) {
      return (
        "0x" + TronWeb.address.toChecksumAddress(address).slice(2).toLowerCase()
      );
    }
    throw new Error(`${address} is invalid address.`);
  }

  /**
   * Map call contract to match contract format
   * @param calls The calls context
   */
  private mapCallContextToMatchContractFormat(calls: AggregateCall[]) {
    return calls.map((call) => [
      this.formatToEthAddress(call.target),
      call.encodedData,
    ]);
  }

  private buildAggregateCall(multiCallArgs: MultiCallArgs<Provider>[]) {
    return buildAggregateCall<Provider>(
      multiCallArgs,
      (fragment, values) => {
        const funcABI = JSON.parse(fragment.format("json"));
        const params = this.provider.utils.abi.encodeParamsV2ByABI(
          funcABI,
          values
        );
        const selector = fragment.selector;
        const encodedData = `${selector}${params.slice(2)}`;
        return encodedData;
      },
      "tron"
    );
  }

  private buildUpAggregateResponse<T>(
    multiCallArgs: MultiCallArgs<Provider>[],
    response: AggregateContractResponse
  ) {
    return buildUpAggregateResponse<Provider, T>(
      multiCallArgs,
      response,
      (fragment, data) => {
        const funcABI: FunctionFragment = JSON.parse(fragment.format("json"));
        return this.provider.utils.abi.decodeParamsV2ByABI(funcABI, data);
      },
      (value, fragment) => {
        return this.handleContractValue(value, fragment);
      },
      "tron"
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
        return this.formatValueType?.address === "checksum"
          ? TronWeb.address.toChecksumAddress(value)
          : this.formatValueType?.address === "hex"
          ? TronWeb.address.toHex(value)
          : formatBase58Address(value);
      default:
        return value;
    }
  }

  private handleContractValue<T>(
    value: any,
    functionFragment: FunctionFragment
  ) {
    const outputs = functionFragment.outputs;
    if (outputs.length === 1 && !outputs[0].name) {
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
  public async multicall<T>(calls: MultiCallArgs<Provider>[]) {
    const provider = this.provider;
    const address = this.multicallAddress;
    const contract = provider.contract(ABI, address);
    const paramters = this.mapCallContextToMatchContractFormat(
      this.buildAggregateCall(calls)
    );
    const contractResponse = await contract.aggregate(paramters).call();
    return this.buildUpAggregateResponse<T>(calls, contractResponse);
  }

  public async call<T>(contractCallArgs: ContractCallArgs<Provider>) {
    const {
      address,
      abi,
      method,
      parameters = [],
    } = transformContractCallArgs(contractCallArgs, "tron");
    const contract = this.provider.contract(abi as any, address);
    const rawResult = await contract[method.name](...parameters).call();
    const result = this.handleContractValue(rawResult, method.fragment);
    return result as T;
  }

  static async broadcastTransaction(
    provider: TronWeb,
    signedTransaction: SignedTransaction<ContractParamter>
  ) {
    const broadcast = await provider.trx.sendRawTransaction(signedTransaction);
    if (broadcast.code) {
      const err = new BroadcastTronTransactionError(broadcast.message);
      err.code = broadcast.code;
      if (broadcast.message) {
        err.message = provider.toUtf8(broadcast.message);
      }
      const error = new BroadcastTronTransactionError(err.message);
      error.code = broadcast.code;
      throw error;
    }
    return broadcast.transaction.txID;
  }

  async send(
    from: string,
    sendTransaction: SendTransaction<Provider>,
    contractOption: ContractCallArgs<Provider>
  ) {
    const {
      address,
      method,
      options,
      parameters = [],
    } = transformContractCallArgs(contractOption, "tron");
    const functionFragment = method.fragment;
    const provider = this.provider;
    const transaction = await provider.transactionBuilder.triggerSmartContract(
      address,
      functionFragment.format("sighash"),
      options ? options : {},
      functionFragment.inputs.map((el, i) => ({
        type: el.type,
        value: parameters[i],
      })),
      from
    );
    let txId = await sendTransaction(transaction.transaction, this.provider);
    return txId;
  }

  async fastCheckTransactionResult(txId: string) {
    return retry(
      async () => {
        const transaction = (await this.provider.trx.getTransaction(
          txId
        )) as any as FastTransactionResult;
        if (!transaction.ret?.length) {
          await wait(1000);
          return this.fastCheckTransactionResult(txId);
        }
        if (
          !transaction.ret.every(
            (result) => result.contractRet === CONTRACT_SUCCESS
          )
        ) {
          throw new TransactionReceiptError(
            transaction.ret
              .filter((el) => el.contractRet !== CONTRACT_SUCCESS)
              .map((el) => el.contractRet)
              .join(","),
            { txId: transaction.txID }
          );
        }
        return { txId: transaction.txID };
      },
      10,
      1000
    );
  }

  async finalCheckTransactionResult(
    txId: string
  ): Promise<SimpleTransactionResult> {
    const output = await this.provider.trx.getTransactionInfo(txId);
    if (!Object.keys(output).length) {
      await wait(3000);
      return this.finalCheckTransactionResult(txId);
    }
    const transactionInfo = {
      blockNumber: new BigNumber(output.blockNumber),
      txId: output.id,
    };

    if (output.result && output.result === "FAILED") {
      const errMsg = this.provider.toUtf8(output.resMessage);
      throw new TransactionReceiptError(errMsg, transactionInfo);
    }

    if (!Object.prototype.hasOwnProperty.call(output, "contractResult")) {
      const errMsg = "Failed to execute: " + JSON.stringify(output, null, 2);
      throw new TransactionReceiptError(errMsg, transactionInfo);
    }

    return transactionInfo;
  }
}
