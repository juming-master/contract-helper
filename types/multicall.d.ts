import { AggregateCallContext, ContractCallContext, ContractCallResults, MulticallOption } from "./types";
export declare class Utils {
    /**
     * Deep clone a object
     * @param object The object
     */
    static deepClone<T>(object: T): T;
}
export declare class Multicall {
    private options;
    /**
     * MulticallOptions {
     *   provider: TronWeb;
     *   contractAddress: string;
     * }
  }
     */
    constructor(options: MulticallOption);
    call(_contractCallContexts: ContractCallContext[] | ContractCallContext): Promise<ContractCallResults>;
    /**
     * Build aggregate call context
     * @param contractCallContexts The contract call contexts
     */
    buildAggregateCallContext(contractCallContexts: ContractCallContext[]): AggregateCallContext[];
    /**
     * Find output types from abi
     * @param abi The abi
     * @param methodName The method name
     */
    private findFragmentFromAbi;
    /**
     * Execute the multicall contract call
     * @param calls The calls
     */
    private execute;
    /**
     * Map call contract to match contract format
     * @param calls The calls context
     */
    private mapCallContextToMatchContractFormat;
    /**
     * Build up the aggregated response from the contract response mapping
     * metadata from the calls
     * @param contractResponse The contract response
     * @param calls The calls
     */
    private buildUpAggregateResponse;
}
//# sourceMappingURL=multicall.d.ts.map