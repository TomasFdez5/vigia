import { describe, expect, it } from 'vitest';
import { lintCommitMessage as lint } from './helpers';

// A header of exactly `length` characters: "feat: " followed by padding.
const headerOfLength = (length: number): string =>
  `feat: ${'a'.repeat(length - 'feat: '.length)}`;

describe('commit message rules', () => {
  it('rejects a non-conventional message', () => {
    expect(lint('update stuff\n').status).not.toBe(0);
  });

  it('rejects an unknown type', () => {
    expect(lint('wip: add something\n').status).not.toBe(0);
  });

  it('rejects a header of 73 characters', () => {
    expect(lint(`${headerOfLength(73)}\n`).status).not.toBe(0);
  });

  it('accepts a header of exactly 72 characters', () => {
    expect(lint(`${headerOfLength(72)}\n`).status).toBe(0);
  });

  it('accepts a valid message without scope', () => {
    expect(lint('fix: handle empty response\n').status).toBe(0);
  });

  it('accepts a free-form scope', () => {
    expect(lint('feat(any-scope_1): add thing\n').status).toBe(0);
  });
});
