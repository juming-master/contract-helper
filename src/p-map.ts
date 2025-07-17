export const mapSkip = Symbol("skip");

export type Mapper<Element, NewElement> = (
  element: Element,
  index: number
) => Promise<NewElement | typeof mapSkip> | NewElement | typeof mapSkip;

export type Options = {
  concurrency?: number; // 并发数，默认无限
  stopOnError?: boolean; // 出错时是否停止，默认true
  signal?: AbortSignal; // 中断信号
};

export default async function map<Element, NewElement>(
  input:
    | Iterable<Element | Promise<Element>>
    | AsyncIterable<Element | Promise<Element>>,
  mapper: Mapper<Element, NewElement>,
  options: Options = {}
): Promise<Array<Exclude<NewElement, typeof mapSkip>>> {
  const {
    concurrency = Number.POSITIVE_INFINITY,
    stopOnError = true,
    signal,
  } = options;

  if (
    input[Symbol.iterator] === undefined &&
    input[Symbol.asyncIterator] === undefined
  ) {
    throw new TypeError(`Expected \`input\` to be Iterable or AsyncIterable`);
  }

  if (typeof mapper !== "function") {
    throw new TypeError("Mapper function is required");
  }

  if (
    !(
      (Number.isSafeInteger(concurrency) && concurrency >= 1) ||
      concurrency === Number.POSITIVE_INFINITY
    )
  ) {
    throw new TypeError(
      `Expected concurrency to be integer >= 1 or Infinity, got ${concurrency}`
    );
  }

  return new Promise((resolve, reject) => {
    const result: any[] = [];
    const errors: unknown[] = [];
    const skippedIndexes = new Map<
      number,
      typeof mapSkip | Awaited<NewElement>
    >();
    let isRejected = false;
    let isResolved = false;
    let isIterableDone = false;
    let resolvingCount = 0;
    let currentIndex = 0;

    const iterator =
      (input as any)[Symbol.asyncIterator]?.() ??
      (input as Iterable<Element>)[Symbol.iterator]();

    const cleanup = () => {
      if (signal) {
        signal.removeEventListener("abort", onAbort);
      }
    };

    const onAbort = () => {
      reject(signal!.reason);
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
        const filteredResult = result.filter(
          (_v, idx) => skippedIndexes.get(idx) !== mapSkip
        );

        resolve(filteredResult);
        cleanup();
      }
    };

    const next = async () => {
      if (isResolved) return;

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
          if (isResolved) return;

          const element = await nextItem.value;
          const mapped = await mapper(element, idx);

          if (mapped === mapSkip) {
            skippedIndexes.set(idx, mapped);
          }
          result[idx] = mapped;

          resolvingCount--;
          await next();
          resolveIfDone();
        } catch (error) {
          resolvingCount--;
          if (stopOnError) {
            isRejected = true;
            isResolved = true;
            reject(error);
            cleanup();
          } else {
            errors.push(error);
            try {
              await next();
            } catch (err) {
              reject(err);
            }
            resolveIfDone();
          }
        }
      })();
    };

    // 启动并发的 runner
    (async () => {
      for (
        let i = 0;
        i < Math.min(concurrency, Number.POSITIVE_INFINITY);
        i++
      ) {
        try {
          await next();
        } catch (error) {
          reject(error);
          break;
        }
        if (isIterableDone || isRejected) break;
      }
    })();
  });
}
