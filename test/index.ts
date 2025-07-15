import { BigNumber, TronWeb } from "tronweb";
import {
  CheckTransactionType,
  ContractHelper,
  TronTransactionRequest,
} from "../src/index";
import {
  Adapter,
  AdapterName,
  AdapterState,
  SignedTransaction,
  Transaction,
  WalletReadyState,
} from "@tronweb3/tronwallet-abstract-adapter";

export enum ChainId {
  Mainnet = "0x2b6653dc",
  Nile = "0xcd8690dc",
  Shasta = "0x94a9059e",
}

const SUPPORTED_NETWORKS = [
  {
    chainId: ChainId.Mainnet,
    title: "Mainnet",
    url: "https://api.trongrid.io",
    etherscanUrl: "https://tronscan.io",
    isTest: false,
  },
  {
    chainId: ChainId.Nile,
    title: "Nile",
    url: "https://api.nileex.io",
    etherscanUrl: "https://nile.tronscan.io",
    isTest: true,
  },
  {
    chainId: ChainId.Shasta,
    title: "Shasta",
    url: "https://api.shasta.trongrid.io",
    etherscanUrl: "https://api.shasta.trongrid.io",
    isTest: true,
  },
];

function createTronWeb(chainId: ChainId, privateKey?: string) {
  const network = SUPPORTED_NETWORKS.find((n) => n.chainId === chainId);
  if (!network) {
    throw new Error(`No network found with chainId "${chainId}"`);
  }
  const tronWeb = new TronWeb({
    fullHost: network.url,
    eventServer: network.url,
    solidityNode: network.url,
    privateKey: privateKey,
  });
  return tronWeb;
}

export const TronWebAdapterName = "TronWeb" as AdapterName<"TronLink">;
class TronWebAdapter extends Adapter {
  private signer: TronWeb;

  name: AdapterName<string> = TronWebAdapterName;
  url: string = "";
  icon: string = "";
  readyState: WalletReadyState = WalletReadyState.Found;
  state: AdapterState = AdapterState.Disconnect;
  address: string | null = null;
  connecting: boolean = false;

  constructor(privateKey: string) {
    super();
    this.signer = createTronWeb(ChainId.Nile, privateKey);
    this.readyState = WalletReadyState.Found;
    this.name = TronWebAdapterName;
  }

  async connect(options?: Record<string, unknown>): Promise<void> {
    this.connecting = true;
    const account = await this.signer.trx.getAccount();
    this.address = account.address;
    this.state = AdapterState.Connected;
    this.connecting = false;
  }

  async signMessage(message: string, privateKey?: string): Promise<string> {
    return this.signer.trx.signMessageV2(message, privateKey);
  }
  signTransaction(
    transaction: Transaction,
    privateKey?: string
  ): Promise<SignedTransaction> {
    return this.signer.trx.signTransaction(transaction, privateKey);
  }
}

const USDT_ABI = [
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "sender", type: "address" },
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "spender", type: "address" },
      { name: "addedValue", type: "uint256" },
    ],
    name: "increaseAllowance",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "spender", type: "address" },
      { name: "subtractedValue", type: "uint256" },
    ],
    name: "decreaseAllowance",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: false, name: "value", type: "uint256" },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "owner", type: "address" },
      { indexed: true, name: "spender", type: "address" },
      { indexed: false, name: "value", type: "uint256" },
    ],
    name: "Approval",
    type: "event",
  },
];

async function main() {
  const privateKey = "";
  const multicall = "TZHL5DTcqr6r3uugk2fgtZKHwe4Yp2bsQi";
  const provider = createTronWeb(ChainId.Nile, privateKey);
  const helper = new ContractHelper({
    provider,
    multicallV2Address: multicall,
  });
  const USDT = "TZ78R2E6ejfFhxq8hxrmuqT6hGBxjHQbo4"; // Nile USDT
  // call
  const name = await helper.call<string>({
    address: USDT,
    // abi: USDT_ABI, // contract abi
    method: "function name() view returns (string)", // contract method name
  });
  debugger;
  const decimals = await helper.call<BigNumber>({
    address: USDT,
    abi: USDT_ABI, // contract abi
    method: "decimals()", // 或者 decimals 也行， contract method name
  });
  const balanceOf = await helper.call<BigNumber>({
    address: USDT,
    abi: USDT_ABI, // contract abi
    method: "balanceOf(address)",
    parameters: ["TEvddbScTeNPppiDRWB4Zn8WU3Q7sgEZr1"],
  });
  const lazyBalanceOf = await helper.lazyCall<BigNumber>({
    address: USDT,
    abi: USDT_ABI, // contract abi
    method: "balanceOf(address)",
    parameters: ["TEvddbScTeNPppiDRWB4Zn8WU3Q7sgEZr1"],
  });
  // or in one multicall
  const result = await helper.multicall<{
    name: string;
    decimals: BigNumber;
    balanceOf: BigNumber;
  }>([
    {
      key: "name",
      address: USDT,
      abi: USDT_ABI, // contract abi
      method: "name()", // contract method name
    },
    {
      key: "decimals",
      address: USDT,
      abi: USDT_ABI, // contract abi
      method: "decimals()", // 或者 decimals 也行， contract method name
    },
    {
      key: "balanceOf",
      address: USDT,
      abi: USDT_ABI, // contract abi
      method: "balanceOf(address)",
      parameters: ["TEvddbScTeNPppiDRWB4Zn8WU3Q7sgEZr1"],
    },
  ]);
  console.log(
    name.toString(),
    decimals.toString(),
    balanceOf.toString() === lazyBalanceOf.toString(),
    JSON.stringify(result)
  );
  debugger;
  //
  const amount = new BigNumber(1).shiftedBy(decimals.toNumber()).toFixed();
  await helper.send(
    (
      await provider.trx.getAccount()
    ).address,
    (tx: TronTransactionRequest) => {
      return provider.trx.signTransaction(tx);
    },
    {
      address: USDT,
      abi: USDT_ABI,
      method: "transfer(address,uint256)",
      parameters: ["THMKhmfLxawXn1xDQhp8pRmEqXFy44hFyf", amount],
    },
    {
      check: CheckTransactionType.Final,
      success() {
        console.log("confirmed");
      },
      error(error) {
        console.error(error);
      },
    }
  );
  console.log("Transfer fast!");
}

main();
