import { expect } from "chai";
import {
  ABIFunctionNotProvidedError,
  BroadcastTronTransactionError,
  ContractAddressNotProvidedError,
  ContractMethodNotProvidedError,
  TransactionReceiptError,
} from "../src/errors";

describe("errors", () => {
  it("creates address and method errors", () => {
    expect(new ContractAddressNotProvidedError().message).to.match(/address/i);
    expect(new ContractMethodNotProvidedError().message).to.match(/method/i);
  });

  it("creates ABI function error", () => {
    const err = new ABIFunctionNotProvidedError({
      address: "0x1",
      method: "foo",
    });
    expect(err.message).to.include("foo");
  });

  it("creates broadcast error", () => {
    const err = new BroadcastTronTransactionError("fail");
    err.code = 123;
    expect(err.message).to.equal("fail");
    expect(err.code).to.equal(123);
  });

  it("creates receipt error with info", () => {
    const err = new TransactionReceiptError("bad", { txId: "tx" });
    expect(err.message).to.equal("bad");
    expect(err.transactionInfo).to.deep.equal({ txId: "tx" });
  });
});
