import { runPromiseWithCallback } from "./helper";
import {
  AggregateCall,
  AggregateContractResponse,
  ContractCallArgs,
  MultiCallArgs as MultiCallArgs,
  SimpleTransactionResult,
  TransactionOption,
  SendTransaction,
  CheckTransactionType,
  ChainType,
  ContractSendArgs,
  EvmTransactionRequest,
  TronTransactionRequest,
  SendOptions,
} from "./types";
import { TransactionReceiptError } from "./errors";

export interface Contract {
  multicall(calls: AggregateCall[]): AggregateContractResponse;
}

export abstract class ContractHelperBase<Chain extends ChainType> {
  protected multicallAddress: string;

  /**
   * @param multicallAddress MulticallV2 contract address
   */
  constructor(multicallAddress: string) {
    this.multicallAddress = multicallAddress;
  }

  abstract call<T>(contractOption: ContractCallArgs): Promise<T>;

  abstract multicall<T>(calls: MultiCallArgs[]): Promise<T>;

  abstract createTransaction(
    from: string,
    args: ContractSendArgs<Chain>,
    options?: SendOptions
  ): Promise<
    Chain extends "evm" ? EvmTransactionRequest : TronTransactionRequest
  >;

  abstract sendTransaction(
    transaction: Chain extends "evm"
      ? EvmTransactionRequest
      : TronTransactionRequest,
    sendTransaction: SendTransaction<Chain>
  ): Promise<string>;

  abstract send(
    from: string,
    sendFn: SendTransaction<Chain>,
    args: ContractSendArgs<Chain>,
    options?: SendOptions
  ): Promise<string>;

  abstract fastCheckTransactionResult(
    txID: string
  ): Promise<SimpleTransactionResult>;

  abstract finalCheckTransactionResult(
    txID: string
  ): Promise<SimpleTransactionResult>;

  protected getEstimatedFeeRequired(options?: SendOptions) {
    return options?.estimateFee ?? true;
  }

  public async checkTransactionResult(
    txID: string,
    options: TransactionOption = {}
  ) {
    const checkOption = options.check ?? CheckTransactionType.Fast;
    if (checkOption === CheckTransactionType.Fast) {
      return this.fastCheckTransactionResult(txID)
        .then((transaction) => {
          if (options.success) {
            runPromiseWithCallback<SimpleTransactionResult>(
              this.finalCheckTransactionResult(txID),
              options
            );
          }
          return transaction;
        })
        .catch((error: TransactionReceiptError) => {
          runPromiseWithCallback<SimpleTransactionResult>(
            Promise.reject(error),
            options
          );
          throw error;
        });
    }
    return this.finalCheckTransactionResult(txID)
      .then((transaction) => {
        runPromiseWithCallback<SimpleTransactionResult>(
          Promise.resolve(transaction),
          options
        );
        return transaction;
      })
      .catch((error: TransactionReceiptError) => {
        runPromiseWithCallback<SimpleTransactionResult>(
          Promise.reject(error),
          options
        );
        throw error;
      });
  }
}
