import { hashAsync, hash } from "../Math/hash";

const __doOnceIdempotency = new Set<number>();

/**
 * The doOnce function executes a callback only one time
 * @async
 */
export function doOnce<T>(callback: () => T): Promise<T>;
/**
 * The doOnce function executes a callback only one time. if the callback function has already been executed once, the error function is executed.
 * @async
 */
export function doOnce<T, E>(callback: () => T, err: () => E): Promise<T>;

export function doOnce<T>(callback: () => T, err?: () => any): Promise<T> {
  return new Promise((res, rej) => {
    hashAsync(callback.toString()).then((idempotency) => {
      if (!__doOnceIdempotency.has(idempotency)) {
        __doOnceIdempotency.add(idempotency);
        res(callback());
      } else if (err) {
        rej(err());
      }
    });
  });
}

/**
 * The doOnce function executes a callback only one time
 */
export function doOnceSync<T>(callback: () => T): T | null;
/**
 * The doOnce function executes a callback only one time. if the callback function has already been executed once, the error function is executed.
 */
export function doOnceSync<T, E>(callback: () => T, err: () => E): T | E;

export function doOnceSync<T>(callback: () => T, err?: () => any) {
  const idempotency = hash(callback.toString());

  if (!__doOnceIdempotency.has(idempotency)) {
    __doOnceIdempotency.add(idempotency);
    return callback();
  } else if (err) {
    return err();
  }

  return null;
}
