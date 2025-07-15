import { executePromiseAndCallback } from "./helper";
import {
  AggregateCall,
  AggregateContractResponse,
  ContractCallArgs,
  MultiCallArgs as MultiCallArgs,
  SimpleTransactionResult,
  TransactionOption,
  SignTransaction,
  CheckTransactionType,
} from "./types";
import { TransactionReceiptError } from "./errors";

export interface Contract {
  multicall(calls: AggregateCall[]): AggregateContractResponse;
}

export abstract class ContractHelperBase {
  protected multicallAddress: string;

  /**
   * @param multicallAddress MulticallV2 contract address
   */
  constructor(multicallAddress: string) {
    this.multicallAddress = multicallAddress;
  }

  /**
   * @param calls
   */
  abstract multicall<T>(calls: MultiCallArgs[]): Promise<T>;

  abstract call<T>(contractOption: ContractCallArgs): Promise<T>;

  abstract send(
    from: string,
    signTransaction: SignTransaction,
    contractOption: ContractCallArgs
  ): Promise<string>;

  abstract fastCheckTransactionResult(txID: string): Promise<string>;
  abstract finalCheckTransactionResult(
    txID: string
  ): Promise<SimpleTransactionResult>;

  public async checkTransactionResult(
    txID: string,
    options: TransactionOption = {}
  ) {
    const checkOption = options.check ?? CheckTransactionType.Final;
    if (checkOption === CheckTransactionType.Final) {
      return await this.fastCheckTransactionResult(txID)
        .then((transaction) => {
          executePromiseAndCallback<SimpleTransactionResult>(
            this.finalCheckTransactionResult(txID),
            options
          );
          return transaction;
        })
        .catch((error: TransactionReceiptError) => {
          executePromiseAndCallback<SimpleTransactionResult>(
            Promise.reject(error),
            options
          );
          throw error;
        });
    }
    return await this.finalCheckTransactionResult(txID)
      .then((transaction) => {
        executePromiseAndCallback<SimpleTransactionResult>(
          Promise.resolve(transaction),
          options
        );
        return transaction;
      })
      .catch((error: TransactionReceiptError) => {
        executePromiseAndCallback<SimpleTransactionResult>(
          Promise.reject(error),
          options
        );
        throw error;
      });
  }
}
