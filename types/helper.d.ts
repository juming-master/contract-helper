export { default as map, mapSkip as mapSkip, Mapper } from "./p-map";
/**
 * Deep clone a object
 * @param object The object
 */
export declare function deepClone<T>(object: T): T;
export type RetryFunction<T> = () => Promise<T>;
export declare function retry<T>(fn: RetryFunction<T>, retries: number, delay: number): Promise<T>;
export interface PromiseCallback<T> {
    success?: {
        (value: T): void;
    };
    error?: {
        (err: any): void;
    };
}
export declare function runWithCallback<T>(fn: RetryFunction<T>, callback?: PromiseCallback<T>): Promise<T>;
export declare function runPromiseWithCallback<T>(p: Promise<T>, callback: PromiseCallback<T>): Promise<T>;
export declare function getDeadline(timeoutMs?: number): number | null;
export declare function ensureNotTimedOut(txId: string, deadline: number | null, message?: string): void;
//# sourceMappingURL=helper.d.ts.map