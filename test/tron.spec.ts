import { expect } from "chai";
import sinon from "sinon";
import { TronContractHelper } from "../src/tron";
import { TronWeb } from "tronweb";
import BigNumber from "bignumber.js";
import {
  ABIFunctionNotProvidedError,
  BroadcastTronTransactionError,
  ContractAddressNotProvidedError,
  ContractMethodNotProvidedError,
  TransactionReceiptError,
} from "../src/errors";
import { config } from "dotenv";
config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const FULL_NODE = "https://nile.trongrid.io";
const SOLIDITY_NODE = "https://nile.trongrid.io";
const EVENT_SERVER = "https://nile.trongrid.io";
const MULTICALL_V2 = "TZHL5DTcqr6r3uugk2fgtZKHwe4Yp2bsQi";
const MULTI_TYPES = "TUqZGqv18iusqsC84jsHkFD71VWTobe3k8";
const ERC20 = "TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf";

const ABI = [
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
  {
    inputs: [],
    name: "getOwner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
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
    name: "getBytes",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "pure",
    type: "function",
  },
];
const ERC20_ABI = [
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

describe("tron createTransaction", () => {
  it("creates transaction without feeCalculation", async () => {
    const triggerStub = sinon.stub().resolves({
      transaction: { raw_data: { contract: [] } },
    });
    const provider = {
      transactionBuilder: { triggerSmartContract: triggerStub },
    } as any;
    const helper = new TronContractHelper(
      MULTICALL_V2,
      provider,
      {},
      undefined
    );
    const from = "TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf";
    await helper.createTransaction(from, {
      address: ERC20,
      method: "function approve(address,uint256)",
      args: [from, "1"],
      options: { feeLimit: 888 },
    });
    expect(triggerStub.calledOnce).to.equal(true);
    const callArgs = triggerStub.firstCall.args;
    expect(callArgs[2]).to.include({ feeLimit: 888 });
  });

  it("applies feeCalculation when provided", async () => {
    const triggerStub = sinon.stub().resolves({
      transaction: { raw_data: { contract: [] } },
    });
    const feeCalculation = sinon.stub().resolves({ feeLimit: 123n });
    const provider = {
      transactionBuilder: { triggerSmartContract: triggerStub },
    } as any;
    const helper = new TronContractHelper(
      MULTICALL_V2,
      provider,
      {},
      feeCalculation
    );
    const from = "TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf";
    await helper.createTransaction(from, {
      address: ERC20,
      method: "function approve(address,uint256)",
      args: [from, "1"],
    });
    expect(feeCalculation.calledOnce).to.equal(true);
    const callArgs = triggerStub.firstCall.args;
    expect(callArgs[2]).to.include({ feeLimit: 123 });
  });

  it("passes estimateFee to feeCalculation", async () => {
    const triggerStub = sinon.stub().resolves({
      transaction: { raw_data: { contract: [] } },
    });
    const feeCalculation = sinon.stub().resolves({ feeLimit: 55n });
    const provider = {
      transactionBuilder: { triggerSmartContract: triggerStub },
    } as any;
    const helper = new TronContractHelper(
      MULTICALL_V2,
      provider,
      {},
      feeCalculation
    );
    const from = "TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf";
    await helper.createTransaction(
      from,
      {
        address: ERC20,
        method: "function approve(address,uint256)",
        args: [from, "1"],
      },
      { estimateFee: false }
    );
    expect(
      feeCalculation.calledWithMatch({
        provider,
        options: { estimateFee: false },
      })
    ).to.equal(true);
  });
});

(PRIVATE_KEY ? describe : describe.skip)(
  "tron createTransaction (real provider)",
  () => {
    const tronWeb = new TronWeb({
      fullNode: FULL_NODE,
      solidityNode: SOLIDITY_NODE,
      eventServer: EVENT_SERVER,
      privateKey: PRIVATE_KEY,
    });

    it("creates approve transaction with tronweb provider", async () => {
      const helper = new TronContractHelper(MULTICALL_V2, tronWeb, {});
      const from = tronWeb.address.fromPrivateKey(PRIVATE_KEY) as string;
      const tx = await helper.createTransaction(from, {
        address: ERC20,
        method: "function approve(address,uint256)",
        args: [from, "1"],
      });
      expect(tx).to.have.property("raw_data");
      // @ts-ignore
      expect(tx.raw_data.contract?.length).to.be.greaterThan(0);
    });
  }
);

(PRIVATE_KEY ? describe : describe.skip)(
  "tron multicall (real provider)",
  () => {
    const tronWeb = new TronWeb({
      fullNode: FULL_NODE,
      solidityNode: SOLIDITY_NODE,
      eventServer: EVENT_SERVER,
      privateKey: PRIVATE_KEY,
    });

    // multicall

    it("supports multicall with multiple address arguments", async () => {
      const helper = new TronContractHelper(MULTICALL_V2, tronWeb, {});
      const owner = tronWeb.address.fromPrivateKey(PRIVATE_KEY) as string;
      const result = await helper.multicall<{
        allowance: BigNumber;
        owner: string;
        list: BigNumber[];
      }>([
        {
          key: "allowance",
          address: ERC20,
          abi: ERC20_ABI,
          method: "allowance",
          args: [owner, MULTICALL_V2],
        },
        {
          key: "owner",
          address: MULTI_TYPES,
          abi: ABI,
          method: "getOwner",
        },
        {
          key: "list",
          address: MULTI_TYPES,
          abi: ABI,
          method: "getList",
        },
      ]);
      expect(result.allowance).to.be.instanceOf(BigNumber);
      expect(result.allowance.toString()).to.match(/^\d+$/);
      expect(result.owner).to.equal(MULTICALL_V2);
      expect(result.list[0]).to.be.instanceOf(BigNumber);
    });

    it("calls getUser via multicall and returns expected values", async () => {
      const helper = new TronContractHelper(MULTICALL_V2, tronWeb, {});
      const result = await helper.multicall<{
        owner: string;
        user: Array<any> & { owner: string; amount: BigNumber };
      }>([
        {
          key: "owner",
          address: MULTI_TYPES,
          abi: ABI,
          method: "getOwner",
        },
        {
          key: "user",
          address: MULTI_TYPES,
          abi: ABI,
          method: "getUser",
        },
      ]);
      expect(result.user.owner).to.equal(result.owner);
      expect(result.user.amount).to.be.instanceOf(BigNumber);
      expect(result.user.amount.toString()).to.equal("42");
    });

    it("throws when required params are missing", async () => {
      const helper = new TronContractHelper(MULTICALL_V2, tronWeb, {});
      try {
        await helper.multicall([
          {
            key: "user",
            address: "" as any,
            abi: ABI,
            method: "getUser",
          },
        ]);
        expect.fail("should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(ContractAddressNotProvidedError);
      }

      try {
        await helper.multicall([
          {
            key: "user",
            address: MULTI_TYPES,
            abi: ABI,
            method: "" as any,
          },
        ]);
        expect.fail("should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(ContractMethodNotProvidedError);
      }
    });

    it("formats address and uint values with different formatValue settings", async () => {
      const defaultHelper = new TronContractHelper(MULTICALL_V2, tronWeb, {});
      const defaultResult = await defaultHelper.multicall<{
        owner: string;
        list: BigNumber[];
      }>([
        { key: "owner", address: MULTI_TYPES, abi: ABI, method: "getOwner" },
        { key: "list", address: MULTI_TYPES, abi: ABI, method: "getList" },
      ]);
      expect(defaultResult.owner).to.equal(MULTICALL_V2);
      expect(defaultResult.list[0]).to.be.instanceOf(BigNumber);
      expect(defaultResult.list[0].toNumber()).to.equal(1);

      const bigintHelper = new TronContractHelper(MULTICALL_V2, tronWeb, {
        uint: "bigint",
      });
      const bigintResult = await bigintHelper.multicall<{ list: bigint[] }>([
        { key: "list", address: MULTI_TYPES, abi: ABI, method: "getList" },
      ]);
      expect(typeof bigintResult.list[0]).to.equal("bigint");

      const hexHelper = new TronContractHelper(MULTICALL_V2, tronWeb, {
        address: "hex",
      });
      const hexResult = await hexHelper.multicall<{ owner: string }>([
        { key: "owner", address: MULTI_TYPES, abi: ABI, method: "getOwner" },
      ]);
      expect(hexResult.owner).to.match(/^41[0-9a-f]{40}$/);

      const checksumHelper = new TronContractHelper(MULTICALL_V2, tronWeb, {
        address: "checksum",
      });
      const checksumResult = await checksumHelper.multicall<{ owner: string }>([
        { key: "owner", address: MULTI_TYPES, abi: ABI, method: "getOwner" },
      ]);
      expect(checksumResult.owner).to.equal(
        TronWeb.address.toChecksumAddress(checksumResult.owner)
      );

      const base58Helper = new TronContractHelper(MULTICALL_V2, tronWeb, {
        address: "base58",
      });
      const base58Result = await base58Helper.multicall<{ owner: string }>([
        { key: "owner", address: MULTI_TYPES, abi: ABI, method: "getOwner" },
      ]);
      expect(base58Result.owner).to.equal(
        TronWeb.address.fromHex(checksumResult.owner)
      );
    });

    it("throws when method is unrelated", async () => {
      const helper = new TronContractHelper(MULTICALL_V2, tronWeb, {});
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

    it("throws when address is unrelated", async () => {
      const helper = new TronContractHelper(MULTICALL_V2, tronWeb, {});
      try {
        await helper.multicall([
          {
            key: "user",
            address: "T0000000000000000000000000000000000",
            abi: ABI,
            method: "getUser",
          },
        ]);
        expect.fail("should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(Error);
      }
    });

    it("throws when args are invalid", async () => {
      const helper = new TronContractHelper(MULTICALL_V2, tronWeb, {});
      try {
        await helper.multicall([
          {
            key: "user",
            address: MULTI_TYPES,
            abi: ABI,
            method: "getUser",
            args: [1],
          },
        ]);
        expect.fail("should have thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(Error);
      }
    });

    // call

    it("calls getUser and exposes named outputs", async () => {
      const helper = new TronContractHelper(MULTICALL_V2, tronWeb, {});
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
      const helper = new TronContractHelper(MULTICALL_V2, tronWeb, {});
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
      const helper = new TronContractHelper(MULTICALL_V2, tronWeb, {});
      const bytes = await helper.call<string>({
        address: MULTI_TYPES,
        abi: ABI,
        method: "getBytes",
      });
      expect(bytes).to.be.a("string");
      expect(bytes).to.match(/^0x[0-9a-fA-F]{64}$/);
    });
  }
);

(PRIVATE_KEY ? describe : describe.skip)("tron send (real provider)", () => {
  const tronWeb = new TronWeb({
    fullNode: FULL_NODE,
    solidityNode: SOLIDITY_NODE,
    eventServer: EVENT_SERVER,
    privateKey: PRIVATE_KEY,
  });

  const sendTx = async (tx: any, provider: any) => {
    const signed = await tronWeb.trx.sign(tx, PRIVATE_KEY);
    const response = await provider.trx.sendRawTransaction(signed);
    return response.transaction.txID as string;
  };

  it("sendTransaction broadcasts and returns tx id", async function () {
    this.timeout(120000);
    const helper = new TronContractHelper(MULTICALL_V2, tronWeb, {});
    const from = tronWeb.address.fromPrivateKey(PRIVATE_KEY) as string;
    const tx = await helper.createTransaction(from, {
      address: ERC20,
      method: "function approve(address,uint256)",
      args: [from, "1"],
    });
    const txId = await helper.sendTransaction(tx as any, sendTx as any);
    expect(txId).to.be.a("string");
    expect(txId.length).to.be.greaterThan(0);
  });

  it("send creates and broadcasts transaction", async function () {
    this.timeout(120000);
    const helper = new TronContractHelper(MULTICALL_V2, tronWeb, {});
    const from = tronWeb.address.fromPrivateKey(PRIVATE_KEY) as string;
    const txId = await helper.send(
      from,
      sendTx as any,
      {
        address: ERC20,
        method: "function approve(address,uint256)",
        args: [from, "1"],
      },
      {}
    );
    expect(txId).to.be.a("string");
    expect(txId.length).to.be.greaterThan(0);
  });
});

(PRIVATE_KEY ? describe : describe.skip)(
  "tron checkTransactionResult (real provider)",
  () => {
    const tronWeb = new TronWeb({
      fullNode: FULL_NODE,
      solidityNode: SOLIDITY_NODE,
      eventServer: EVENT_SERVER,
      privateKey: PRIVATE_KEY,
    });

    const sendTx = async (tx: any, provider: any) => {
      const signed = await tronWeb.trx.sign(tx, PRIVATE_KEY);
      const response = await provider.trx.sendRawTransaction(signed);
      return response.transaction.txID as string;
    };

    const buildApproveTx = async () => {
      const helper = new TronContractHelper(MULTICALL_V2, tronWeb, {});
      const from = tronWeb.address.fromPrivateKey(PRIVATE_KEY) as string;
      return helper.createTransaction(from, {
        address: ERC20,
        method: "function approve(address,uint256)",
        args: [from, "1"],
      });
    };

    it("fastCheckTransactionResult times out on real provider", async function () {
      this.timeout(180000);
      const from = tronWeb.address.fromPrivateKey(PRIVATE_KEY) as string;
      const balance = await tronWeb.trx.getBalance(from);
      if (balance < 1) {
        this.skip();
      }
      const helper = new TronContractHelper(MULTICALL_V2, tronWeb, {});
      const tx = await buildApproveTx();
      const txId = await helper.sendTransaction(tx as any, sendTx as any);
      const handled = helper
        .fastCheckTransactionResult(txId, 1)
        .catch((err) => err);
      const err = await handled;
      expect(err).to.be.instanceOf(TransactionReceiptError);
      expect((err as Error).message).to.include("timeout");
    });

    it("finalCheckTransactionResult times out on real provider", async function () {
      this.timeout(180000);
      const from = tronWeb.address.fromPrivateKey(PRIVATE_KEY) as string;
      const balance = await tronWeb.trx.getBalance(from);
      if (balance < 1) {
        this.skip();
      }
      const helper = new TronContractHelper(MULTICALL_V2, tronWeb, {});
      const tx = await buildApproveTx();
      const txId = await helper.sendTransaction(tx as any, sendTx as any);
      const handled = helper
        .finalCheckTransactionResult(txId, 1)
        .catch((err) => err);
      const err = await handled;
      expect(err).to.be.instanceOf(TransactionReceiptError);
      expect((err as Error).message).to.include("timeout");
    });

    it("fastCheckTransactionResult returns txId", async function () {
      this.timeout(180000);
      const from = tronWeb.address.fromPrivateKey(PRIVATE_KEY) as string;
      const balance = await tronWeb.trx.getBalance(from);
      if (balance < 1) {
        this.skip();
      }
      const helper = new TronContractHelper(MULTICALL_V2, tronWeb, {});
      const tx = await buildApproveTx();
      const txId = await helper.sendTransaction(tx as any, sendTx as any);
      const result = await helper.fastCheckTransactionResult(txId);
      expect(result.txId).to.equal(txId);
    });

    it("finalCheckTransactionResult returns txId and blockNumber", async function () {
      this.timeout(180000);
      const from = tronWeb.address.fromPrivateKey(PRIVATE_KEY) as string;
      const balance = await tronWeb.trx.getBalance(from);
      if (balance < 1) {
        this.skip();
      }
      const helper = new TronContractHelper(MULTICALL_V2, tronWeb, {});
      const tx = await buildApproveTx();
      const txId = await helper.sendTransaction(tx as any, sendTx as any);
      const result = await helper.finalCheckTransactionResult(txId);
      expect(result.txId).to.equal(txId);
      expect(result.blockNumber).to.be.a("bigint");
    });

    it("finalCheckTransactionResult times out", async () => {
      const clock = sinon.useFakeTimers();
      const provider = {
        trx: {
          getTransactionInfo: sinon.stub().resolves({}),
        },
      } as any;
      const helper = new TronContractHelper(MULTICALL_V2, provider, {});

      const handled = helper
        .finalCheckTransactionResult("missing", 10)
        .catch((err) => err);
      await clock.tickAsync(3010);

      const err = await handled;
      expect(err).to.be.instanceOf(TransactionReceiptError);
      expect((err as Error).message).to.include("timeout");
      clock.restore();
    });

    it("fastCheckTransactionResult times out", async () => {
      const clock = sinon.useFakeTimers();
      const provider = {
        trx: {
          getTransaction: sinon.stub().resolves({}),
        },
      } as any;
      const helper = new TronContractHelper(MULTICALL_V2, provider, {});

      const handled = helper
        .fastCheckTransactionResult("missing", 10)
        .catch((err) => err);
      await clock.tickAsync(1010);

      const err = await handled;
      expect(err).to.be.instanceOf(TransactionReceiptError);
      expect((err as Error).message).to.include("timeout");
      clock.restore();
    });
  }
);

describe("tron broadcastTransaction", () => {
  it("broadcasts transaction and returns tx id", async () => {
    const provider = {
      trx: {
        sendRawTransaction: sinon.stub().resolves({
          transaction: { txID: "txid" },
        }),
      },
    } as any;

    const result = await TronContractHelper.broadcastTransaction(
      provider,
      {} as any
    );

    expect(result).to.equal("txid");
  });

  it("throws broadcast error with code and decoded message", async () => {
    const provider = {
      trx: {
        sendRawTransaction: sinon.stub().resolves({
          code: 1,
          message: "0x01",
        }),
      },
      toUtf8: sinon.stub().returns("decoded"),
    } as any;

    try {
      await TronContractHelper.broadcastTransaction(provider, {} as any);
      expect.fail("should have thrown");
    } catch (err: any) {
      expect(err).to.have.property("code", 1);
      expect(err.message).to.equal("decoded");
    }
  });

  it("broadcasts a real approve transaction", async function () {
    this.timeout(120000);
    if (!PRIVATE_KEY) {
      this.skip();
    }
    const tronWeb = new TronWeb({
      fullNode: FULL_NODE,
      solidityNode: SOLIDITY_NODE,
      eventServer: EVENT_SERVER,
      privateKey: PRIVATE_KEY,
    });
    const from = tronWeb.address.fromPrivateKey(PRIVATE_KEY) as string;
    const balance = await tronWeb.trx.getBalance(from);
    if (balance < 1) {
      this.skip();
    }
    const txResponse = await tronWeb.transactionBuilder.triggerSmartContract(
      ERC20,
      "approve(address,uint256)",
      {},
      [
        { type: "address", value: from },
        { type: "uint256", value: "1" },
      ],
      from
    );
    const tx = txResponse.transaction;
    const signed = await tronWeb.trx.sign(tx, PRIVATE_KEY);
    const txId = await TronContractHelper.broadcastTransaction(
      tronWeb as any,
      signed as any
    );
    expect(txId).to.equal(signed.txID);
  });

  it("fails to broadcast with invalid signature", async function () {
    this.timeout(120000);
    if (!PRIVATE_KEY) {
      this.skip();
    }
    const tronWeb = new TronWeb({
      fullNode: FULL_NODE,
      solidityNode: SOLIDITY_NODE,
      eventServer: EVENT_SERVER,
      privateKey: PRIVATE_KEY,
    });
    const from = tronWeb.address.fromPrivateKey(PRIVATE_KEY) as string;
    const balance = await tronWeb.trx.getBalance(from);
    if (balance < 1) {
      this.skip();
    }
    const txResponse = await tronWeb.transactionBuilder.triggerSmartContract(
      ERC20,
      "approve(address,uint256)",
      {},
      [
        { type: "address", value: from },
        { type: "uint256", value: "1" },
      ],
      from
    );
    const tx = txResponse.transaction;
    const signed = await tronWeb.trx.sign(tx, PRIVATE_KEY);
    signed.signature = ["00"];

    try {
      await TronContractHelper.broadcastTransaction(
        tronWeb as any,
        signed as any
      );
      expect.fail("should have thrown");
    } catch (err: any) {
      expect(err).to.be.instanceOf(BroadcastTronTransactionError);
      expect(err).to.have.property("code");
    }
  });
});
