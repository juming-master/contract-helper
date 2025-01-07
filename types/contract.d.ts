import { TronWeb } from "tronweb";
import { ContractOption, MultiCallContractOption, Wallet, TransactionOption } from "./types";
export declare class TronContractHelper {
    private provider;
    private multicall;
    private signer;
    /**
     * @param provider - Tronweb instance
     * @param signer - Adapter, reference the @tronweb3/tronwallet-abstract-adapter
     */
    constructor(provider: TronWeb, signer: Wallet, multicallAddress?: string);
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
    /**
     * options: TransactionOptions
     * TransactionOptions = {
     *    success?: () => void;
     *    error?: (error: any) => void;
     * }
     */
    send(contractOption: ContractOption, options?: TransactionOption): Promise<import("tronweb/lib/esm/types").TransactionInfo | import("./types").FastTransactionResult<import("tronweb/lib/esm/types").ContractParamter>>;
}
export default TronContractHelper;
//# sourceMappingURL=contract.d.ts.map