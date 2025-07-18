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
} from "./types";
import { TransactionReceiptError } from "./errors";
import { TronWeb } from "tronweb";
import { Provider as EthProvider } from "ethers";

export interface Contract {
  multicall(calls: AggregateCall[]): AggregateContractResponse;
}

export abstract class ContractHelperBase<
  Provider extends TronWeb | EthProvider
> {
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
  abstract multicall<T>(calls: MultiCallArgs<Provider>[]): Promise<T>;

  abstract call<T>(contractOption: ContractCallArgs<Provider>): Promise<T>;

  abstract send(
    from: string,
    signTransaction: SendTransaction<Provider>,
    contractOption: ContractCallArgs<Provider>
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
      return await this.fastCheckTransactionResult(txID)
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
    return await this.finalCheckTransactionResult(txID)
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
