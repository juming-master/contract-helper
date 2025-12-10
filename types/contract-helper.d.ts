import { ContractCallArgs, MultiCallArgs, TransactionOption, ContractQuery, ContractQueryTrigger, ContractQueryCallback, SendTransaction, SimpleTransactionResult, TronContractCallOptions, EvmContractCallOptions, ChainType, ContractSendArgs } from "./types";
import { ContractHelperOptions } from "./types";
import { TronContractHelper } from "./tron";
import { EthContractHelper } from "./eth";
import { TransactionRequest } from "ethers";
import { ContractParamter, Transaction } from "tronweb/lib/esm/types";
export declare class ContractHelper<Chain extends ChainType> {
    helper: Chain extends "tron" ? TronContractHelper : EthContractHelper;
    private pendingQueries;
    private debounceExecuteLazyCalls;
    private multicallMaxPendingLength;
    isTron: boolean;
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
    constructor(options: ContractHelperOptions<Chain>);
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
    call<T>(contractCallArgs: ContractCallArgs): Promise<T>;
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
    multicall<T>(multicallArgs: MultiCallArgs[]): Promise<T>;
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
    send(from: string, sendTransaction: SendTransaction<Chain>, args: ContractSendArgs<Chain>): Promise<string>;
    /**
     * Create a unsigned transaction.
     *
     * @param from - The address of the signer who will sign the transaction.
     * @param args - The contract send arguments including:
     *                 - `address` (string): The contract address to call.
     *                 - `method` (string): The method name or full method signature (e.g., "transfer" or "function transfer(address,uint256) returns (bool)").
     *                 - `args` (any[]): The parameters to pass to the method.
     *                 - `abi` (optional, any[]): The ABI definition of the contract. If `method` is a full signature, ABI may be omitted.
     *                 - `options` (optional): transaction options such as gasLimit, feeLimit, or value.
     *
     * @returns A Promise resolving to the transaction.
     */
    createTransaction(from: string, args: ContractSendArgs<Chain>): Promise<Chain extends "tron" ? Transaction<ContractParamter> : TransactionRequest>;
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
    sendWithOptions(from: string, sendTransaction: SendTransaction<Chain>, args: Omit<ContractCallArgs, "options">, options?: {
        trx?: TronContractCallOptions;
        eth?: EvmContractCallOptions;
    }): Promise<string>;
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
    checkTransactionResult(txId: string, options?: TransactionOption): Promise<SimpleTransactionResult>;
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
    sendAndCheckResult(from: string, sendTransaction: SendTransaction<Chain>, args: Omit<ContractCallArgs, "options">, options?: {
        trx?: TronContractCallOptions;
        eth?: EvmContractCallOptions;
    }, callback?: TransactionOption): Promise<SimpleTransactionResult>;
    /**
     * Return the pending call length.
     */
    get lazyCallsLength(): number;
    /**
     * Insert a contract call to the pending call queue, and wait for the pending calls to be executed in a multicall request.
     */
    lazyCall<T>(query: ContractCallArgs): Promise<T>;
    /**
     * Insert a contract call to the pending call queue.
     */
    addLazyCall<T = any>(query: ContractQuery<T>, trigger?: ContractQueryTrigger): void;
    /**
     * Execute the pending call queue.
     */
    executeLazyCalls<T>(callback?: ContractQueryCallback<T>): Promise<T>;
}
export default ContractHelper;
//# sourceMappingURL=contract-helper.d.ts.map