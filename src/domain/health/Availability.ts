/** Uptime for a window: a ratio between 0 and 1, or no data when too few checks exist. */
export type Availability =
  | { readonly kind: 'no_data' }
  | { readonly kind: 'available'; readonly ratio: number };
