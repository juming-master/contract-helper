import { expect } from "chai";
import sinon from "sinon";
import { EthContractHelper } from "../src/eth";
import BigNumber from "bignumber.js";
import {
  JsonRpcProvider,
  Wallet,
  getAddress,
  hexlify,
  keccak256,
  toUtf8Bytes,
} from "ethers";
import {
  ABIFunctionNotProvidedError,
  ContractAddressNotProvidedError,
  ContractMethodNotProvidedError,
  TransactionReceiptError,
} from "../src/errors";
import { config } from "dotenv";
config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const SEPOLIA_RPC = process.env.SEPOLIA_RPC || "";

const MULTICALL = "0xf99CC4c088fdf4b2d5Fec7C4a413C147d7CB0cdF";
const ERC20 = "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238";
const MULTI_TYPES = "0x26575Ef5f2Ca0d2F3168Fd691526A537d4405040";

const ABI = [
  {
    inputs: [],
    name: "getBool",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [],
    name: "getBytes",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [],
    name: "getList",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [],
    name: "getOwner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getUser",
    outputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const buildProvider = (overrides: Partial<any> = {}) => {
  return {
    getNetwork: sinon.stub().resolves({ chainId: 11155111n }),
    getTransactionCount: sinon.stub().resolves(7),
    estimateGas: sinon.stub().resolves(21000n),
    getFeeData: sinon.stub().resolves({
      maxPriorityFeePerGas: 1n,
      gasPrice: 10n,
    }),
    getBlock: sinon.stub().resolves({
      baseFeePerGas: 100n,
      gasUsed: 100n,
      gasLimit: 200n,
    }),
    send: sinon.stub().resolves({
      baseFeePerBlobGas: [],
      baseFeePerGas: ["0x64"],
      blobGasUsedRatio: [],
      gasUsedRatio: [],
      oldestBlock: "0x0",
      reward: [["0x1"]],
    }),
    ...overrides,
  };
};

describe("eth createTransaction", () => {
  it("uses custom nonce and chainId with gasPrice/gasLimit", async () => {
    const provider = buildProvider();
    const helper = new EthContractHelper(
      MULTICALL,
      { provider } as any,
      false,
      {},
      async () => ({})
    );
    const tx = await helper.createTransaction("0xdeadbeef", {
      address: ERC20,
      method: "function approve(address,uint256)",
      args: ["0x0000000000000000000000000000000000000003", "1"],
      options: {
        nonce: 9,
        chainId: 1n,
        gasPrice: 5n,
        gasLimit: 25000n,
      },
    });

    expect(tx.nonce).to.equal(9);
    expect(tx.chainId).to.equal(1n);
    expect(tx.gasPrice).to.equal(5n);
    expect(tx.gasLimit).to.equal(25000n);
    expect(tx.type).to.equal(0);
    expect(provider.getNetwork.called).to.equal(false);
  });

  it("uses provided EIP-1559 gas params", async () => {
    const provider = buildProvider();
    const helper = new EthContractHelper(
      MULTICALL,
      { provider } as any,
      false,
      {},
      async () => ({})
    );
    const tx = await helper.createTransaction("0xdeadbeef", {
      address: ERC20,
      method: "function approve(address,uint256)",
      args: ["0x0000000000000000000000000000000000000003", "1"],
      options: {
        maxFeePerGas: 100n,
        maxPriorityFeePerGas: 2n,
        gasLimit: 30000n,
      },
    });

    expect(tx.maxFeePerGas).to.equal(100n);
    expect(tx.maxPriorityFeePerGas).to.equal(2n);
    expect(tx.gasLimit).to.equal(30000n);
    expect(tx.type).to.equal(2);
  });

  it("auto-calculates gas params when none are provided", async () => {
    const provider = buildProvider();
    const helper = new EthContractHelper(
      MULTICALL,
      { provider } as any,
      false,
      {}
    );
    const tx = await helper.createTransaction("0xdeadbeef", {
      address: ERC20,
      method: "function approve(address,uint256)",
      args: ["0x0000000000000000000000000000000000000003", "1"],
    });

    expect(tx.gasLimit).to.be.equal(25200n);
    expect(tx.maxFeePerGas).to.be.equal(2000000101n);
    expect(tx.maxPriorityFeePerGas).to.be.equal(2000000001n);
    expect(tx.type).to.equal(2);
  });

  it("auto-calculates legacy gasPrice when baseFee is missing", async () => {
    const provider = buildProvider({
      getBlock: sinon.stub().resolves({}),
    });
    const helper = new EthContractHelper(
      MULTICALL,
      { provider } as any,
      false,
      {}
    );
    const tx = await helper.createTransaction("0xdeadbeef", {
      address: ERC20,
      method: "function approve(address,uint256)",
      args: ["0x0000000000000000000000000000000000000003", "1"],
    });

    expect(tx.gasPrice).to.equal(12n);
    expect(tx.gasLimit).to.be.equal(25200n);
    expect(tx.type).to.equal(0);
  });

  it("applies feeCalculation when provided", async () => {
    const provider = buildProvider();
    const feeCalculation = sinon.stub().resolves({
      gasLimit: 30000n,
      maxFeePerGas: 200n,
      maxPriorityFeePerGas: 2n,
    });
    const helper = new EthContractHelper(
      MULTICALL,
      { provider } as any,
      false,
      {},
      feeCalculation
    );
    const tx = await helper.createTransaction("0xdeadbeef", {
      address: ERC20,
      method: "function approve(address,uint256)",
      args: ["0x0000000000000000000000000000000000000003", "1"],
    });
    expect(feeCalculation.calledOnce).to.equal(true);
    expect(tx.gasLimit).to.equal(30000n);
    expect(tx.maxFeePerGas).to.equal(200n);
    expect(tx.maxPriorityFeePerGas).to.equal(2n);
    expect(tx.type).to.equal(2);
  });

  it("passes estimateFee to feeCalculation", async () => {
    const provider = buildProvider();
    const feeCalculation = sinon.stub().resolves({
      gasLimit: 30000n,
      maxFeePerGas: 200n,
      maxPriorityFeePerGas: 2n,
    });
    const helper = new EthContractHelper(
      MULTICALL,
      { provider } as any,
      false,
      {},
      feeCalculation
    );
    await helper.createTransaction(
      "0xdeadbeef",
      {
        address: ERC20,
        method: "function approve(address,uint256)",
        args: ["0x0000000000000000000000000000000000000003", "1"],
      },
      { estimateFee: false }
    );
    expect(
      feeCalculation.calledWithMatch({
        provider,
        tx: sinon.match.any,
        options: { estimateFee: false },
      })
    ).to.equal(true);
  });

  it("does not estimate gasLimit when estimateFee is false without feeCalculation", async () => {
    const estimateGas = sinon.stub().resolves(21000n);
    const provider = buildProvider({ estimateGas });
    const helper = new EthContractHelper(
      MULTICALL,
      { provider } as any,
      false,
      {}
    );
    const tx = await helper.createTransaction(
      "0xdeadbeef",
      {
        address: ERC20,
        method: "function approve(address,uint256)",
        args: ["0x0000000000000000000000000000000000000003", "1"],
      },
      { estimateFee: false }
    );
    expect(estimateGas.called).to.equal(false);
    expect(tx.gasLimit).to.equal(undefined);
  });
});

(PRIVATE_KEY && SEPOLIA_RPC ? describe : describe.skip)(
  "eth createTransaction (real provider)",
  () => {
    const provider = new JsonRpcProvider(SEPOLIA_RPC);
    const wallet = new Wallet(PRIVATE_KEY);
    const helper = new EthContractHelper(
      MULTICALL,
      { provider } as any,
      false,
      {}
    );

    it("creates transaction with chainId and gas params resolved", async () => {
      const tx = await helper.createTransaction(wallet.address, {
        address: ERC20,
        method: "function approve(address,uint256)",
        args: [wallet.address, "1"],
      });
      expect(tx).to.have.property("chainId");
      expect(tx).to.have.property("nonce");
      expect(tx).to.have.property("gasLimit");
      expect(tx).to.have.property("type");
    });
  }
);

describe("eth input validation", () => {
  it("throws when address is missing", async () => {
    const helper = new EthContractHelper(
      MULTICALL,
      { provider: buildProvider() } as any,
      false,
      {}
    );
    try {
      await helper.call({
        address: "" as any,
        abi: ABI,
        method: "getUser",
      });
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).to.be.instanceOf(ContractAddressNotProvidedError);
    }
  });

  it("throws when method is missing", async () => {
    const helper = new EthContractHelper(
      MULTICALL,
      { provider: buildProvider() } as any,
      false,
      {},
      async () => ({})
    );
    try {
      await helper.call({
        address: MULTI_TYPES,
        abi: ABI,
        method: "" as any,
      });
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).to.be.instanceOf(ContractMethodNotProvidedError);
    }
  });

  it("throws when method is unrelated in multicall", async () => {
    const helper = new EthContractHelper(
      MULTICALL,
      { provider: buildProvider() } as any,
      false,
      {},
      async () => ({})
    );
    try {
      await helper.multicall([
        {
          key: "bad",
          address: MULTI_TYPES,
          abi: ABI,
          method: "notExist",
        },
      ]);
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).to.be.instanceOf(ABIFunctionNotProvidedError);
    }
  });
});

(PRIVATE_KEY && SEPOLIA_RPC ? describe : describe.skip)(
  "eth multicall (real provider)",
  () => {
    const provider = new JsonRpcProvider(SEPOLIA_RPC);
    const helper = new EthContractHelper(
      MULTICALL,
      { provider } as any,
      false,
      {},
      async () => ({})
    );

    it("reads bool, address, bytes32, array, and tuple in one multicall", async () => {
      const result = await helper.multicall<{
        bool: boolean;
        owner: string;
        bytes32: string;
        list: BigNumber[];
        user: any[];
        tuple: Array<any> & { owner: string; amount: BigNumber };
      }>([
        {
          key: "bool",
          address: MULTI_TYPES,
          method: "function getBool() public pure returns (bool)",
        },
        {
          key: "owner",
          address: MULTI_TYPES,
          abi: ABI,
          method: "getOwner()",
        },
        {
          key: "bytes32",
          address: MULTI_TYPES,
          abi: ABI,
          method: "getBytes()",
        },
        {
          key: "list",
          address: MULTI_TYPES,
          method: "function getList() public pure returns (uint256[] memory)",
        },
        {
          key: "user",
          address: MULTI_TYPES,
          method: "function getUser() public view returns (address, uint256)",
        },
        {
          key: "tuple",
          address: MULTI_TYPES,
          abi: ABI,
          method: "getUser",
        },
      ]);
      expect(result.bool).to.equal(true);
      expect(result.owner).to.equal(MULTICALL);
      expect(result.bytes32).to.equal(keccak256(hexlify(toUtf8Bytes("test"))));
      expect(result.list.map((b) => b.toNumber())).to.deep.equal([1, 2, 3]);
      expect(result.user.map((el) => el.toString())).to.deep.equal([
        MULTICALL,
        "42",
      ]);
      expect(result.tuple.map((el) => el.toString())).to.deep.equal([
        MULTICALL,
        "42",
      ]);
      expect(result.tuple.amount.eq("42")).to.equal(true);
    });

    it("reads uint256 as bigint in multicall", async () => {
      const bigintHelper = new EthContractHelper(
        MULTICALL,
        { provider } as any,
        false,
        { uint: "bigint" },
        async () => ({})
      );
      const result = await bigintHelper.multicall<{ list: bigint[] }>([
        {
          key: "list",
          address: MULTI_TYPES,
          method: "function getList() public pure returns (uint256[] memory)",
        },
      ]);
      expect(result.list.every((b) => typeof b === "bigint")).to.equal(true);
    });

    it("reads address as hex and checksum in multicall", async () => {
      const hexHelper = new EthContractHelper(
        MULTICALL,
        { provider } as any,
        false,
        { address: "hex" },
        async () => ({})
      );
      const hexResult = await hexHelper.multicall<{ owner: string }>([
        { key: "owner", address: MULTI_TYPES, abi: ABI, method: "getOwner()" },
      ]);
      expect(hexResult.owner).to.equal(hexResult.owner.toLowerCase());

      const checksumHelper = new EthContractHelper(
        MULTICALL,
        { provider } as any,
        false,
        { address: "checksum" },
        async () => ({})
      );
      const checksumResult = await checksumHelper.multicall<{ owner: string }>([
        { key: "owner", address: MULTI_TYPES, abi: ABI, method: "getOwner()" },
      ]);
      expect(checksumResult.owner).to.equal(getAddress(checksumResult.owner));
    });
  }
);

(PRIVATE_KEY && SEPOLIA_RPC ? describe : describe.skip)(
  "eth call (real provider)",
  () => {
    const provider = new JsonRpcProvider(SEPOLIA_RPC);
    const helper = new EthContractHelper(
      MULTICALL,
      { provider } as any,
      false,
      {},
      async () => ({})
    );

    it("calls getUser and exposes named outputs", async () => {
      const owner = await helper.call<string>({
        address: MULTI_TYPES,
        abi: ABI,
        method: "getOwner",
      });
      const user = await helper.call<
        Array<any> & { owner: string; amount: BigNumber }
      >({
        address: MULTI_TYPES,
        abi: ABI,
        method: "getUser",
      });
      expect(user.owner).to.equal(owner);
      expect(user.amount).to.be.instanceOf(BigNumber);
      expect(user.amount.toString()).to.equal("42");
    });

    it("calls getUser with full signature without abi", async () => {
      const owner = await helper.call<string>({
        address: MULTI_TYPES,
        abi: ABI,
        method: "getOwner",
      });
      const user = await helper.call<[string, BigNumber]>({
        address: MULTI_TYPES,
        method: "function getUser() view returns (address,uint256)",
      });
      expect(user[0]).to.equal(owner);
      expect(user[1]).to.be.instanceOf(BigNumber);
      expect(user[1].toString()).to.equal("42");
    });

    it("calls getBytes and returns bytes32 string", async () => {
      const bytes = await helper.call<string>({
        address: MULTI_TYPES,
        abi: ABI,
        method: "getBytes",
      });
      expect(bytes).to.be.a("string");
      expect(bytes).to.match(/^0x[0-9a-fA-F]{64}$/);
    });

    it("throws on invalid method in call", async () => {
      try {
        await helper.call({
          address: MULTI_TYPES,
          abi: ABI,
          method: "notExist",
        });
        expect.fail("should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(ABIFunctionNotProvidedError);
      }
    });
  }
);

(PRIVATE_KEY && SEPOLIA_RPC ? describe : describe.skip)(
  "eth send (real provider)",
  () => {
    const provider = new JsonRpcProvider(SEPOLIA_RPC);
    const wallet = new Wallet(PRIVATE_KEY);
    const helper = new EthContractHelper(
      MULTICALL,
      { provider } as any,
      false,
      {}
    );

    const sendTx = async (tx: any, providerInstance: any) => {
      const signed = await wallet.signTransaction(tx);
      const response = await providerInstance.broadcastTransaction(signed);
      return response.hash as string;
    };

    it("sendTransaction broadcasts and returns tx id", async function () {
      this.timeout(180000);
      const balance = await provider.getBalance(wallet.address);
      if (balance === 0n) {
        this.skip();
      }
      const tx = await helper.createTransaction(wallet.address, {
        address: ERC20,
        method: "function approve(address,uint256)",
        args: [wallet.address, "1"],
      });
      const txId = await helper.sendTransaction(tx as any, sendTx as any);
      expect(txId).to.be.a("string");
      expect(txId.length).to.be.greaterThan(0);
    });

    it("send creates and broadcasts transaction", async function () {
      this.timeout(180000);
      const balance = await provider.getBalance(wallet.address);
      if (balance === 0n) {
        this.skip();
      }
      const txId = await helper.send(
        wallet.address,
        sendTx as any,
        {
          address: ERC20,
          method: "function approve(address,uint256)",
          args: [wallet.address, "1"],
        },
        {}
      );
      expect(txId).to.be.a("string");
      expect(txId.length).to.be.greaterThan(0);
    });
  }
);

(PRIVATE_KEY && SEPOLIA_RPC ? describe : describe.skip)(
  "eth checkTransactionResult (real provider)",
  () => {
    const provider = new JsonRpcProvider(SEPOLIA_RPC);
    const wallet = new Wallet(PRIVATE_KEY);
    const helper = new EthContractHelper(
      MULTICALL,
      { provider } as any,
      false,
      {}
    );

    const sendTx = async (tx: any, providerInstance: any) => {
      const signed = await wallet.signTransaction(tx);
      const response = await providerInstance.broadcastTransaction(signed);
      return response.hash as string;
    };

    it("fastCheckTransactionResult times out on real provider", async function () {
      this.timeout(180000);
      const balance = await provider.getBalance(wallet.address);
      if (balance === 0n) {
        this.skip();
      }
      const tx = await helper.createTransaction(wallet.address, {
        address: ERC20,
        method: "function approve(address,uint256)",
        args: [wallet.address, "1"],
      });
      const txId = await helper.sendTransaction(tx as any, sendTx as any);
      const err = await helper
        .fastCheckTransactionResult(txId, 1)
        .catch((e) => e);
      expect(err).to.be.instanceOf(TransactionReceiptError);
      expect((err as Error).message).to.include("timeout");
    });

    it("finalCheckTransactionResult times out on real provider", async function () {
      this.timeout(180000);
      const balance = await provider.getBalance(wallet.address);
      if (balance === 0n) {
        this.skip();
      }
      const tx = await helper.createTransaction(wallet.address, {
        address: ERC20,
        method: "function approve(address,uint256)",
        args: [wallet.address, "1"],
      });
      const txId = await helper.sendTransaction(tx as any, sendTx as any);
      const err = await helper
        .finalCheckTransactionResult(txId, 1)
        .catch((e) => e);
      expect(err).to.be.instanceOf(TransactionReceiptError);
      expect((err as Error).message).to.include("timeout");
    });
  }
);

describe("eth transaction timeout", () => {
  it("finalCheckTransactionResult times out", async () => {
    const clock = sinon.useFakeTimers();
    try {
      const provider = {
        waitForTransaction: sinon.stub().resolves(null),
        getBlock: sinon.stub().resolves({ number: 1 }),
      } as any;
      const helper = new EthContractHelper(
        MULTICALL,
        { provider } as any,
        false,
        {},
        async () => ({})
      );
      const handled = helper
        .finalCheckTransactionResult("missing", 10)
        .catch((err) => err);
      await clock.tickAsync(1010);
      const err = await handled;
      expect(err).to.be.instanceOf(TransactionReceiptError);
      expect((err as Error).message).to.include("timeout");
    } finally {
      clock.restore();
    }
  });

  it("fastCheckTransactionResult times out", async () => {
    const clock = sinon.useFakeTimers();
    try {
      const provider = {
        waitForTransaction: sinon.stub().resolves(null),
        getBlock: sinon.stub().resolves({ number: 1 }),
      } as any;
      const helper = new EthContractHelper(
        MULTICALL,
        { provider } as any,
        false,
        {},
        async () => ({})
      );
      const handled = helper
        .fastCheckTransactionResult("missing", 10)
        .catch((err) => err);
      await clock.tickAsync(1010);
      const err = await handled;
      expect(err).to.be.instanceOf(TransactionReceiptError);
      expect((err as Error).message).to.include("timeout");
    } finally {
      clock.restore();
    }
  });
});
