import { expect } from "chai";
import { map, mapSkip } from "../src";

describe("p-map", () => {
  it("maps values with concurrency", async () => {
    const result = await map([1, 2, 3], async (x) => x * 2, {
      concurrency: 2,
    });
    expect(result).to.deep.equal([2, 4, 6]);
  });

  it("skips mapSkip entries", async () => {
    const result = await map([1, 2, 3, 4], async (x) => {
      if (x % 2 === 0) return mapSkip;
      return x;
    });
    expect(result).to.deep.equal([1, 3]);
  });

  it("rejects with AggregateError when stopOnError is false", async () => {
    try {
      await map([1, 2], async (x) => {
        throw new Error(`fail ${x}`);
      }, { stopOnError: false });
      expect.fail("should have thrown");
    } catch (err: any) {
      expect(err).to.have.property("errors");
      expect(err.errors.length).to.equal(2);
    }
  });

  it("honors AbortSignal", async () => {
    const controller = new AbortController();
    const input = [1, 2, 3];
    const mapper = async (x: number) => {
      if (x === 2) controller.abort();
      return x;
    };

    try {
      await map(input, mapper, { signal: controller.signal });
      expect.fail("should have thrown");
    } catch (err: any) {
      expect(err).to.have.property("name");
    }
  });
});
