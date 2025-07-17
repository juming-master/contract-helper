import { expect } from "chai";
import { map as map, mapSkip } from "../src"; // 假设文件名是 pMap.ts

describe("pMap", () => {
  it("should map items with concurrency", async () => {
    const input = [1, 2, 3];
    const mapper = async (x: number) => {
      await new Promise((r) => setTimeout(r, 10));
      return x * 2;
    };
    const result = await map(input, mapper, { concurrency: 2 });
    expect(result).to.deep.equal([2, 4, 6]);
  });

  it("should skip items returning pMapSkip", async () => {
    const input = [1, 2, 3, 4];
    const mapper = async (x: number) => {
      if (x % 2 === 0) return mapSkip;
      return x;
    };
    const result = await map(input, mapper);
    expect(result).to.deep.equal([1, 3]);
  });

  it("should stop on error when stopOnError is true (default)", async () => {
    const input = [1, 2, 3];
    const error = new Error("fail at 2");
    const mapper = async (x: number) => {
      if (x === 2) throw error;
      return x;
    };
    try {
      await map(input, mapper);
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).to.equal(error);
    }
  });

  it("should collect all errors and reject with AggregateError when stopOnError is false", async () => {
    const input = [1, 2, 3];
    const mapper = async (x: number) => {
      if (x !== 1) throw new Error(`fail at ${x}`);
      return x;
    };

    try {
      await map(input, mapper, { stopOnError: false });
      expect.fail("should have thrown");
    } catch (err: any) {
      expect(err).to.have.property("errors");
      expect(err.errors.length).to.equal(2);
      expect(err.errors[0].message).to.equal("fail at 2");
      expect(err.errors[1].message).to.equal("fail at 3");
    }
  });

  it("should handle empty input", async () => {
    const result = await map([], async (x) => x);
    expect(result).to.deep.equal([]);
  });

  it("should support synchronous mapper functions", async () => {
    const input = [1, 2, 3];
    const result = await map(input, (x) => x * 3);
    expect(result).to.deep.equal([3, 6, 9]);
  });

  it("should abort on signal", async () => {
    const controller = new AbortController();
    const input = [1, 2, 3];
    const mapper = async (x: number) => {
      if (x === 2) controller.abort();
      await new Promise((r) => setTimeout(r, 10));
      return x;
    };
    try {
      await map(input, mapper, { signal: controller.signal });
      expect.fail("should have thrown");
    } catch (err: any) {
      expect(err.name).to.equal("AbortError");
    }
  });

  it("should preserve input order even if mapper resolves out of order", async () => {
    const input = [1, 2, 3, 4, 5];
    const resultOrder: number[] = [];

    const mapper = async (x: number) => {
      const delay = x % 2 === 1 ? 50 : 10;
      await new Promise((r) => setTimeout(r, delay));
      resultOrder.push(x);
      return x * 10;
    };

    const result = await map(input, mapper, { concurrency: 5 });
    expect(resultOrder).to.not.deep.equal(input);
    expect(result).to.deep.equal([10, 20, 30, 40, 50]);
  });
});
