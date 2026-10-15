import { z } from 'zod';
import { statuses } from './api';
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine(
      (value) => !value.includes('\0'),
      'Text cannot contain null characters',
    );
export const leadSchema = z.object({
  name: text(150).min(1, 'Enter a contact name'),
  company: text(200),
  email: text(254).refine(
    (value) => !value || z.email().safeParse(value).success,
    'Enter a valid email address',
  ),
  phone: text(50),
  source: text(100),
  status: z.enum(statuses),
  estimated_value: z
    .string()
    .regex(
      /^\d{1,12}(\.\d{1,2})?$/,
      'Use a nonnegative USD amount with up to 12 digits and 2 decimal places',
    ),
  notes: z
    .string()
    .max(10000)
    .refine(
      (value) => !value.includes('\0'),
      'Text cannot contain null characters',
    ),
});
export type LeadValues = z.infer<typeof leadSchema>;
export const authSchema = z.object({
  email: text(254).pipe(z.email('Enter a valid email address')),
  password: z
    .string()
    .min(12, 'Use at least 12 characters')
    .max(128, 'Use at most 128 characters'),
  name: text(100),
});
export const profileSchema = z.object({
  name: text(100).min(1, 'Enter your name'),
});
