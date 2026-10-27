/** Inclusive range of HTTP status codes. */
export interface StatusRange {
  readonly from: number;
  readonly to: number;
}

/** Validated, non-empty set of status codes that count as healthy. */
export type ExpectedStatus = readonly StatusRange[];
