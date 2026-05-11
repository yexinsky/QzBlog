import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import rehypeRaw from 'rehype-raw';
import { codeToHtml, getHighlighter } from 'shiki';
import { createHighlighter } from 'shiki';

// 预定义支持的语言列表
const SUPPORTED_LANGUAGES = [
  'javascript', 'typescript', 'python', 'go', 'rust', 'java', 'c', 'cpp', 'csharp',
  'php', 'ruby', 'swift', 'kotlin', 'scala', 'sql', 'html', 'css', 'json', 'yaml',
  'markdown', 'bash', 'shell', 'dockerfile', 'graphql', 'xml', 'vue', 'jsx', 'tsx',
  'dart', 'elixir', 'erlang', 'haskell', 'lua', 'perl', 'r', 'objectivec', 'groovy',
];

/**
 * 自定义sanitize schema，允许基础格式化和链接
 */
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: ['p', 'br', 'strong', 'em', 'code', 'pre', 'a', 'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div'],
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code || []), 'className', 'class'],
    pre: [...(defaultSchema.attributes?.pre || []), 'className', 'class'],
    span: [...(defaultSchema.attributes?.span || []), 'className', 'class'],
    a: [...(defaultSchema.attributes?.a || []), 'href', 'target', 'rel'],
  },
};

/**
 * 初始化shiki高亮器
 */
let highlighterPromise: Promise<any> | null = null;

async function getShikiHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-light', 'github-dark'],
      langs: SUPPORTED_LANGUAGES,
    });
  }
  return highlighterPromise;
}

/**
 * 使用Shiki进行代码高亮（带主题支持）
 */
async function highlightWithShiki(code: string, lang: string, isDark: boolean): Promise<string> {
  try {
    const highlighter = await getShikiHighlighter();
    const theme = isDark ? 'github-dark' : 'github-light';
    const validLang = SUPPORTED_LANGUAGES.includes(lang) ? lang : 'text';

    const html = await highlighter.codeToHtml(code, {
      lang: validLang,
      theme,
    });

    return html;
  } catch (error) {
    console.error('Shiki highlight error:', error);
    // 降级处理：使用rehype-highlight
    return `<pre class="hljs"><code>${escapeHtml(code)}</code></pre>`;
  }
}

/**
 * HTML转义
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * 渲染Markdown为HTML（用于文章正文）
 */
export async function renderMarkdown(
  content: string,
  options: { isDark?: boolean; enableMermaid?: boolean } = {}
): Promise<string> {
  const { isDark = false, enableMermaid = true } = options;

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeKatex)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeStringify);

  const result = await processor.process(content);
  return result.toString();
}

/**
 * 渲染Markdown为HTML（用于评论，限制更多）
 */
export async function renderCommentMarkdown(content: string): Promise<string> {
  // 评论只允许基础格式：加粗、代码、链接
  const commentSanitizeSchema = {
    ...defaultSchema,
    tagNames: ['p', 'br', 'strong', 'em', 'code', 'pre', 'a'],
    attributes: {
      ...defaultSchema.attributes,
      code: ['className', 'class'],
      pre: ['className', 'class'],
      a: ['href', 'target', 'rel'],
    },
  };

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeSanitize, commentSanitizeSchema)
    .use(rehypeStringify);

  const result = await processor.process(content);
  return result.toString();
}

/**
 * 提取文章目录（TOC）
 */
export interface TocItem {
  id: string;
  text: string;
  level: number;
  children: TocItem[];
}

export function extractToc(content: string): TocItem[] {
  const toc: TocItem[] = [];
  const headingRegex = /^(#{1,4})\s+(.+)$/gm;
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = generateHeadingId(text);

    toc.push({
      id,
      text,
      level,
      children: [],
    });
  }

  // 构建层级结构
  const result: TocItem[] = [];
  const stack: TocItem[] = [];

  for (const item of toc) {
    while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      result.push(item);
    } else {
      stack[stack.length - 1].children.push(item);
    }

    stack.push(item);
  }

  return result;
}

/**
 * 生成标题ID
 */
export function generateHeadingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w一-龥\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * 计算文章字数
 */
export function countWords(content: string): number {
  // 移除代码块
  const withoutCode = content.replace(/```[\s\S]*?```/g, '');
  // 移除行内代码
  const withoutInlineCode = withoutCode.replace(/`[^`]+`/g, '');
  // 移除链接
  const withoutLinks = withoutInlineCode.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // 移除图片
  const withoutImages = withoutLinks.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');
  // 移除Markdown标题符号
  const withoutHeadings = withoutImages.replace(/^#+\s+/gm, '');
  // 移除加粗、斜体标记
  const withoutEmphasis = withoutHeadings.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1');

  // 计算字符数
  const chineseChars = (withoutEmphasis.match(/[一-龥]/g) || []).length;
  const englishWords = withoutEmphasis
    .replace(/[一-龥]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

  return chineseChars + englishWords;
}

/**
 * 生成文章摘要
 */
export function generateSummary(content: string, maxLength: number = 200): string {
  // 移除代码块
  const withoutCode = content.replace(/```[\s\S]*?```/g, '');
  // 移除行内代码
  const withoutInlineCode = withoutCode.replace(/`[^`]+`/g, '');
  // 移除图片
  const withoutImages = withoutInlineCode.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');
  // 移除链接
  const withoutLinks = withoutImages.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // 移除标题符号
  const withoutHeadings = withoutLinks.replace(/^#+\s+/gm, '');
  // 移除多个空格和换行
  const cleaned = withoutHeadings.replace(/\s+/g, ' ').trim();

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  // 在句子边界截断
  const truncated = cleaned.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  const lastPunctuation = Math.max(
    truncated.lastIndexOf('。'),
    truncated.lastIndexOf('！'),
    truncated.lastIndexOf('。'),
    truncated.lastIndexOf('?'),
    truncated.lastIndexOf('.')
  );

  if (lastPunctuation > maxLength * 0.7) {
    return truncated.slice(0, lastPunctuation + 1);
  }

  if (lastSpace > maxLength * 0.7) {
    return truncated.slice(0, lastSpace) + '...';
  }

  return truncated + '...';
}

/**
 * 生成slug（URL友好的标识符）
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s一-龥-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * 生成唯一的slug（带时间戳后缀）
 */
export function generateUniqueSlug(title: string): string {
  const baseSlug = generateSlug(title);
  const timestamp = Date.now().toString(36);
  return `${baseSlug}-${timestamp}`;
}

export { SUPPORTED_LANGUAGES, escapeHtml };
export default {
  renderMarkdown,
  renderCommentMarkdown,
  extractToc,
  generateHeadingId,
  countWords,
  generateSummary,
  generateSlug,
  generateUniqueSlug,
  SUPPORTED_LANGUAGES,
};