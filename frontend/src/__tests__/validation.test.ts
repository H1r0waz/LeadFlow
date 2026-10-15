import { describe, expect, it } from 'vitest';
import { leadSchema } from '../validation';

const valid = {
  name: 'Fictional Person',
  company: '',
  email: '',
  phone: '',
  source: '',
  status: 'new',
  estimated_value: '1200.50',
  notes: '',
};

describe('lead form validation', () => {
  it('accepts optional empty contact details and preserves decimal precision', () => {
    expect(leadSchema.parse(valid).estimated_value).toBe('1200.50');
    expect(leadSchema.parse(valid).email).toBe('');
  });

  it.each([
    { name: '   ' },
    { email: 'invalid' },
    { status: 'not-a-stage' },
    { estimated_value: '-1' },
    { estimated_value: '1.001' },
    { estimated_value: '1000000000000' },
    { notes: 'note\0invalid' },
  ])('rejects invalid form input %j', (fields) => {
    expect(leadSchema.safeParse({ ...valid, ...fields }).success).toBe(false);
  });
});
