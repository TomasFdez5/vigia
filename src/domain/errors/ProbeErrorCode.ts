/** Normalized failure codes of a health probe. */
export type ProbeErrorCode =
  | 'timeout'
  | 'dns'
  | 'connection'
  | 'tls'
  | 'too_many_redirects'
  | 'invalid_url'
  | 'unexpected';
