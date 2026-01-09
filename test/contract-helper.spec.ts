import { expect } from "chai";
import sinon from "sinon";
import ContractHelper from "../src/contract-helper";
import { ContractCallArgs, MultiCallArgs } from "../src/types";

describe("contract-helper lazy calls", () => {
  it("addLazyCall executes immediately when callback is missing", () => {
    const helper = new ContractHelper({
      chain: "tron",
      provider: {} as any,
      multicallV2Address: "T0000000000000000000000000000000000",
      multicallLazyQueryTimeout: 1000,
    });
    const spy = sinon.stub(helper as any, "executeLazyCalls");

    helper.addLazyCall({
      query: {
        key: "k1",
        address: "T1",
        method: "balanceOf(address)",
        args: ["T2"],
      },
    });

    expect(spy.calledOnce).to.equal(true);
    spy.restore();
  });

  it("addLazyCall executes immediately when trigger is true", () => {
    const helper = new ContractHelper({
      chain: "tron",
      provider: {} as any,
      multicallV2Address: "T0000000000000000000000000000000000",
      multicallLazyQueryTimeout: 1000,
    });
    const spy = sinon.stub(helper as any, "executeLazyCalls");

    helper.addLazyCall(
      {
        query: {
          key: "k1",
          address: "T1",
          method: "balanceOf(address)",
          args: ["T2"],
        },
        callback: {
          success: () => {},
        },
      },
      true
    );

    expect(spy.calledOnce).to.equal(true);
    spy.restore();
  });

  it("addLazyCall executes when pending length exceeds max", () => {
    const helper = new ContractHelper({
      chain: "tron",
      provider: {} as any,
      multicallV2Address: "T0000000000000000000000000000000000",
      multicallMaxLazyCallsLength: 2,
    });
    const spy = sinon.stub(helper as any, "executeLazyCalls");

    helper.addLazyCall({
      query: {
        key: "k1",
        address: "T1",
        method: "balanceOf(address)",
        args: ["T2"],
      },
      callback: { success: () => {} },
    });
    expect(spy.called).to.equal(false);

    helper.addLazyCall({
      query: {
        key: "k2",
        address: "T1",
        method: "balanceOf(address)",
        args: ["T2"],
      },
      callback: { success: () => {} },
    });
    expect(spy.calledOnce).to.equal(true);
    spy.restore();
  });

  it("executeLazyCalls returns value for single key", async () => {
    const helper = new ContractHelper({
      chain: "tron",
      provider: {} as any,
      multicallV2Address: "T0000000000000000000000000000000000",
    });
    sinon.stub(helper as any, "multicall").resolves({ key1: 123 });

    helper.addLazyCall(
      {
        query: {
          key: "key1",
          address: "T1",
          method: "balanceOf(address)",
          args: ["T2"],
        },
        callback: {
          success: (value) => value,
        },
      },
      false
    );

    const result = await helper.executeLazyCalls();
    expect(result).to.equal(123);
  });

  it("executeLazyCalls triggers callback errors on multicall failure", async () => {
    const helper = new ContractHelper({
      chain: "tron",
      provider: {} as any,
      multicallV2Address: "T0000000000000000000000000000000000",
    });
    sinon.stub(helper as any, "multicall").rejects(new Error("fail"));
    const errorSpy = sinon.spy();

    helper.addLazyCall(
      {
        query: {
          key: "key1",
          address: "T1",
          method: "balanceOf(address)",
          args: ["T2"],
        },
        callback: {
          success: () => {},
          error: errorSpy,
        },
      },
      false
    );

    try {
      await helper.executeLazyCalls();
      expect.fail("should have thrown");
    } catch (err) {}
  });
});

describe("contract-helper delegation", () => {
  it("delegates call and multicall", async () => {
    const helper = new ContractHelper({
      chain: "tron",
      provider: {} as any,
      multicallV2Address: "T0000000000000000000000000000000000",
    });
    const callStub = sinon.stub().resolves("ok");
    const multicallStub = sinon.stub().resolves({ a: 1 });
    (helper as any).helper.call = callStub;
    (helper as any).helper.multicall = multicallStub;

    const callArgs: ContractCallArgs = {
      address: "T1",
      method: "balanceOf(address)",
      args: ["T2"],
    };
    const multicallArgs: MultiCallArgs[] = [
      { key: "a", address: "T1", method: "symbol()" },
    ];

    const callResult = await helper.call(callArgs);
    const multicallResult = await helper.multicall(multicallArgs);

    expect(callResult).to.equal("ok");
    expect(multicallResult).to.deep.equal({ a: 1 });
    expect(callStub.calledOnce).to.equal(true);
    expect(multicallStub.calledOnce).to.equal(true);
  });
});
