import { TransactionInfo } from "tronweb/lib/esm/types";
import { SimpleTransactionResult } from "../types";

export class ContractAddressNotProvidedError extends Error {
  constructor() {
    super(`Contract address is not provided.`);
  }
}
export class ContractMethodNotProvidedError extends Error {
  constructor() {
    super(`Contract method is not provided.`);
  }
}

export class ABIFunctionNotProvidedError extends Error {
  constructor(contractCall: { address: string; method: string }) {
    super(
      `ABI function is not found for method ${contractCall.method} in ${contractCall.address}, abi or full method signature is needed.`
    );
  }
}

export class BroadcastTronTransactionError extends Error {
  code: number = 0;
  error: string = "";
  transaction: string = "";
  output: TransactionInfo | null = null;
  constructor(message: string) {
    super(message);
  }
}

export class TransactionReceiptError extends Error {
  transactionInfo: SimpleTransactionResult;

  constructor(message: string, transactionInfo: SimpleTransactionResult) {
    super(message);
    this.transactionInfo = transactionInfo;
  }
}
