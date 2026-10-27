/** Normalized failure codes of a hosting or vulnerability source. */
export type HostingErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'rate_limited'
  | 'upstream_error'
  | 'invalid_response'
  | 'missing_credentials';
