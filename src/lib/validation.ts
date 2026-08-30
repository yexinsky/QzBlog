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

/**
 * 站内图片地址：接受绝对 http(s) URL 与站内相对路径。
 * v1.1 附件库本地存储策略返回 /api/files/{key} 形式的相对 URL，
 * 严格 z.string().url() 会误拒，故允许以 / 开头的站内路径。
 */
export const siteImageUrl = z
  .string()
  .trim()
  .max(500, '图片地址最多 500 个字符')
  .refine((value) => /^https?:\/\//i.test(value) || value.startsWith('/'), {
    message: '图片地址格式不正确',
  });
