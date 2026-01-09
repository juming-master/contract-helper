import wait from "wait";
export { default as map, mapSkip as mapSkip, Mapper } from "./p-map";
import { TransactionReceiptError } from "./errors";

/**
 * Deep clone a object
 * @param object The object
 */
export function deepClone<T>(object: T): T {
  return JSON.parse(JSON.stringify(object)) as T;
}

export type RetryFunction<T> = () => Promise<T>;

export function retry<T>(
  fn: RetryFunction<T>,
  retries: number,
  delay: number
): Promise<T> {
  return new Promise((resolve, reject) => {
    function attempt(retries: number): void {
      Promise.resolve()
        .then(fn)
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

export function runWithCallback<T>(
  fn: RetryFunction<T>,
  callback?: PromiseCallback<T>
): Promise<T> {
  const promise = fn();
  if (callback) {
    promise
      .then((value) => {
        try {
          callback.success?.(value);
        } catch (err) {
          callback.error?.(err);
        }
      })
      .catch(callback.error);
  }
  return promise;
}

export async function runPromiseWithCallback<T>(
  p: Promise<T>,
  callback: PromiseCallback<T>
) {
  return p
    .then((result) => {
      try {
        callback.success?.(result);
      } catch (err) {
        try {
          callback.error?.(err);
        } catch {}
      }
      return result;
    })
    .catch((err) => {
      try {
        callback.error?.(err);
      } catch {}
      throw err;
    });
}

export function getDeadline(timeoutMs?: number) {
  if (!timeoutMs || timeoutMs <= 0) {
    return null;
  }
  return Date.now() + timeoutMs;
}

export function ensureNotTimedOut(
  txId: string,
  deadline: number | null,
  message = "Transaction check timeout"
) {
  if (deadline !== null && Date.now() > deadline) {
    throw new TransactionReceiptError(message, { txId });
  }
}
