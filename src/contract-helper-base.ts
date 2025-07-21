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

  abstract send(
    from: string,
    sendFn: SendTransaction<Chain>,
    args: ContractSendArgs<Chain>
  ): Promise<string>;

  abstract fastCheckTransactionResult(
    txID: string
  ): Promise<SimpleTransactionResult>;

  abstract finalCheckTransactionResult(
    txID: string
  ): Promise<SimpleTransactionResult>;

  public async checkTransactionResult(
    txID: string,
    options: TransactionOption = {}
  ) {
    const checkOption = options.check ?? CheckTransactionType.Fast;
    if (checkOption === CheckTransactionType.Fast) {
      return this.fastCheckTransactionResult(txID)
        .then((transaction) => {
          runPromiseWithCallback<SimpleTransactionResult>(
            this.finalCheckTransactionResult(txID),
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
