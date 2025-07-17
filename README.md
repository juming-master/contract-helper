# contract-helper

A unified smart contract interaction helper for Ethereum (via `ethers`) and Tron (via `tronweb`).  
Supports batched read queries via Multicall, lazy call queuing, transaction sending, and result checking — with built-in debounce and retry mechanisms.

---

## ✨ Features

- ✅ Compatible with both **Ethereum** (Ethers.js) and **Tron** (TronWeb)
- 📦 Supports:
  - `call()` – single smart contract read call
  - `multicall()` – batched smart contract reads using Multicall v2
  - `send()` – signed transaction sending
  - `lazyCall()` – queued batched calls with auto-trigger and debounce
  - `checkTransactionResult()` – transaction receipt/result tracking
- ⏱️ Automatic `lazyCall()` batching based on:
  - `multicallMaxLazyCallsLength`
  - `multicallLazyQueryTimeout`
- 🔁 Built-in retry logic for multicalls and callbacks
- 💡 Supports success/error callback injection for each call
- 🧪 Written in **TypeScript** with full typings

---

## 📦 Installation

```bash
npm install contract-helper
# or
yarn add contract-helper
```

## Usage

Setup for Ethereum

```typescript
import { ContractHelper } from "contract-helper";
import { JsonRpcProvider, Wallet } from "ethers";

const provider = new JsonRpcProvider("<ETH_RPC>");

const helper = new ContractHelper({
  provider,
  multicallV2Address: "<MULTICALL_V2_ADDRESS>",
  simulateBeforeSend: true, // optional, defaults to true
});
```

Setup for Tron

```typescript
import TronWeb from "tronweb";
import { ContractHelper } from "contract-helper";

const tronWeb = new TronWeb({
  fullHost: "<TRON_NODE_URL>",
  privateKey: "<PRIVATE_KEY>",
});

const helper = new ContractHelper({
  provider: tronWeb,
  multicallV2Address: "<MULTICALL_CONTRACT_ADDRESS>",
});
```

## 📚 API Reference

### call\<T\>(args: ContractCallArgs): Promise\<T\>

Calls a single read-only smart contract method.

```typescript

interface ContractCallArgs {
  address: string;                       // Contract address
  abi?: AbiFragment[];                    // ABI definition (single function ABI is enough)
  method: string;                        // Method name or full signature (see below)
  parameters?: any[];                    // Arguments passed to the function
}

const result = await helper.call<string>({
  address: "0xToken",
  abi: ERC20_ABI,
  method: "symbol()",
});

or use full signature without abi

const result = await helper.call<string>({
  address: "0xToken",
  method: "function symbol() view returns (string)",
});
```

### multicall\<T\>(args: MultiCallArgs): Promise\<T\>

Batch read-only calls. T should be an key-value object.

```typescript

type MultiCallArgs = {
  key: string;                            // key is the key in the T.
  address: string;                       // Contract address
  abi?: AbiFragment[];                    // ABI definition (single function ABI is enough)
  method: string;                        // Method name or full signature (see below)
  parameters?: any[];                    // Arguments passed to the function
}[]

const results = await ethHelper.multicall<{symbol: string,name: string}>([
    {
      address: '0xToken1',
      abi: erc20ABI,
      method: 'symbol',
    },
    {
      address: '0xToken2',
      abi: erc20ABI,
      method: 'name',
    }
  ]);
console.log(results.symbol,results.name);
```

### send(from: string, sendTransaction: SendTransaction, contractCall: ContractCallArgs): Promise<string>

Send a transaction and return the transaction hash.

```typescript
// Type definitions
interface EthSendTransaction {
  (tx: EthTransactionRequest, provider: EthProvider): Promise<string>;
}

interface TronSendTransaction {
  (tx: TronTransactionRequest, provider: TronWeb): Promise<string>;
}

type SendTransaction<Provider extends TronWeb | EthProvider> = Provider extends TronWeb
  ? TronSendTransaction
  : EthSendTransaction;

interface ContractCallArgs {
  address: string;                      // Contract address
  abi?: AbiFragment[];                  // ABI definition (a single function ABI is sufficient)
  method: string;                      // Method name or full signature (see below)
  parameters?: any[];                  // Arguments passed to the function
  // Options for sending transactions such as gasLimit (ETH), feeLimit (TRON), value (ETH payment), etc.
  options?: {
    maxFeePerGas?: string | number | bigint; // Used for Ethereum
    feeLimit?: string | number | bigint;     // Used for Tron
    value?: string | number | bigint;        // Used for Ethereum
    [key: string]: any;
  };
}

// Ethereum Transaction Sending Example
const ethWallet = new Wallet(PRIVATE_KEY);
const txId = await ethHelper.send(
  signerAddress,
  async (tx: EthTransactionRequest, provider: Provider) => {
    const signedTx = await ethWallet.signTransaction(tx);
    const response = await provider.broadcastTransaction(signedTx);
    return response.hash;
  },
  {
    address: 'TokenAddress',
    abi: erc20ABI,
    method: 'transfer(address,uint256)',
    parameters: ['0xReceipt', '1000000'],
    options: {
      value: 1_000_000_000_000_000_000n,
      maxFeePerGas: 65327n,
    },
  }
);

// Tron Transaction Sending Example
const signer = new TronWeb({
  fullNode: FULL_NODE,
  solidityNode: SOLIDITY_NODE,
  eventServer: EVENT_SERVER,
  privateKey: PRIVATE_KEY,
});

const txId = await tronHelper.send(
  signerAddress, // connected wallet address
  async function (tx: TronTransactionRequest, provider: TronWeb) {
    const signedTransaction = await signer.trx.sign(tx, PRIVATE_KEY);
    const response = await provider.trx.sendRawTransaction(signedTransaction);
    return response.transaction.txID;
  },
  {
    address: 'TTokenAddress',
    abi: trc20ABI,
    method: 'transfer(address,uint256)',
    parameters: ['TRecipient', '1000000'],
    options: {
      callValue: 1_000_000n,
      feeLimit: 65327n,
    },
  }
);

```

### checkTransactionResult(txID: string, options?: TransactionOption): Promise<SimpleTransactionResult>

Check the status or result of a blockchain transaction by its transaction ID.

```typescript
export interface SimpleTransactionResult {
  blockNumber?: BigNumber;  // Optional block number where the transaction was confirmed, only in final check result.
  txId: string;             // Transaction ID or hash
}

export enum CheckTransactionType {
  Fast = "fast",    // Fast check mode
  Final = "final",  // Final (confirmed) check mode
}

export type TransactionOption = {
  check?: CheckTransactionType;                                   // Specify check mode: fast or final, default is fast.
  // Optional success callback. Will be triggered only after the transaction has been fully confirmed (i.e., finality is verified), even in fast mode.
  success?: (transactionInfo: SimpleTransactionResult) => void;  
  // Optional error callback. Will be triggered if the transaction fails or finality cannot be verified.
  error?: (error: any) => void;                                  
};

// Demo

const txID = "0x123abc...";

const result = await helper.checkTransactionResult(txID, {
  check: CheckTransactionType.Fast,
  success: (info) => {
    // This is called when fianl check is completed even check is setted CheckTransactionType.Fast
    console.log("Transaction succeeded:", info);
  },
  error: (err) => {
    console.error("Transaction check reverted:", err);
  },
});

console.log("Transaction ID:", result.txId);
console.log("Block Number:", result.blockNumber);

```

## 💤 Lazy Calls

The ContractHelper provides a lazy execution mechanism for batching multiple contract calls and sending them at once in a later step.

### addLazyCall(call: ContractCall): void

Adds a contract call to the internal queue. The call will not be executed immediately.

```typescript

contractHelper.addLazyCall({
  address: usdtAddress,
  abi: usdtAbi,
  method: 'balanceOf',
  args: ['0x1234...abcd'],
});

```

### lazyCall\<T\>(call: ContractCallArgs): Promise\<T\>

Adds a contract call to an internal queue, which will be automatically executed via multicall once either:

- the number of queued calls reaches a predefined threshold (multicallMaxPendingLength), or
- the maximum waiting time (multicallLazyQueryTimeout) has elapsed since the first call was queued.
  
The return value is the same as call, but the execution is deferred and batched with other calls in a multicall.

> Noticie: do not use multiple await lazyCall(...) in parallel like:

```typescript
await lazyCall(...);
await lazyCall(...);
await lazyCall(...);
```

This causes multiple multicall requests to be sent with only one call each, which defeats the purpose of batching.

```typescript
const result = await Promise.all([
  helper.lazyCall({address:'0xabc',method:'symbol'}),
  helper.lazyCall({address:'0xabc',method:'name'}),
  helper.lazyCall({address:'0xabc',method:'balanceOf'}),
])
console.log(results[0]);//symbol
```

### executeLazyCalls\<T\>(): Promise\<T\>

Executes all previously added lazy calls.Only used after multi lazyCall.

Internally, this performs a multicall request at the network level (if supported), and then resolves each lazy call's associated promise with the corresponding decoded result.
Returns an array of decoded results, in the same order as the lazy calls.

```typescript
const result = Promise.all([
  helper.lazyCall({address:'0xabc',method:'symbol'}),
  helper.lazyCall({address:'0xabc',method:'name'}),
  helper.lazyCall({address:'0xabc',method:'balanceOf'}),
])
helper.executeLazyCalls<{name:string}>();
await result;
console.log(results[0]);//symbol
```

## ⚙️ ContractHelperOptions

The ContractHelperOptions object is used to configure the behavior of the ContractHelper when it's instantiated.

```typescript

interface ContractHelperOptions<Provider extends TronWeb | EthProvider> {
  provider: Provider;                        // Required. Ethers.js provider or TronWeb instance.
  multicallV2Address: string;                // Required. Address of the deployed Multicall V2 contract.
  multicallLazyQueryTimeout?: number;        // Optional. Max wait time (ms) before executing the lazy call queue. Default: 1000ms.
  multicallMaxLazyCallsLength?: number;      // Optional. Max number of pending calls before automatic execution. Default: 10.
  simulateBeforeSend?: boolean;              // Optional (ETH only). Whether to simulate the transaction with eth_call before sending.
  formatValue?: {
    address?: "base58" | "checksum" | "hex"; // Optional. Format returned addresses. "base58"/"checksum"/"hex" for Tron, "checksum"/"hex" for ETH.
    uint?: "bigint" | "bignumber";           // Optional. Format for returned uint values. Default is "bignumber".
  };
}

```