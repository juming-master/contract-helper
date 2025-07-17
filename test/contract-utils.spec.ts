import { expect } from "chai";
import { formatBase58Address, formatToEthAddress } from "../src";
import { ethers, FunctionFragment, getAddress, Interface } from "ethers";
import {
  transformContractCallArgs,
  findFragmentFromAbi,
  buildAggregateCall,
  buildUpAggregateResponse,
} from "../src/contract-utils";
import {
  MultiCallArgs,
  AggregateContractResponse,
  ContractCall,
} from "../src/types";
import BigNumber from "bignumber.js";
import { BytesLike } from "ethers";

describe("ContractHelperUtils", () => {
  it("formatBase58Address", async () => {
    // invalid address
    expect(formatBase58Address("123456abc")).to.equal("123456abc");
    // base58 address
    expect(formatBase58Address("TPoYNMEiYhnqhW2go2paY8Z6uNYfEQMjQK")).to.equal(
      "TPoYNMEiYhnqhW2go2paY8Z6uNYfEQMjQK"
    );
    // hex address
    expect(
      formatBase58Address("4197BDC4A77898E79F09066D1B2E52314760910BE6")
    ).to.equal("TPoYNMEiYhnqhW2go2paY8Z6uNYfEQMjQK");
  });
  it("formatToEthAddress", async () => {
    // invalid address
    expect(formatToEthAddress("123456abc")).to.equal("123456abc");
    // base58 address
    expect(formatToEthAddress("TPoYNMEiYhnqhW2go2paY8Z6uNYfEQMjQK")).to.equal(
      "0x97BDc4a77898e79F09066d1b2e52314760910be6"
    );
    // tron hex address
    expect(
      formatToEthAddress("4197BDC4A77898E79F09066D1B2E52314760910BE6")
    ).to.equal("0x97BDc4a77898e79F09066d1b2e52314760910be6");
    // eth address
    expect(
      formatToEthAddress("0x4838b106fce9647bdf1e7877bf73ce8b0bad5f97")
    ).to.equal("0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97");
  });
});

describe("ContractHelperUtils internal methods", () => {
  const sampleAbi = [
    "function foo(uint256 a, address b) view returns (bool success, uint256 result)",
    "function bar() view returns (uint256)",
  ];

  const sampleFragment = ethers.FunctionFragment.from(
    "function foo(uint256 a, address b) view returns (bool success, uint256 result)"
  );

  describe("transformContractCallArgs", () => {
    it("should parse with method name and ABI", () => {
      const input = {
        address: "0x1234",
        abi: sampleAbi,
        method: "foo",
        parameters: [42, "0x0000000000000000000000000000000000000000"],
      };
      const result = transformContractCallArgs(input, "eth");
      expect(result.address).to.equal("0x1234");
      expect(result.method.name).to.equal("foo");
      expect(result.parameters).to.deep.equal([
        42,
        "0x0000000000000000000000000000000000000000",
      ]);
    });

    it("should parse with method signature string and ABI optional", () => {
      const input = {
        address: "0x1234",
        method: "foo(uint256,address)",
        parameters: [42, "0x0000000000000000000000000000000000000000"],
      };
      const result = transformContractCallArgs(input, "eth");
      expect(result.method.fragment.format("sighash")).to.equal(
        sampleFragment.format("sighash")
      );
    });

    it("should throw if method not found in ABI", () => {
      expect(() =>
        transformContractCallArgs(
          {
            address: "0x1234",
            abi: sampleAbi,
            method: "nonexistent",
          },
          "eth"
        )
      ).to.throw();
    });
  });

  describe("findFragmentFromAbi", () => {
    it("should find FunctionFragment by methodName in call", () => {
      const contractCallContext = {
        key: "1",
        address: "0x1234567890123456789012345678901234567890",
        abi: sampleAbi,
        call: {
          methodName: "foo",
          methodParameters: [42, "0x0000000000000000000000000000000000000001"],
        },
      };

      const fragment = findFragmentFromAbi(contractCallContext);

      expect(fragment).to.be.instanceOf(FunctionFragment);
      expect(fragment?.name).to.equal("foo");
      expect(fragment?.inputs.length).to.equal(2);
    });

    it("should find null if methodName not found", () => {
      const contractCallContext = {
        key: "2",
        address: "0x1234567890123456789012345678901234567890",
        abi: sampleAbi,
        call: {
          methodName: "nonexistent",
          methodParameters: [],
        },
      };
      expect(findFragmentFromAbi(contractCallContext)).to.be.null;
    });

    it("should trim methodName before searching", () => {
      const contractCallContext = {
        key: "3",
        address: "0x1234567890123456789012345678901234567890",
        abi: sampleAbi,
        call: {
          methodName: "  bar  ",
          methodParameters: [],
        },
      };

      const fragment = findFragmentFromAbi(contractCallContext);

      expect(fragment?.name).to.equal("bar");
    });

    it("should find the function fragment if methodName is full signature", () => {
      const contractCall = {
        key: "3",
        address: "0x0000000000000000000000000000000000000000",
        abi: sampleAbi,
        call: {
          methodName: "function bar() view returns (uint256)",
          methodParameters: [],
        },
      };

      const fragment = findFragmentFromAbi(contractCall);
      expect(fragment).to.not.be.null;
      expect(fragment?.name).to.equal("bar");
    });
  });

  describe("buildAggregateCall", () => {
    it("should build aggregate calls correctly", () => {
      // 构造测试ABI和函数签名
      const abi = [
        "function foo(uint256 a, string b) view returns (bool)",
        "function bar() view returns (uint256)",
      ];
      const iface = new Interface(abi);

      // MultiCallArgs示例
      const multiCallArgs = [
        {
          key: "foo",
          address: "0x1234567890123456789012345678901234567890",
          method: iface.getFunction("foo")!.format("sighash"),
          parameters: [42, "hello"],
        },
        {
          key: "bar",
          address: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
          method: iface.getFunction("bar")!.format("minimal"),
          parameters: [],
        },
      ];

      // encodeFunction 模拟编码逻辑
      const encodeFunction = (fragment: FunctionFragment, values: any[]) => {
        // 这里只返回 fragment.name + encoded params as string for test
        return `${fragment.name}(${values.join(",")})`;
      };

      const result = buildAggregateCall(multiCallArgs, encodeFunction, "eth");

      expect(result).to.be.an("array").with.length(2);
      expect(result[0]).to.deep.equal({
        contractCallIndex: 0,
        target: "0x1234567890123456789012345678901234567890",
        encodedData: "foo(42,hello)",
      });
      expect(result[1]).to.deep.equal({
        contractCallIndex: 1,
        target: getAddress("0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"),
        encodedData: "bar()",
      });
    });

    it("should handle empty input", () => {
      const result = buildAggregateCall([], () => "", "eth");
      expect(result).to.deep.equal([]);
    });
  });

  describe("buildUpAggregateResponse", () => {
    it("should decode and format the multicall response correctly", () => {
      const abi = [
        "function foo(uint256 a, string b) view returns (bool success)",
        "function bar() view returns (uint256)",
      ];

      const multiCallArgs = [
        {
          key: "call1",
          address: "0x1234567890123456789012345678901234567890",
          method: "foo",
          parameters: [42, "hello"],
          abi,
        },
        {
          key: "call2",
          address: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
          method: "bar",
          parameters: [],
          abi,
        },
      ];

      // 模拟 response 的 returnData 顺序对应 multiCallArgs
      const response = {
        blockNumber: new BigNumber(123456),
        returnData: ["0x01", "0x2a"], // 模拟编码数据
      };

      // decode 模拟函数，模拟解码返回值
      const decode = (fragment: FunctionFragment) => {
        if (fragment.name === "foo") {
          return ["true"]; // 模拟foo返回true
        }
        if (fragment.name === "bar") {
          return ["42"]; // 模拟bar返回42
        }
        return [""];
      };

      // format 模拟函数，直接返回解码值
      const format = (value: any, fragment: FunctionFragment) => value;

      const result = buildUpAggregateResponse(
        multiCallArgs,
        response,
        decode,
        format,
        "eth"
      );

      expect(result).to.deep.equal({
        [multiCallArgs[0].key]: ["true"],
        [multiCallArgs[1].key]: "42",
      });
    });
  });
});
