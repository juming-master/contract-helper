import { expect } from "chai";
import { BigNumber, TronWeb } from "tronweb";
import ContractHelper from "../src/contract-helper";
import {
  ChainType,
  EvmSendTransaction,
  SendTransaction,
  TronSendTransaction,
} from "../src";
import { getAddress, hexlify, keccak256, toUtf8Bytes, Wallet } from "ethers";
import { JsonRpcProvider } from "ethers";
import { config } from "dotenv";
import sinon from "sinon";
config();

const FULL_NODE = "https://nile.trongrid.io";
const SOLIDITY_NODE = "https://nile.trongrid.io";
const EVENT_SERVER = "https://nile.trongrid.io";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
if (!PRIVATE_KEY) {
  throw new Error("Please set PRIVATE_KEY in .env");
}
const tronWeb = new TronWeb({
  fullNode: FULL_NODE,
  solidityNode: SOLIDITY_NODE,
  eventServer: EVENT_SERVER,
  privateKey: PRIVATE_KEY,
});

const ethWallet = new Wallet(PRIVATE_KEY);
const ethProvider = new JsonRpcProvider(
  "https://eth-sepolia.g.alchemy.com/public"
);

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

const tronSend: TronSendTransaction = async function (tx, provider) {
  const signedTransaction = await tronWeb.trx.sign(tx, PRIVATE_KEY);
  const response = await provider.trx.sendRawTransaction(signedTransaction);
  return response.transaction.txID;
};

const evmSend: EvmSendTransaction = async function (tx, provider) {
  const signedTx = await ethWallet.signTransaction(tx);
  const response = await provider.broadcastTransaction(signedTx);
  return response.hash;
};

for (let { chain, from, erc20, multicallV2, multiTypes, send, provider } of [
  {
    chain: "tron" as ChainType,
    wallet: tronWeb,
    provider: tronWeb,
    from: tronWeb.address.fromPrivateKey(PRIVATE_KEY) as string,
    erc20: "TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf", // Tron USDT, https://nileex.io/join/getJoinPage get trx,usdt
    multicallV2: "TZHL5DTcqr6r3uugk2fgtZKHwe4Yp2bsQi",
    multiTypes: "TUqZGqv18iusqsC84jsHkFD71VWTobe3k8",
    send: tronSend as SendTransaction<ChainType>,
  },
  {
    chain: "evm" as ChainType,
    wallet: ethWallet,
    provider: ethProvider,
    from: ethWallet.address,
    erc20: "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238", // USDC Sepolia, https://faucet.circle.com
    multicallV2: "0xf99CC4c088fdf4b2d5Fec7C4a413C147d7CB0cdF",
    multiTypes: "0x26575Ef5f2Ca0d2F3168Fd691526A537d4405040",
    send: evmSend as SendTransaction<ChainType>,
  },
]) {
  describe(`${chain.toUpperCase()} (with real provider)`, function () {
    const helper = new ContractHelper<ChainType>({
      chain,
      provider,
      multicallV2Address: multicallV2,
    });

    it("should call getUser", async () => {
      const result = await helper.call<
        Array<any> & {
          owner: string;
          amount: BigNumber;
        }
      >({
        address: multiTypes,
        abi: ABI,
        method: "getUser",
      });
      expect(result.amount.eq("42")).to.be.equal(true);
      debugger;
      const result2 = await helper.call<[string, BigNumber]>({
        address: multiTypes,
        method: "function getUser() view returns (address,uint256)",
      });
      expect(result2[1].eq("42")).to.be.equal(true);

      const result3 = await helper.call<
        [string, BigNumber] & {
          owner: string;
          amount: BigNumber;
        }
      >({
        address: multiTypes,
        abi: ABI,
        method:
          "function getUser() view returns (address owner,uint256 amount)",
      });
      expect(result3.amount.eq("42")).to.be.equal(true);
    });

    it("should read bool, address, bytes32, array, and tuple in one multicall", async () => {
      const result = await helper.multicall<{
        bool: boolean;
        owner: string;
        bytes32: string;
        list: BigNumber[];
        user: any[];
        turple: Array<any> & {
          owner: string;
          amount: BigNumber;
        };
      }>([
        {
          key: "bool",
          address: multiTypes,
          method: "function getBool() public pure returns (bool)",
        },
        {
          key: "owner",
          address: multiTypes,
          abi: ABI,
          method: "getOwner()",
        },
        {
          key: "bytes32",
          address: multiTypes,
          abi: ABI,
          method: "getBytes()",
        },
        {
          key: "list",
          address: multiTypes,
          method: "function getList() public pure returns (uint256[] memory)",
        },
        {
          key: "user",
          address: multiTypes,
          method: "function getUser() public view returns (address, uint256)",
        },
        {
          key: "turple",
          address: multiTypes,
          abi: ABI,
          method: "getUser",
        },
      ]);
      expect(result.bool).to.be.a("boolean");
      expect(result.bool).to.be.equal(true);
      expect(result.owner).to.be.equal(multicallV2);
      expect(result.bytes32).to.be.a("string").with.lengthOf(66);
      expect(result.bytes32).to.be.equal(
        keccak256(hexlify(toUtf8Bytes("test")))
      );
      expect(result.list.map((b) => b.toNumber())).to.deep.equal([1, 2, 3]);
      expect(result.user.map((el) => el.toString())).to.deep.equal([
        multicallV2,
        "42",
      ]);
      expect(result.turple.map((el) => el.toString())).to.deep.equal([
        multicallV2,
        "42",
      ]);
      expect(result.turple.amount.eq("42")).to.be.equal(true);
      expect(result.turple.owner === multicallV2).to.be.equal(true);
    });

    it("should read uint256 as bigint in one multicall", async () => {
      const helper = new ContractHelper<ChainType>({
        chain,
        provider,
        multicallV2Address: multicallV2,
        formatValue: {
          uint: "bigint",
        },
      });
      const result = await helper.multicall<{
        list: BigInt[];
      }>([
        {
          key: "list",
          address: multiTypes,
          method: "function getList() public pure returns (uint256[] memory)",
        },
      ]);
      expect(result.list.every((b) => typeof b === "bigint")).to.be.equal(true);
    });

    it("should read address as hex and checksum in two multicall", async () => {
      const helper = new ContractHelper<ChainType>({
        chain,
        provider,
        multicallV2Address: multicallV2,
        formatValue: {
          address: "hex",
        },
      });
      const result = await helper.multicall<{
        owner: string;
      }>([
        {
          key: "owner",
          address: multiTypes,
          abi: ABI,
          method: "getOwner()",
        },
      ]);
      chain === "evm"
        ? expect(result.owner).to.be.equal(result.owner.toLowerCase())
        : expect(result.owner).to.be.equal(
            TronWeb.address.toChecksumAddress(result.owner).toLowerCase()
          );

      const result2 = await new ContractHelper<ChainType>({
        chain,
        provider,
        multicallV2Address: multicallV2,
        formatValue: {
          address: "checksum",
        },
      }).multicall<{
        owner: string;
      }>([
        {
          key: "owner",
          address: multiTypes,
          abi: ABI,
          method: "getOwner()",
        },
      ]);
      expect(result2.owner).to.be.equal(
        chain === "tron"
          ? TronWeb.address.toChecksumAddress(result2.owner)
          : getAddress(result2.owner)
      );
    });

    it("should delay execution by multicallLazyQueryTimeout", async function () {
      const clock = sinon.useFakeTimers();
      const helper = new ContractHelper<ChainType>({
        chain,
        provider,
        multicallV2Address: multicallV2,
        multicallMaxLazyCallsLength: 3,
        multicallLazyQueryTimeout: 1000,
      });

      const spy = sinon.spy(helper, "executeLazyCalls");

      helper.lazyCall({
        address: multiTypes,
        abi: ABI,
        method: "getOwner()",
      });

      expect(spy.called).to.be.false;
      clock.tick(400);
      expect(spy.called).to.be.false;
      clock.tick(600);
      expect(spy.called).to.be.true;
      clock.restore();
    });

    it("should trigger immediately when multicallMaxPendingLength is exceeded", async function () {
      const helper = new ContractHelper<ChainType>({
        chain,
        provider,
        multicallV2Address: multicallV2,
        multicallMaxLazyCallsLength: 3,
      });
      const spy = sinon.spy(helper, "multicall");

      const callArgs = {
        key: "owner",
        address: multiTypes,
        abi: ABI,
        method: "getOwner()",
      };

      helper.lazyCall(callArgs);
      expect(spy.called).to.be.false;
      helper.lazyCall(callArgs);
      expect(spy.called).to.be.false;
      helper.lazyCall(callArgs);
      expect(spy.called).to.be.true;
      spy.restore();
    });

    it("should resolve pending lazyCall promises immediately after executeLazyCalls", async () => {
      const helper = new ContractHelper<ChainType>({
        chain,
        provider,
        multicallV2Address: multicallV2,
        multicallMaxLazyCallsLength: 3,
      });

      const lazyPromise = helper.lazyCall({
        address: multiTypes,
        abi: ABI,
        method: "getOwner()",
      });

      let resolved = false;
      lazyPromise.then(() => {
        resolved = true;
      });

      await Promise.resolve();
      expect(resolved).to.equal(false);
      await helper.executeLazyCalls();
      expect(resolved).to.equal(true);
    });

    it("should auto-execute lazy calls after multicallLazyQueryTimeout", async () => {
      const helper = new ContractHelper<ChainType>({
        chain,
        provider,
        multicallV2Address: multicallV2,
        multicallLazyQueryTimeout: 100, // 100ms timeout
      });
      const spy = sinon.spy(helper, "multicall");

      let executed = false;

      const start = Date.now();

      const lazyPromise = helper.lazyCall({
        address: multiTypes,
        abi: ABI,
        method: "getOwner()",
      });

      lazyPromise.then(() => {
        executed = true;
      });

      // Initially it should not resolve immediately
      await new Promise((res) => setTimeout(res, 10));
      expect(executed).to.equal(false);
      await new Promise((res) => setTimeout(res, 100));
      expect(spy.called).to.be.true;
      // Wait longer than the lazy timeout to ensure it's triggered
      await new Promise((res) => setTimeout(res, 150));
      await lazyPromise;
      expect(executed).to.equal(true);

      const duration = Date.now() - start;
      expect(duration).to.be.greaterThan(90); // Should trigger after ~100ms
    });

    it("should send approve transaction and check result", async () => {
      this.timeout(200000000);
      const approveArgs = {
        address: erc20,
        abi: [
          {
            constant: false,
            inputs: [
              { name: "_spender", type: "address" },
              { name: "_value", type: "uint256" },
            ],
            name: "approve",
            outputs: [{ name: "success", type: "bool" }],
            type: "function",
          },
        ],
        method: "approve",
        args: [
          "0x67940FB0e23A1c91A35a71fc2C8D8b17413fB1d2",
          new BigNumber(1).shiftedBy(18).toFixed(),
        ],
      };
      const txId = await helper.send(from, send, approveArgs);
      const confirmed = await helper["helper"].finalCheckTransactionResult(
        txId
      );
      expect(confirmed.txId).to.be.equal(txId);
    });
  });
}
