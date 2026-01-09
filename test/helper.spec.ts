import { expect } from "chai";
import sinon from "sinon";
import {
  deepClone,
  retry,
  runWithCallback,
  runPromiseWithCallback,
  RetryFunction,
} from "../src";

describe("helper", () => {
  describe("deepClone", () => {
    it("clones primitive values", () => {
      expect(deepClone("abc")).to.equal("abc");
      expect(deepClone(123)).to.equal(123);
      expect(deepClone(null)).to.equal(null);
    });

    it("throws on undefined", () => {
      expect(() => deepClone(undefined as any)).to.throw();
    });

    it("clones plain objects", () => {
      const obj = { a: 1, b: "x" };
      const cloned = deepClone(obj);
      expect(cloned).to.deep.equal(obj);
      expect(cloned).to.not.equal(obj);
    });

    it("clones arrays", () => {
      const arr = [1, { a: 2 }, [3]];
      const cloned = deepClone(arr);
      expect(cloned).to.deep.equal(arr);
      expect(cloned).to.not.equal(arr);
      expect(cloned[1]).to.not.equal(arr[1]);
    });

    it("clones nested objects", () => {
      const obj = { a: { b: { c: [1, 2] } } };
      const cloned = deepClone(obj);
      expect(cloned).to.deep.equal(obj);
      expect(cloned.a).to.not.equal(obj.a);
    });
  });

  describe("retry", () => {
    it("retries when fn throws synchronously", async () => {
      let count = 0;
      const fn = () => {
        count++;
        if (count < 2) {
          throw new Error("sync fail");
        }
        return Promise.resolve("ok");
      };

      const result = await retry(fn as RetryFunction<string>, 2, 1);
      expect(result).to.equal("ok");
      expect(count).to.equal(2);
    });

    it("retries the expected number of times", async () => {
      let count = 0;
      const fn = async () => {
        count++;
        throw new Error("fail");
      };

      try {
        await retry(fn, 2, 1);
        expect.fail("should have thrown");
      } catch (err: any) {
        expect(err.message).to.equal("fail");
        expect(count).to.equal(3);
      }
    });

    it("respects delay between retries", async function () {
      this.timeout(5000);
      let count = 0;
      const start = Date.now();
      const fn = async () => {
        count++;
        throw new Error("fail");
      };

      try {
        await retry(fn, 2, 50);
      } catch {}
      const elapsed = Date.now() - start;
      expect(elapsed).to.be.gte(100);
      expect(count).to.equal(3);
    });
  });

  describe("runWithCallback", () => {
    it("returns a promise when callback is not provided", async () => {
      const fn: RetryFunction<number> = async () => 42;
      const result = await runWithCallback(fn);
      expect(result).to.equal(42);
    });

    it("invokes callback when provided", async () => {
      const fn: RetryFunction<string> = async () => "done";
      const success = sinon.fake();
      const error = sinon.fake();

      const resultPromise = runWithCallback(fn, { success, error });
      expect(resultPromise).to.be.instanceOf(Promise);
      const result = await resultPromise;

      expect(result).to.equal("done");
      expect(success.calledOnce).to.equal(true);
      expect(success.firstCall.args[0]).to.equal("done");
      expect(error.called).to.equal(false);
    });

    it("routes errors to callback.error", async () => {
      const err = new Error("boom");
      const fn: RetryFunction<string> = async () => {
        throw err;
      };
      const success = sinon.fake();
      const error = sinon.fake();

      try {
        await runWithCallback(fn, { success, error });
      } catch {}

      await new Promise((resolve) => setImmediate(resolve));
      expect(success.called).to.equal(false);
      expect(error.calledOnce).to.equal(true);
      expect(error.firstCall.args[0]).to.equal(err);
    });
  });

  describe("runPromiseWithCallback", () => {
    it("invokes success callback", async () => {
      const success = sinon.fake();
      const error = sinon.fake();

      const result = await runPromiseWithCallback(Promise.resolve("ok"), {
        success,
        error,
      });

      expect(result).to.equal("ok");
      expect(success.calledOnce).to.equal(true);
      expect(success.firstCall.args[0]).to.equal("ok");
      expect(error.called).to.equal(false);
    });

    it("invokes error callback", async () => {
      const success = sinon.fake();
      const error = sinon.fake();
      const err = new Error("fail");

      try {
        await runPromiseWithCallback(Promise.reject(err), { success, error });
      } catch {}

      expect(success.called).to.equal(false);
      expect(error.calledOnce).to.equal(true);
      expect(error.firstCall.args[0]).to.equal(err);
    });
  });
});
