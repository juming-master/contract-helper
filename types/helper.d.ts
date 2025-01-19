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
export declare function executePromise<T>(fn: RetryFunction<T>, callback?: PromiseCallback<T>): Promise<T>;
export declare function executePromiseAndCallback<T>(p: Promise<T>, callback: PromiseCallback<T>): Promise<T>;
export declare function mapSeries<T, R>(array: T[], iterator: (item: T) => Promise<R>): Promise<R[]>;
//# sourceMappingURL=helper.d.ts.map