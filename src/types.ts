import { InterfaceAbi } from "ethers";
import { TronWeb } from "tronweb";
import {
  ContractParamter,
  SignedTransaction,
  Transaction,
  TransactionContract,
  TransactionInfo,
  TriggerSmartContractOptions,
} from "tronweb/lib/esm/types";

export interface ContractOption {
  address: string;
  abi: InterfaceAbi;
  method: string;
  parameters?: Array<any>;
  methodOverrides?: TriggerSmartContractOptions;
}

export type MultiCallContractOption = Omit<
  ContractOption,
  "methodOverrides"
> & {
  key: string;
};

export interface MulticallOption {
  provider: TronWeb;
  contractAddress: string;
}

export interface CallContext {
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
export interface ContractCallContext<TContext = any> {
  /**
   * Reference to this contract call context
   */
  key: string;

  /**
   * The contract address
   */
  contractAddress: string;

  /**
   * The abi for the contract
   */
  // tslint:disable-next-line: no-any
  abi: InterfaceAbi;

  /**
   * All the calls you want to do for this contract
   */
  call: CallContext;

  /**
   * Store any context or state in here so you don't need
   * to look back over arrays once you got the result back.
   */
  // tslint:disable-next-line: no-any
  context?: TContext | undefined;
}

export interface CallReturnContext extends CallContext {
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
  blockNumber: number;
}

export interface ContractCallReturnContext {
  originalContractCallContext: ContractCallContext;
  callReturnContext: CallReturnContext;
}

export interface AggregateCallContext {
  contractContextIndex: number;
  target: string;
  encodedData: string;
}

export interface AggregateContractResponse {
  blockNumber: BigInt;
  returnData: string[];
}

export interface AggregateResponse {
  blockNumber: number;
  results: Array<{
    contractContextIndex: number;
    methodResult: any;
  }>;
}

export class TronResultError extends Error {
  code: number = 0;
  error: string = "";
  transaction: string = "";
  output: TransactionInfo | null = null;
  constructor(message: string) {
    super(message);
  }
}

export interface Wallet {
  address?: string | null;
  signTransaction(
    transaction: Transaction,
    privateKey?: string
  ): Promise<SignedTransaction>;
}

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
  blockNumber?: number;
  id: string;
}

export class TransactionError extends Error {
  transactionInfo: SimpleTransactionResult;

  constructor(message: string, transactionInfo: SimpleTransactionResult) {
    super(message);
    this.transactionInfo = transactionInfo;
  }
}

export type TransactionOption = {
  check?: "fast" | "slow";
  success?: (transactionInfo: SimpleTransactionResult) => void;
  error?: (error: any) => void;
};
