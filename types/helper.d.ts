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
export declare function executePromiseAndCallback<T>(p: Promise<T>, callback: PromiseCallback<T>): Promise<T>;
//# sourceMappingURL=helper.d.ts.map