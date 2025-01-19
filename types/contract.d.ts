import { TronWeb } from "tronweb";
import { ContractOption, MultiCallContractOption, TransactionOption, ContractQuery, ContractQueryTrigger, ContractQueryCallback, SignTransaction } from "./types";
import { ContractParamter, SignedTransaction } from "tronweb/lib/esm/types";
export declare class TronContractHelper {
    private provider;
    private multicall;
    private pendingQueries;
    private lazyExec;
    /**
     * @param provider - Tronweb instance
     * @param signer - Adapter, reference the @tronweb3/tronwallet-abstract-adapter
     */
    constructor(provider: TronWeb, multicallAddress?: string, multicallLazyQueryTimeout?: number);
    /**
     * contractOption: {
     *  address:string;// contract address
     *  abi: ABI Fragments (copy from tronscan, not include the entry points, reference the ethers abi.); // contract abi
     *  method: method name, such as transfer
     *  parameters: method parameters.
     * }
     */
    getContractValue<T>(contractOption: ContractOption): Promise<T>;
    getMultiContractValues<T>(contractOptions: MultiCallContractOption[]): Promise<T>;
    signTransaction(signer: string, sign: SignTransaction, contractOption: ContractOption): Promise<SignedTransaction<ContractParamter>>;
    broadcastTransaction(signedTransaction: SignedTransaction<ContractParamter>, options?: TransactionOption): Promise<import("tronweb/lib/esm/types").TransactionInfo | import("./types").FastTransactionResult<ContractParamter>>;
    /**
     * options: TransactionOptions
     * TransactionOptions = {
     *    success?: () => void;
     *    error?: (error: any) => void;
     * }
     */
    send(signer: string, sign: SignTransaction, contractOption: ContractOption, options?: TransactionOption): Promise<import("tronweb/lib/esm/types").TransactionInfo | import("./types").FastTransactionResult<ContractParamter>>;
    get pendingQueriesLength(): number;
    queryByBundle<T>(query: Omit<MultiCallContractOption, "key">): Promise<T>;
    addPendingQuery<T = any>(query: ContractQuery<T>, trigger?: ContractQueryTrigger): Promise<T>;
    executePendingQueries<T>(callback?: ContractQueryCallback<T>): Promise<T>;
}
export default TronContractHelper;
//# sourceMappingURL=contract.d.ts.map