import wait from "wait";

export type RetryFunction<T> = () => Promise<T>;

export function retry<T>(
  fn: RetryFunction<T>,
  retries: number,
  delay: number
): Promise<T> {
  return new Promise((resolve, reject) => {
    function attempt(retries: number): void {
      fn()
        .then(resolve)
        .catch((err) => {
          if (retries > 0) {
            wait(delay)
              .then(() => attempt(retries - 1))
              .catch(reject);
          } else {
            reject(err);
          }
        });
    }
    attempt(retries);
  });
}

export interface PromiseCallback<T> {
  success?: {
    (value: T): void;
  };
  error?: {
    (err: any): void;
  };
}

export function executePromise<T>(
  fn: RetryFunction<T>,
  callback?: PromiseCallback<T>
): Promise<T> {
  if (callback) {
    fn().then(callback.success).catch(callback.error);
  }
  return fn();
}

export function executePromiseAndCallback<T>(
  p: Promise<T>,
  callback: PromiseCallback<T>
) {
  p.then((result) => {
    callback.success && callback.success(result);
  }).catch((err) => {
    callback.error && callback.error(err);
  });
  return p;
}

export async function mapSeries<T, R>(
  array: T[],
  iterator: (item: T) => Promise<R>
): Promise<R[]> {
  const result: R[] = [];

  for (let i = 0; i < array.length; i++) {
    const value = await iterator(array[i]);
    result.push(value);
  }

  return result;
}
