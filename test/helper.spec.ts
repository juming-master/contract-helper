import { expect } from "chai";
import {
  deepClone,
  retry,
  runWithCallback,
  RetryFunction,
  runPromiseWithCallback,
} from "../src";
import sinon from "sinon";

describe("Helper", () => {
  // deepClone
  it("should deeply clone an object with value equality", async () => {
    const obj = {
      a: "",
      b: 1,
    };
    expect(deepClone(obj)).to.deep.equal(obj);
  });
  it("should clones deeply equal but non-identical object", async () => {
    const obj = {
      a: "",
      b: 1,
    };
    expect(deepClone(obj)).to.not.equal(obj);
  });
  // retry
  it("should resolve on first try", async () => {
    const fn = async () => 42;
    const result = await retry(fn, 3, 10);
    expect(result).to.equal(42);
  });

  it("should retry and eventually resolve", async () => {
    let count = 0;
    const fn = async () => {
      if (++count < 3) throw new Error("fail");
      return "success";
    };
    const result = await retry(fn, 5, 10);
    expect(result).to.equal("success");
    expect(count).to.equal(3); // 确保重试了 2 次
  });

  it("should fail after max retries", async () => {
    let count = 0;
    const fn = async () => {
      count++;
      throw new Error("always fails");
    };
    try {
      await retry(fn, 2, 10);
      throw new Error("should not reach here");
    } catch (err: any) {
      expect(err.message).to.equal("always fails");
      expect(count).to.equal(3); // 初始调用 + 2 次重试
    }
  });

  it("should wait between retries (roughly)", async function () {
    this.timeout(5000); // 允许更长时间的测试
    let attempts = 0;
    const start = Date.now();
    const fn = async () => {
      if (++attempts <= 2) throw new Error("fail");
      return "done";
    };

    await retry(fn, 2, 300); // 2次失败，应该等待2次*300ms
    const elapsed = Date.now() - start;
    expect(elapsed).to.be.gte(600); // 至少等待了 ~600ms
  });
  // run with callback
  it("should return resolved value when no callback is provided", async () => {
    const fn: RetryFunction<number> = async () => 42;
    const result = await runWithCallback(fn);
    expect(result).to.equal(42);
  });

  it("should call success callback on resolve", async () => {
    const fn: RetryFunction<string> = async () => "done";

    const success = sinon.fake();
    const error = sinon.fake();

    await runWithCallback(fn, { success, error });

    expect(success.calledOnce).to.be.true;
    expect(success.firstCall.args[0]).to.equal("done");
    expect(error.called).to.be.false;
  });

  it("should call error callback on reject", async () => {
    const errorInstance = new Error("failure");

    const fn: RetryFunction<string> = async () => {
      throw errorInstance;
    };

    const success = sinon.fake();
    const error = sinon.fake();

    try {
      await runWithCallback(fn, { success, error });
    } catch {}
    // wait for callback.error executed!
    await new Promise((resolve) => setImmediate(resolve));
    expect(success.called).to.be.false;
    expect(error.calledOnce).to.be.true;
    expect(error.firstCall.args[0]).to.equal(errorInstance);
  });

  // run promise with callback
  it("should call success callback when promise resolves", async () => {
    const success = sinon.fake();
    const error = sinon.fake();

    const p = Promise.resolve("ok");

    const result = await runPromiseWithCallback(p, { success, error });

    expect(result).to.equal("ok");

    await new Promise((r) => setImmediate(r));

    expect(success.calledOnce).to.be.true;
    expect(success.firstCall.args[0]).to.equal("ok");
    expect(error.called).to.be.false;
  });

  it("should call error callback when promise rejects", async () => {
    const success = sinon.fake();
    const error = sinon.fake();
    const errorInstance = new Error("fail");

    const p = Promise.reject(errorInstance);

    try {
      await runPromiseWithCallback(p, { success, error });
    } catch {}

    await new Promise((r) => setImmediate(r));

    expect(success.called).to.be.false;
    expect(error.calledOnce).to.be.true;
    expect(error.firstCall.args[0]).to.equal(errorInstance);
  });

  it("should call error if success callback throws", async () => {
    const errorInstance = new Error("error in success");
    const success = () => {
      throw errorInstance;
    };
    const error = sinon.fake();

    const value = 123;
    const result = await runPromiseWithCallback(Promise.resolve(value), {
      success,
      error,
    });

    expect(result).to.equal(value);
    expect(error.calledOnce).to.be.true;
    expect(error.firstCall.args[0]).to.equal(errorInstance);
  });

  it("should call error on promise reject and rethrow", async () => {
    const errorInstance = new Error("failure");
    const success = sinon.fake();
    const error = sinon.fake();

    const promise = Promise.reject(errorInstance);

    try {
      await runPromiseWithCallback(promise, { success, error });
      throw new Error("Should not reach here");
    } catch (err) {
      expect(err).to.equal(errorInstance);
      expect(success.called).to.be.false;
      expect(error.calledOnce).to.be.true;
      expect(error.firstCall.args[0]).to.equal(errorInstance);
    }
  });

  it("should rethrow original error if error callback throws", async () => {
    const originalError = new Error("original failure");
    const errorCallback = () => {
      throw new Error("error in error callback");
    };

    try {
      await runPromiseWithCallback(Promise.reject(originalError), {
        error: errorCallback,
      });
      throw new Error("Should not reach here");
    } catch (err) {
      expect(err).to.equal(originalError);
    }
  });

});
