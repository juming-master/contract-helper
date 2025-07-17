"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapSkip = void 0;
exports.default = map;
exports.mapSkip = Symbol("skip");
async function map(input, mapper, options = {}) {
    const { concurrency = Number.POSITIVE_INFINITY, stopOnError = true, signal, } = options;
    if (input[Symbol.iterator] === undefined &&
        input[Symbol.asyncIterator] === undefined) {
        throw new TypeError(`Expected \`input\` to be Iterable or AsyncIterable`);
    }
    if (typeof mapper !== "function") {
        throw new TypeError("Mapper function is required");
    }
    if (!((Number.isSafeInteger(concurrency) && concurrency >= 1) ||
        concurrency === Number.POSITIVE_INFINITY)) {
        throw new TypeError(`Expected concurrency to be integer >= 1 or Infinity, got ${concurrency}`);
    }
    return new Promise((resolve, reject) => {
        const result = [];
        const errors = [];
        const skippedIndexes = new Map();
        let isRejected = false;
        let isResolved = false;
        let isIterableDone = false;
        let resolvingCount = 0;
        let currentIndex = 0;
        const iterator = input[Symbol.asyncIterator]?.() ??
            input[Symbol.iterator]();
        const cleanup = () => {
            if (signal) {
                signal.removeEventListener("abort", onAbort);
            }
        };
        const onAbort = () => {
            reject(signal.reason);
            cleanup();
        };
        if (signal) {
            if (signal.aborted) {
                reject(signal.reason);
                return;
            }
            signal.addEventListener("abort", onAbort, { once: true });
        }
        const resolveIfDone = () => {
            if (resolvingCount === 0 && isIterableDone && !isResolved) {
                if (!stopOnError && errors.length > 0) {
                    reject(new AggregateError(errors));
                    cleanup();
                    return;
                }
                isResolved = true;
                // 过滤掉标记跳过的元素
                const filteredResult = result.filter((_v, idx) => skippedIndexes.get(idx) !== exports.mapSkip);
                resolve(filteredResult);
                cleanup();
            }
        };
        const next = async () => {
            if (isResolved)
                return;
            const nextItem = await iterator.next();
            const idx = currentIndex++;
            if (nextItem.done) {
                isIterableDone = true;
                resolveIfDone();
                return;
            }
            resolvingCount++;
            (async () => {
                try {
                    if (isResolved)
                        return;
                    const element = await nextItem.value;
                    const mapped = await mapper(element, idx);
                    if (mapped === exports.mapSkip) {
                        skippedIndexes.set(idx, mapped);
                    }
                    result[idx] = mapped;
                    resolvingCount--;
                    await next();
                    resolveIfDone();
                }
                catch (error) {
                    resolvingCount--;
                    if (stopOnError) {
                        isRejected = true;
                        isResolved = true;
                        reject(error);
                        cleanup();
                    }
                    else {
                        errors.push(error);
                        try {
                            await next();
                        }
                        catch (err) {
                            reject(err);
                        }
                        resolveIfDone();
                    }
                }
            })();
        };
        // 启动并发的 runner
        (async () => {
            for (let i = 0; i < Math.min(concurrency, Number.POSITIVE_INFINITY); i++) {
                try {
                    await next();
                }
                catch (error) {
                    reject(error);
                    break;
                }
                if (isIterableDone || isRejected)
                    break;
            }
        })();
    });
}
//# sourceMappingURL=p-map.js.map