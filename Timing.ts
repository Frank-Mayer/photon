import { hashAsync } from "./Math/hash";

/**
 * @async
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const __retriggerableDelayCache = new Map<number, number>();

/**
 * Sets a timer that will get reset on the next call
 * @async
 */
export function retriggerableDelay(
  callback: () => void,
  ms: number
): Promise<number> {
  return new Promise((res) => {
    hashAsync(callback.toString()).then((delayId) => {
      if (__retriggerableDelayCache.has(delayId)) {
        clearTimeout(__retriggerableDelayCache.get(delayId));
      }
      const id = window.setTimeout(callback, ms);
      __retriggerableDelayCache.set(delayId, id);
      res(id);
    });
  });
}

const __doOnceIdempotency = new Set<number>();

/**
 * The doOnce function executes a callback only one time
 * @async
 */
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
