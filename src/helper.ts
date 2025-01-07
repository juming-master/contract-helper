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
