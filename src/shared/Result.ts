/** Outcome of an operation that can fail in an expected way. */
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/** Builds a successful result carrying `value`. */
export const ok = <T>(value: T): { readonly ok: true; readonly value: T } => ({
  ok: true,
  value,
});

/** Builds a failed result carrying `error`. */
export const err = <E>(
  error: E,
): { readonly ok: false; readonly error: E } => ({
  ok: false,
  error,
});

/** True when the result is a success; narrows to the success branch. */
export const isOk = <T, E>(
  result: Result<T, E>,
): result is { readonly ok: true; readonly value: T } => result.ok;

/** True when the result is a failure; narrows to the failure branch. */
export const isErr = <T, E>(
  result: Result<T, E>,
): result is { readonly ok: false; readonly error: E } => !result.ok;
