"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractHelper = void 0;
const helper_1 = require("./helper");
const debounce_1 = __importDefault(require("debounce"));
const uuid_1 = require("uuid");
const tron_1 = require("./tron");
const eth_1 = require("./eth");
class ContractHelper {
    helper;
    pendingQueries = [];
    debounceExecuteLazyCalls;
    multicallMaxPendingLength;
    isTron;
    /**
     * Constructor options for ContractHelper.
     *
     * @param options - Configuration object including:
     *   - `chain` ("tron" | "evm"): Specifies the blockchain type.
     *   - `provider` (TronWeb | ethers.js Provider): Blockchain provider instance.
     *   - `multicallV2Address` (string): Address of the deployed Multicall V2 contract.
     *   - `multicallLazyQueryTimeout` (optional, number): Maximum wait time in milliseconds before executing the pending call queue. Default is usually 1000ms.
     *   - `multicallMaxPendingLength` (optional, number): Maximum number of pending calls in the queue before automatic execution.
     *   - `simulateBeforeSend` (optional, boolean): If true, simulate the transaction using `eth_call` before sending it (only supported on Ethereum).
     *   - `formatValue` (optional, object): Formatting options for returned values:
     *       - `address` ("base58" | "checksum" | "hex"): Format of returned addresses. Default is "base58" for Tron and "checksum" for Ethereum.
     *       - `uint` ("bigint" | "bignumber"): Format for returned uint values. Default is "bignumber".
     *   - `feeCalculation` (optional, number): calculate the desired fee based on network-provided fee parameters. By default, multiply the base fee by 1.2x.
     */
    constructor(options) {
        const chain = options.chain;
        const provider = options.provider;
        const multicallAddr = options.multicallV2Address;
        const multicallLazyQueryTimeout = options.multicallLazyQueryTimeout ?? 1000;
        this.multicallMaxPendingLength = options.multicallMaxLazyCallsLength ?? 10;
        this.isTron = chain === "tron";
        this.helper = (chain === "tron"
            ? new tron_1.TronContractHelper(multicallAddr, provider, options.formatValue, options.feeCalculation)
            : new eth_1.EthContractHelper(multicallAddr, provider, options.simulateBeforeSend ?? true, options.formatValue, options.feeCalculation));
        this.addLazyCall = this.addLazyCall.bind(this);
        this.debounceExecuteLazyCalls = (0, debounce_1.default)(() => {
            return this.executeLazyCalls();
        }, multicallLazyQueryTimeout);
    }
    /**
     * Calls a read-only method on a smart contract and returns the result.
     *
     * @template T The expected return type of the contract call.
     * @param {ContractCallArgs} contractOption - The options required to make a contract call. It includes:
     *   - `address` (string): The address of the smart contract.
     *   - `abi` (optional, any[]): (Optional) The ABI definition of the contract.If the method is provided as a full function signature (e.g., "function decimals() returns (uint8)"), then the ABI is not required.
     *   - `method` (string): The method name to call.(e.g., "transfer")
     *   - `args` (any[]): The arguments to pass to the contract method.
     * @returns {Promise<T>} The result of the contract method call.
     *
     * @example
     * ```ts
     * // Using method name and ABI
     * const symbol = await helper.call<string>({
     *   address: "tokenAddress",
     *   abi: erc20Abi,
     *   method: "symbol",
     * });
     *
     * // Using full method signature without ABI
     * const name = await helper.call<string>({
     *   address: "tokenAddress",
     *   method: "function name() view returns (string)",
     * });
     * ```
     */
    async call(contractCallArgs) {
        return this.helper.call(
        // @ts-ignore
        contractCallArgs);
    }
    /**
     * Executes multiple contract call requests in a single batch. Use muticall v2.
     *
     * This function is used to send multiple read-only contract calls (e.g., `balanceOf`, `symbol`, etc.)
     * in a single network request, improving performance and reducing latency.
     *
     * @template T - The expected return type of the muticall.It must be a key-value object.
     * @param calls - An array of contract call arguments. Each item includes:
     *   - `address` (string): The contract address to call.
     *   - `abi` (optional, any[]): The ABI definition of the contract. If `method` is a full signature, ABI may be omitted.
     *   - `method` (string): The method name or full method signature (e.g., "balanceOf" or "function balanceOf(address) returns (uint256)").
     *   - `args` (any[]): The parameters to pass to the method.
     *
     * @returns A Promise resolving to an object of type `T`, where each key matches
     *          the `key` field from the input array, and the value is the corresponding
     *          decoded result from the contract call.
     *
     * @example
     * ```ts
     * const results = await helper.multicall<{ symbol: string; name: string }>([
     *   {
     *     key: "symbol",
     *     address: "0xToken1",
     *     abi: erc20Abi,
     *     method: "symbol",
     *   },
     *   {
     *     key: "name",
     *     address: "0xToken2",
     *     abi: erc20Abi,
     *     method: "name",
     *   },
     * ]);
     *
     * console.log(results.symbol, results.name);
     * ```
     */
    multicall(multicallArgs) {
        return this.helper.multicall(multicallArgs);
    }
    /**
     * Sends a signed transaction to the blockchain network.
     *
     * @param from - The address of the signer who signed the transaction.
     * @param sendFn - A function that performs the actual transaction sending and signing.
     *                 Its signature varies depending on the chain type:
     *                 - For "tron", it accepts a TronTransactionRequest and a TronProvider(TronWeb).
     *                 - For "evm", it accepts an EvmTransactionRequest and an EvmProvider(ethers Provider).
     *                 It must return a Promise that resolves to the transaction hash/string ID.
     * @param args - The contract send arguments including:
     *                 - `address` (string): The contract address to call.
     *                 - `method` (string): The method name or full method signature (e.g., "transfer" or "function transfer(address,uint256) returns (bool)").
     *                 - `args` (any[]): The parameters to pass to the method.
     *                 - `abi` (optional, any[]): The ABI definition of the contract. If `method` is a full signature, ABI may be omitted.
     *                 - `options` (optional): transaction options such as gasLimit, feeLimit, or value.
     *
     * @returns A Promise resolving to the transaction ID/hash as a string.
     *
     * @example
     * // Example usage for Ethereum
     * const txId = await helper.send(
     *   signerAddress,
     *   async (tx, provider) => {
     *     const signedTx = await wallet.signTransaction(tx);
     *     const response = await provider.broadcastTransaction(signedTx);
     *     return response.hash;
     *   },
     *   {
     *     address: '0xContract',
     *     abi: erc20ABI,
     *     method: 'transfer(address,uint256)',
     *     parameters: ['0xRecipient', 1000],
     *     options: { gasLimit: 21000, value: 0 },
     *   }
     * );
     *
     * @example
     * // Example usage for Tron
     * const txId = await send(
     *   signerAddress,
     *   async (tx, provider) => {
     *     const signedTx = await tronWeb.trx.sign(tx);
     *     const result = await provider.trx.sendRawTransaction(signedTx);
     *     return result.transaction.txID;
     *   },
     *   {
     *     address: 'TContract',
     *     abi: trc20ABI,
     *     method: 'transfer(address,uint256)',
     *     parameters: ['TRecipient', 1000],
     *     options: { feeLimit: 1000000 },
     *   }
     * );
     */
    async send(from, sendTransaction, args) {
        const txId = await this.helper.send(from, 
        // @ts-ignore
        sendTransaction, args);
        return txId;
    }
    /**
     * Sends a signed transaction with additional chain-specific options.
     *
     * @param from - The address of the signer who signed the transaction.
     * @param sendTransaction - The function that performs the actual sending and signing of the transaction.
     *                          Signature varies by chain:
     *                          - For Tron, accepts TronTransactionRequest and TronProvider (TronWeb).
     *                          - For EVM, accepts EvmTransactionRequest and EvmProvider (ethers Provider).
     *                          Must return a Promise resolving to the transaction hash/string ID.
     * @param args - Contract call arguments excluding the `options` field:
     *                 - `address` (string): The contract address to call.
     *                 - `method` (string): The method name or full method signature
     *                   (e.g., "transfer" or "function transfer(address,uint256) returns (bool)").
     *                 - `parameters` (any[]): The parameters passed to the method.
     *                 - `abi` (optional, any[]): The ABI definition of the contract.
     *                   If `method` is a full signature, ABI may be omitted.
     * @param options - Optional chain-specific transaction options:
     *                  - `trx` (TronContractCallOptions): Options for Tron transactions (e.g., feeLimit).
     *                  - `eth` (EvmContractCallOptions): Options for Ethereum transactions (e.g., gasLimit, value).
     *
     * @returns A Promise resolving to the transaction ID/hash as a string.
     *
     * @example
     * // Example usage for Ethereum with additional gas limit option
     * const txId = await helper.sendWithOptions(
     *   signerAddress,
     *   async (tx, provider) => {
     *     const signedTx = await wallet.signTransaction(tx);
     *     const response = await provider.broadcastTransaction(signedTx);
     *     return response.hash;
     *   },
     *   {
     *     address: '0xContract',
     *     method: 'transfer(address,uint256)',
     *     parameters: ['0xRecipient', 1000],
     *   },
     *   {
     *     eth: { gasLimit: 21000, value: 0 },
     *   }
     * );
     *
     * @example
     * // Example usage for Tron with feeLimit option
     * const txId = await helper.sendWithOptions(
     *   signerAddress,
     *   async (tx, provider) => {
     *     const signedTx = await tronWeb.trx.sign(tx);
     *     const result = await provider.trx.sendRawTransaction(signedTx);
     *     return result.transaction.txID;
     *   },
     *   {
     *     address: 'TContract',
     *     method: 'transfer(address,uint256)',
     *     parameters: ['TRecipient', 1000],
     *   },
     *   {
     *     trx: { feeLimit: 1000000 },
     *   }
     * );
     */
    async sendWithOptions(from, sendTransaction, args, options) {
        const call = {
            ...args,
            options: (this.isTron
                ? options?.trx
                : options?.eth),
        };
        return this.send(from, sendTransaction, call);
    }
    /**
     * Checks the status or result of a blockchain transaction by its transaction ID.
     *
     * @param {string} txId - The transaction ID or hash to check.
     * @param {TransactionOption} [options={}] - Optional parameters to customize the check:
     *   - `check` (CheckTransactionType): Specifies the checking mode, either 'fast' or 'final'. Default is 'fast'.
     *   - `success` (function): Optional callback invoked once the transaction is confirmed (finality verified),
     *     even if using fast check mode.
     *   - `error` (function): Optional callback invoked if the transaction fails or final confirmation cannot be verified.
     * @returns {Promise<SimpleTransactionResult>} A promise resolving to the transaction result information, including
     *   the transaction ID and optionally the block number when confirmed.
     *
     * @throws {TransactionReceiptError} Throws if the transaction fails or cannot be confirmed.
     *
     * @example
     * ```ts
     * const result = await helper.checkTransactionResult("0x123abc...", {
     *   check: CheckTransactionType.Fast,
     *   success: (info) => {
     *     console.log("Transaction confirmed:", info.txId);
     *   },
     *   error: (err) => {
     *     console.error("Transaction failed:", err);
     *   },
     * });
     * console.log(result.txId);
     * if (result.blockNumber) {
     *   console.log("Confirmed in block:", result.blockNumber);
     * }
     * ```
     */
    async checkTransactionResult(txId, options) {
        return this.helper.checkTransactionResult(txId, options);
    }
    /**
     * Sends a signed transaction with optional chain-specific options, then checks the transaction result.
     *
     * @param from - The address of the signer who signed the transaction.
     * @param sendTransaction - The function to send and sign the transaction.
     *                          Signature depends on the chain:
     *                          - For Tron: accepts TronTransactionRequest and TronProvider (TronWeb).
     *                          - For EVM: accepts EvmTransactionRequest and EvmProvider (ethers Provider).
     *                          Must return a Promise resolving to the transaction hash/string ID.
     * @param args - Contract call arguments excluding the `options` field:
     *                 - `address` (string): Contract address to call.
     *                 - `method` (string): Method name or full signature (e.g., "transfer" or "function transfer(address,uint256) returns (bool)").
     *                 - `parameters` (any[]): Parameters to pass to the method.
     *                 - `abi` (optional, any[]): ABI definition; can be omitted if method is full signature.
     * @param options - Optional chain-specific transaction options:
     *                  - `trx` (TronContractCallOptions): Tron transaction options (e.g., feeLimit).
     *                  - `eth` (EvmContractCallOptions): Ethereum transaction options (e.g., gasLimit, value).
     * @param callback - Optional callbacks for transaction result checking:
     *                   - `check`: check type (e.g., "fast" or "final"). Default is "fast".
     *                   - `success`: called when transaction is confirmed.
     *                   - `error`: called if transaction fails or cannot be confirmed.
     *
     * @returns A Promise resolving to the final transaction result (`SimpleTransactionResult`).
     *
     * @example
     * const result = await helper.sendAndCheckResult(
     *   signerAddress,
     *   async (tx, provider, chain) => {
     *     if (chain === "tron") {
     *       const signedTransaction = await tronWeb.trx.sign(tx, PRIVATE_KEY);
     *       const response = await provider.trx.sendRawTransaction(signedTransaction);
     *       return response.transaction.txID;
     *     } else if (chain === "evm") {
     *       const signedTx = await ethWallet.signTransaction(tx);
     *       const response = await provider.broadcastTransaction(signedTx);
     *       return response.hash;
     *     } else {
     *       throw new Error(`Unsupported chain: ${chain}`);
     *     }
     *   },
     *   {
     *     address: 'Contract address',
     *     method: 'transfer(address,uint256)',
     *     parameters: ['Recipient', 1000],
     *   },
     *   {
     *     trx: { feeLimit: 1000000 },
     *   },
     *   {
     *     success: (info) => console.log("Tx success", info),
     *     error: (err) => console.error("Tx failed", err),
     *   }
     * );
     */
    async sendAndCheckResult(from, sendTransaction, args, options, callback) {
        const txId = await this.sendWithOptions(from, sendTransaction, args, options);
        return this.checkTransactionResult(txId, callback);
    }
    /**
     * Return the pending call length.
     */
    get lazyCallsLength() {
        return this.pendingQueries.length;
    }
    /**
     * Insert a contract call to the pending call queue, and wait for the pending calls to be executed in a multicall request.
     */
    lazyCall(query) {
        const key = (0, uuid_1.v4)();
        return new Promise((resolve, reject) => {
            this.addLazyCall({
                query: {
                    key,
                    ...query,
                },
                callback: {
                    success: async (value) => {
                        resolve(value);
                        return value;
                    },
                    error: reject,
                },
            });
        });
    }
    /**
     * Insert a contract call to the pending call queue.
     */
    addLazyCall(query, trigger) {
        this.pendingQueries.push(query);
        // If callback is undefined, it will be call instant.
        if (!query.callback ||
            trigger ||
            this.lazyCallsLength >= this.multicallMaxPendingLength) {
            this.executeLazyCalls();
        }
        else {
            this.debounceExecuteLazyCalls();
        }
    }
    /**
     * Execute the pending call queue.
     */
    executeLazyCalls(callback) {
        if (this.lazyCallsLength === 0) {
            return Promise.resolve([]);
        }
        const queries = [...this.pendingQueries];
        this.pendingQueries = [];
        const cb = queries.reduce((prev, cur) => {
            prev[cur.query.key] = cur.callback;
            return prev;
        }, {});
        return (0, helper_1.runWithCallback)(async () => {
            // request max 5 times for multicall query
            const values = await (0, helper_1.retry)(() => this.multicall(queries.map((el) => el.query)), 5, 1000);
            const keys = Object.keys(values);
            const cbResult = await (0, helper_1.map)(keys, async (key) => {
                const value = values[key];
                if (cb[key]) {
                    // request max 5 times for every callback
                    return await (0, helper_1.retry)(async () => cb[key]?.success(value), 5, 1000);
                }
                else {
                    return value;
                }
            }, {
                concurrency: keys.length,
                stopOnError: false,
            });
            if (cbResult.length === 1) {
                return cbResult[0];
            }
            return cbResult;
        }, {
            success: callback?.success,
            error(err) {
                const keys = Object.keys(cb);
                (0, helper_1.map)(keys, async (key) => {
                    if (cb[key]) {
                        cb[key]?.error && cb[key].error(err);
                    }
                }, {
                    concurrency: keys.length,
                    stopOnError: false,
                });
                callback?.error && callback.error(err);
            },
        });
    }
}
exports.ContractHelper = ContractHelper;
exports.default = ContractHelper;
//# sourceMappingURL=contract-helper.js.map