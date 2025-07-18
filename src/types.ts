import { InterfaceAbi, TransactionLike, Provider as EthProvider } from "ethers";
import { TronWeb as TronProvider } from "tronweb";
import BigNumber from "bignumber.js";
import {
  ContractParamter,
  TransactionContract,
  TriggerSmartContractOptions,
} from "tronweb/lib/esm/types";
import { PromiseCallback } from "./helper";
import { TransactionRequest as EthTransactionRequest } from "ethers";
import { Transaction as TronTransactionRequest } from "tronweb/lib/esm/types";
import { TransactionReceiptError } from "./errors";

export {
  TransactionRequest as EthTransactionRequest,
  TransactionResponse as EthTransactionResponse,
  Provider as EthProvider,
  Signer as EthSigner,
} from "ethers";

export {
  Transaction as TronTransactionRequest,
  SignedTransaction as TronTransactionResponse,
} from "tronweb/lib/esm/types";

export { TronWeb as TronProvider } from "tronweb";
export { TronWeb as TronSigner } from "tronweb";

export type TronContractCallOptions = TriggerSmartContractOptions;
export type EthContractCallOptions = Omit<
  TransactionLike,
  "to" | "from" | "nonce" | "data" | "chainId" | "type"
>;

export interface ContractCallArgs<Provider extends TronProvider | EthProvider> {
  address: string;
  abi?: InterfaceAbi;
  method: string;
  parameters?: Array<any>;
  options?: Provider extends TronProvider
    ? TronContractCallOptions
    : EthContractCallOptions;
}

export type MultiCallArgs<Provider extends TronProvider | EthProvider> = Omit<
  ContractCallArgs<Provider>,
  "options"
> & {
  key: string;
};

export interface Call {
  /**
   * your contract method name
   */
  methodName: string;

  /**
   * Method parameters you want it to pass in
   */
  // tslint:disable-next-line: no-any
  methodParameters: any[];
}

// tslint:disable-next-line: no-any
export interface ContractCall<TContext = any> {
  /**
   * Reference to this contract call context
   */
  key: string;

  /**
   * The contract address
   */
  address: string;

  /**
   * The abi for the contract
   */
  // tslint:disable-next-line: no-any
  abi: InterfaceAbi;

  /**
   * All the calls you want to do for this contract
   */
  call: Call;

  /**
   * Store any context or state in here so you don't need
   * to look back over arrays once you got the result back.
   */
  // tslint:disable-next-line: no-any
  context?: TContext | undefined;
}

export interface CallReturnContext extends Call {
  // tslint:disable-next-line: no-any
  returnValue: any;
  /**
   * This stats if it could decode the result or not
   */
  decoded: boolean;

  /**
   * If this context was successful, this will always be try
   * if you dont use the try aggregate logic
   */
  success: boolean;
}

export interface ContractCallResults {
  results: { [key: string]: ContractCallReturnContext };
  blockNumber: BigNumber;
}

export interface ContractCallReturnContext {
  originalContractCallContext: ContractCall;
  callReturnContext: CallReturnContext;
}

export interface AggregateCall {
  contractCallIndex: number;
  target: string;
  encodedData: string;
}

export interface AggregateContractResponse {
  blockNumber: BigNumber;
  returnData: string[];
}

export interface AggregateResponse {
  blockNumber: BigNumber;
  results: Array<{
    contractCallIndex: number;
    methodResult: any;
  }>;
}

export interface EthSendTransaction {
  (
    tx: EthTransactionRequest,
    provider: EthProvider,
    isTron: false
  ): Promise<string>;
}

export interface TronSendTransaction {
  (
    tx: TronTransactionRequest,
    provider: TronProvider,
    isTron: true
  ): Promise<string>;
}

export type SendTransaction<Provider extends TronProvider | EthProvider> =
  Provider extends TronProvider ? TronSendTransaction : EthSendTransaction;

export const CONTRACT_SUCCESS = "SUCCESS";

export interface FastTransactionResult<T = ContractParamter> {
  txID: string;
  signature: string[];
  ret?: {
    contractRet: string;
  }[];
  raw_data: {
    contract: TransactionContract<T>[];
    ref_block_bytes: string;
    ref_block_hash: string;
    expiration: number;
    timestamp: number;
    data?: unknown;
    fee_limit?: unknown;
  };
  raw_data_hex: string;
}

export interface SimpleTransactionResult {
  blockNumber?: BigInt;
  txId: string;
}

export enum CheckTransactionType {
  Fast = "fast",
  Final = "final",
}

export type TransactionOption = {
  check?: CheckTransactionType;
  success?: (transactionInfo: SimpleTransactionResult) => void;
  error?: (error: TransactionReceiptError) => void;
};

export interface ContractCallback<T> {
  success: (value: T) => Promise<any> | void;
  error?: (error: any) => void;
}

export interface ContractQuery<
  Provider extends TronProvider | EthProvider,
  T = any
> {
  query: MultiCallArgs<Provider>;
  callback?: ContractCallback<T>;
}

export type ContractQueryCallback<T = any> = PromiseCallback<T>;

export type ContractQueryTrigger<T = any> = ContractQueryCallback<T> | boolean;

export interface TrxFormatValue {
  address?: "base58" | "checksum" | "hex"; // default base58
  uint?: "bigint" | "bignumber"; // default bignumber
}

export interface EthFormatValue {
  address?: "checksum" | "hex"; //default checksum
  uint?: "bigint" | "bignumber"; //default bignumber
}

export type ContractHelperOptions<Provider extends TronProvider | EthProvider> =
  {
    provider: Provider;
    multicallV2Address: string;
    multicallLazyQueryTimeout?: number;
    multicallMaxLazyCallsLength?: number;
    simulateBeforeSend?: boolean;
    formatValue?: Provider extends TronProvider
      ? TrxFormatValue
      : EthFormatValue;
  };
