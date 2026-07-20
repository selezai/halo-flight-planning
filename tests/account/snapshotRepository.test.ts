import { describe, expect, it } from 'vitest';
import { isMissingRelationError } from '@/lib/account/snapshotRepository';

describe('snapshot repository errors', () => {
  it('detects missing table errors so read requests can return an empty snapshot', () => {
    expect(isMissingRelationError({ code: '42P01' })).toBe(true);
    expect(isMissingRelationError({ code: '23505' })).toBe(false);
    expect(isMissingRelationError(new Error('relation missing'))).toBe(false);
  });
});
