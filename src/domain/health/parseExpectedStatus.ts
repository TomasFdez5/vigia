import { err, ok } from '../../shared/Result';
import type { Result } from '../../shared/Result';

import type { ExpectedStatus, StatusRange } from './ExpectedStatus';

/** Failure code of the expected-status parser. */
export type ExpectedStatusErrorCode = 'invalid_expected_status';

const MIN_STATUS = 100;
const MAX_STATUS = 599;
const TOKEN = /^(\d+)(?:\s*-\s*(\d+))?$/;

const parseSegment = (segment: string): StatusRange | null => {
  const match = TOKEN.exec(segment.trim());
  if (match === null) {
    return null;
  }
  const from = Number(match[1]);
  const to = match[2] === undefined ? from : Number(match[2]);
  if (from < MIN_STATUS || to > MAX_STATUS || from > to) {
    return null;
  }
  return { from, to };
};

/**
 * Parses a definition such as `200-399,401` (single codes, ranges, lists of
 * codes from 100 to 599, whitespace tolerated). Anything malformed fails with
 * `invalid_expected_status` instead of widening what counts as normal.
 */
export const parseExpectedStatus = (
  definition: string,
): Result<ExpectedStatus, ExpectedStatusErrorCode> => {
  const ranges: StatusRange[] = [];
  for (const segment of definition.split(',')) {
    const range = parseSegment(segment);
    if (range === null) {
      return err('invalid_expected_status');
    }
    ranges.push(range);
  }
  return ok(ranges);
};
