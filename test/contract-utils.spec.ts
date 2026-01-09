import { expect } from "chai";
import { FunctionFragment, Interface, getAddress } from "ethers";
import {
  buildAggregateCall,
  buildUpAggregateResponse,
  findFragmentFromAbi,
  formatBase58Address,
  formatToEthAddress,
  transformContractCallArgs,
} from "../src/contract-utils";
import {
  ContractAddressNotProvidedError,
  ContractMethodNotProvidedError,
} from "../src/errors";

const sampleAbi = [
  "function foo(uint256 a, address b) view returns (bool success, uint256 result)",
  "function bar() view returns (uint256)",
];

describe("contract-utils", () => {
  it("formats base58 and eth addresses", () => {
    const base58 = "TPoYNMEiYhnqhW2go2paY8Z6uNYfEQMjQK";
    const tronHex = "4197BDC4A77898E79F09066D1B2E52314760910BE6";
    const ethAddress = "0x4838b106fce9647bdf1e7877bf73ce8b0bad5f97";

    expect(formatBase58Address("123")).to.equal("123");
    expect(formatBase58Address(base58)).to.equal(base58);
    expect(formatBase58Address(tronHex)).to.equal(base58);

    expect(formatToEthAddress("123")).to.equal("123");
    expect(formatToEthAddress(base58)).to.equal(
      "0x97BDc4a77898e79F09066d1b2e52314760910be6"
    );
    expect(formatToEthAddress(tronHex)).to.equal(
      "0x97BDc4a77898e79F09066d1b2e52314760910be6"
    );
    expect(formatToEthAddress(ethAddress)).to.equal(
      "0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97"
    );
  });

  it("transforms contract call args", () => {
    const result = transformContractCallArgs(
      {
        address: "0x1234",
        abi: sampleAbi,
        method: "foo",
        args: [1, "0x0000000000000000000000000000000000000000"],
      },
      "evm"
    );
    expect(result.method.name).to.equal("foo");
  });

  it("transforms when method is full signature without abi", () => {
    const result = transformContractCallArgs(
      {
        address: "0x1234",
        method: "function bar() view returns (uint256)",
      },
      "evm"
    );
    expect(result.method.name).to.equal("bar");
  });

  it("transforms with formats tron addresses when network is tron", () => {
    const tronHex = "4197BDC4A77898E79F09066D1B2E52314760910BE6";
    const result = transformContractCallArgs(
      {
        address: tronHex,
        method: "function bar() view returns (uint256)",
      },
      "tron"
    );
    expect(result.address).to.equal("TPoYNMEiYhnqhW2go2paY8Z6uNYfEQMjQK");
  });

  it("transforms with throws when address is missing", () => {
    expect(() =>
      transformContractCallArgs(
        {
          address: "" as any,
          method: "bar()",
        },
        "evm"
      )
    ).to.throw(ContractAddressNotProvidedError);
  });

  it("transforms with throws when method is missing", () => {
    expect(() =>
      transformContractCallArgs(
        {
          address: "0x1234",
          method: "" as any,
        },
        "evm"
      )
    ).to.throw(ContractMethodNotProvidedError);
  });

  it("transforms with throws when method is invalid and no abi", () => {
    expect(() =>
      transformContractCallArgs(
        {
          address: "0x1234",
          method: "not a function",
        },
        "evm"
      )
    ).to.throw();
  });

  it("finds function fragment", () => {
    const fragment = findFragmentFromAbi({
      key: "k",
      address: "0x0000000000000000000000000000000000000000",
      abi: sampleAbi,
      call: {
        methodName: "bar",
        methodParameters: [],
      },
    });
    expect(fragment).to.be.instanceOf(FunctionFragment);
  });

  it("returns null when method does not exist", () => {
    const fragment = findFragmentFromAbi({
      key: "k2",
      address: "0x0000000000000000000000000000000000000000",
      abi: sampleAbi,
      call: {
        methodName: "baz",
        methodParameters: [],
      },
    });
    expect(fragment).to.equal(null);
  });

  it("trims method name before lookup", () => {
    const fragment = findFragmentFromAbi({
      key: "k3",
      address: "0x0000000000000000000000000000000000000000",
      abi: sampleAbi,
      call: {
        methodName: "  bar  ",
        methodParameters: [],
      },
    });
    expect(fragment?.name).to.equal("bar");
  });

  it("supports full function signature in methodName", () => {
    const fragment = findFragmentFromAbi({
      key: "k4",
      address: "0x0000000000000000000000000000000000000000",
      abi: sampleAbi,
      call: {
        methodName: "function foo(uint256,address) view returns (bool,uint256)",
        methodParameters: [1, "0x0000000000000000000000000000000000000000"],
      },
    });
    expect(fragment?.name).to.equal("foo");
  });

  it("builds aggregate calls", () => {
    const iface = new Interface(sampleAbi);
    const result = buildAggregateCall(
      [
        {
          key: "a",
          address: "0x0000000000000000000000000000000000000001",
          method: iface.getFunction("bar")!.format("minimal"),
          args: [],
        },
      ],
      (fragment, values) => `${fragment.name}(${values.join(",")})`,
      "evm"
    );

    expect(result[0]).to.deep.equal({
      contractCallIndex: 0,
      target: getAddress("0x0000000000000000000000000000000000000001"),
      encodedData: "bar()",
    });
  });

  it("builds aggregate calls for multiple entries with checksummed targets", () => {
    const iface = new Interface(sampleAbi);
    const result = buildAggregateCall(
      [
        {
          key: "a",
          address: "0x0000000000000000000000000000000000000001",
          method: iface.getFunction("foo")!.format("minimal"),
          args: [1, "0x0000000000000000000000000000000000000002"],
        },
        {
          key: "b",
          address: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
          method: iface.getFunction("bar")!.format("minimal"),
          args: [],
        },
      ],
      (fragment, values) => `${fragment.name}(${values.join(",")})`,
      "evm"
    );

    expect(result).to.deep.equal([
      {
        contractCallIndex: 0,
        target: getAddress("0x0000000000000000000000000000000000000001"),
        encodedData:
          "foo(1,0x0000000000000000000000000000000000000002)",
      },
      {
        contractCallIndex: 1,
        target: getAddress("0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"),
        encodedData: "bar()",
      },
    ]);
  });

  it("builds aggregate calls for tron network with base58 targets", () => {
    const iface = new Interface(sampleAbi);
    const tronHex = "4197BDC4A77898E79F09066D1B2E52314760910BE6";
    const result = buildAggregateCall(
      [
        {
          key: "a",
          address: tronHex,
          method: iface.getFunction("bar")!.format("minimal"),
          args: [],
        },
      ],
      () => "bar()",
      "tron"
    );

    expect(result[0].target).to.equal("TPoYNMEiYhnqhW2go2paY8Z6uNYfEQMjQK");
  });

  it("builds aggregate responses", () => {
    const response = {
      blockNumber: 1 as any,
      returnData: ["0x01"],
    };

    const result = buildUpAggregateResponse(
      [
        {
          key: "a",
          address: "0x0000000000000000000000000000000000000001",
          method: "bar",
          args: [],
          abi: sampleAbi,
        },
      ],
      response,
      () => ["1"],
      (value: any) => value,
      "evm"
    );

    expect(result).to.deep.equal({ a: "1" });
  });

  it("builds aggregate responses for multiple calls", () => {
    const response = {
      blockNumber: 1 as any,
      returnData: ["0x01", "0x02"],
    };

    const result = buildUpAggregateResponse(
      [
        {
          key: "a",
          address: "0x0000000000000000000000000000000000000001",
          method: "foo",
          args: [1, "0x0000000000000000000000000000000000000002"],
          abi: sampleAbi,
        },
        {
          key: "b",
          address: "0x0000000000000000000000000000000000000003",
          method: "bar",
          args: [],
          abi: sampleAbi,
        },
      ],
      response,
      (fragment) => {
        if (fragment.name === "foo") return [true, "99"];
        return ["7"];
      },
      (value: any) => value,
      "evm"
    );

    expect(result).to.deep.equal({ a: [true, "99"], b: "7" });
  });

  it("unwraps single unnamed output", () => {
    const abi = ["function baz() view returns (uint256)"];
    const response = {
      blockNumber: 1 as any,
      returnData: ["0x01"],
    };

    const result = buildUpAggregateResponse(
      [
        {
          key: "a",
          address: "0x0000000000000000000000000000000000000001",
          method: "baz",
          args: [],
          abi,
        },
      ],
      response,
      () => ["42"],
      (value: any) => value,
      "evm"
    );

    expect(result).to.deep.equal({ a: "42" });
  });
});
