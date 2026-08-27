import { z } from 'zod';

export const safeHttpUrl = z.string().url().superRefine((value, ctx) => {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Only HTTP(S) URLs are allowed' });
    }
  } catch {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid URL' });
  }
});

export const safeHttpsUrl = z.string().url().superRefine((value, ctx) => {
  try {
    if (new URL(value).protocol !== 'https:') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Only HTTPS URLs are allowed' });
    }
  } catch {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid URL' });
  }
});
