# 测试模拟数据

// 文章数据
export const mockPosts = [
  {
    id: '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6',
    author_id: 'author-123',
    title: '深入理解 Go 并发 — Goroutine 调度原理',
    slug: 'understanding-go-concurrency-goroutine-scheduling',
    content_md: `# Goroutine 调度原理

Go 的并发模型基于 GMP 模型：
- G: Goroutine
- M: Machine (OS Thread)
- P: Processor

## 调度器结构

Go 调度器包含以下组件：
- **全局队列 (Global Queue)**: 存放等待运行的 G
- **本地队列 (Local RunQueue)**: 每个 P 拥有一个本地队列，最多存放 256 个 G
- **工作窃取 (Work Stealing)**: 空闲的 P 从其他 P 的本地队列窃取 G

## 代码示例

\`\`\`go
func main() {
    // 创建一个新的 Goroutine
    go func() {
        fmt.Println("Hello from goroutine!")
    }()

    // 等待 goroutine 完成
    time.Sleep(time.Second)
}
\`\`\`

更多内容请参考[官方文档](https://go.dev)。
`,
    content_html: '<h1>Goroutine 调度原理</h1>...',
    summary: '深入理解 Go 并发的 GMP 调度模型与工作窃取机制',
    cover_image: 'https://example.com/images/go-concurrency.jpg',
    status: 'published',
    is_pinned: true,
    word_count: 2500,
    like_count: 128,
    view_count: 3250,
    scheduled_at: null,
    published_at: '2026-03-15T10:00:00Z',
    cancel_scheduled: false,
    created_at: '2026-03-14T15:30:00Z',
    updated_at: '2026-03-15T10:00:00Z',
    tags: [
      { id: 'tag-1', name: 'Go', slug: 'go' },
      { id: 'tag-2', name: '并发编程', slug: 'concurrency' },
    ],
  },
  {
    id: '2b3c4d5e-6f7a-8b9c-0d1e-f2g3h4i5j6k7',
    author_id: 'author-123',
    title: 'React Hooks 最佳实践',
    slug: 'react-hooks-best-practices',
    content_md: `# React Hooks 最佳实践

Hook 是 React 16.8 引入的新特性，让我们可以在函数组件中使用 state 和其他 React 特性。

## useState

\`\`\`jsx
function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}
\`\`\`

## useEffect

\`\`\`jsx
useEffect(() => {
  // 副作用逻辑
  return () => {
    // 清理逻辑
  };
}, [dependencies]);
\`\`\`
`,
    content_html: '<h1>React Hooks 最佳实践</h1>...',
    summary: '掌握 React Hooks 的核心概念与最佳实践',
    cover_image: null,
    status: 'published',
    is_pinned: false,
    word_count: 1800,
    like_count: 85,
    view_count: 2100,
    scheduled_at: null,
    published_at: '2026-04-10T14:00:00Z',
    cancel_scheduled: false,
    created_at: '2026-04-09T09:00:00Z',
    updated_at: '2026-04-10T14:00:00Z',
    tags: [
      { id: 'tag-3', name: 'React', slug: 'react' },
      { id: 'tag-4', name: 'Hooks', slug: 'hooks' },
    ],
  },
  {
    id: '3c4d5e6f-7a8b-9c0d-1e2f-3g4h5i6j7k8',
    author_id: 'author-123',
    title: '定时发布的测试文章',
    slug: 'scheduled-test-post',
    content_md: '# 定时发布测试

这是一篇定时发布的文章。
',
    content_html: '<h1>定时发布测试</h1>',
    summary: '测试定时发布功能',
    cover_image: null,
    status: 'scheduled',
    is_pinned: false,
    word_count: 50,
    like_count: 0,
    view_count: 0,
    scheduled_at: '2026-05-15T10:00:00Z',
    published_at: null,
    cancel_scheduled: false,
    created_at: '2026-05-11T08:00:00Z',
    updated_at: '2026-05-11T08:00:00Z',
    tags: [],
  },
  {
    id: '4d5e6f7a-8b9c-0d1e-2f3a-4g5h6i7j8k9',
    author_id: 'author-123',
    title: '草稿文章',
    slug: 'draft-post',
    content_md: '# 草稿文章

这是一个草稿。
',
    content_html: '<h1>草稿文章</h1>',
    summary: '草稿',
    cover_image: null,
    status: 'draft',
    is_pinned: false,
    word_count: 10,
    like_count: 0,
    view_count: 0,
    scheduled_at: null,
    published_at: null,
    cancel_scheduled: false,
    created_at: '2026-05-10T10:00:00Z',
    updated_at: '2026-05-10T10:00:00Z',
    tags: [],
  },
];

// 动态数据
export const mockMoments = [
  {
    id: 'moment-1',
    content: '刚完成了 Go 并发系列的第一篇文章，期待大家的反馈！',
    image_url: null,
    like_count: 15,
    published_at: '2026-05-10T14:30:00Z',
    created_at: '2026-05-10T14:30:00Z',
  },
  {
    id: 'moment-2',
    content: 'React 18 的并发模式真的很强大，测试了一下 useTransition，感觉性能提升明显。',
    image_url: 'https://example.com/images/react-demo.jpg',
    like_count: 23,
    published_at: '2026-05-09T10:15:00Z',
    created_at: '2026-05-09T10:15:00Z',
  },
  {
    id: 'moment-3',
    content: '学习 Kubernetes 的第三天，已经能够部署简单的应用了。',
    image_url: null,
    like_count: 8,
    published_at: '2026-05-08T20:00:00Z',
    created_at: '2026-05-08T20:00:00Z',
  },
];

// 评论数据
export const mockComments = [
  {
    id: 'comment-1',
    post_id: '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6',
    parent_id: null,
    root_id: null,
    depth: 0,
    author_name: '张三',
    author_email: 'zhangsan@example.com',
    content_md: '非常好的文章！',
    content_html: '<p>非常好的文章！</p>',
    status: 'approved',
    is_pinned: false,
    ip_address: '192.168.1.100',
    created_at: '2026-03-16T08:30:00Z',
  },
  {
    id: 'comment-2',
    post_id: '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6',
    parent_id: 'comment-1',
    root_id: 'comment-1',
    depth: 1,
    author_name: '李四',
    author_email: 'lisi@example.com',
    content_md: '同意！作者讲得很清楚',
    content_html: '<p>同意！作者讲得很清楚</p>',
    status: 'approved',
    is_pinned: false,
    ip_address: '192.168.1.101',
    created_at: '2026-03-16T09:15:00Z',
  },
  {
    id: 'comment-3',
    post_id: '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6',
    parent_id: null,
    root_id: null,
    depth: 0,
    author_name: '王五',
    author_email: 'wangwu@example.com',
    content_md: '可以详细讲讲 GMP 的数据结构吗？',
    content_html: '<p>可以详细讲讲 GMP 的数据结构吗？</p>',
    status: 'pending',
    is_pinned: false,
    ip_address: '192.168.1.102',
    created_at: '2026-03-17T10:00:00Z',
  },
];

// 点赞数据
export const mockLikes = {
  post_likes: [
    { id: 'like-1', post_id: '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6', ip_address: '192.168.1.200', created_at: '2026-03-16T12:00:00Z' },
    { id: 'like-2', post_id: '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6', ip_address: '192.168.1.201', created_at: '2026-03-16T14:00:00Z' },
  ],
  moment_likes: [
    { id: 'moment-like-1', moment_id: 'moment-1', ip_address: '192.168.1.200', created_at: '2026-05-10T15:00:00Z' },
  ],
};

// 用户数据
export const mockUsers = {
  admin: {
    id: 'author-123',
    username: 'qzhou',
    email: 'qzhou@example.com',
    github_id: 'github-12345',
    avatar_url: 'https://example.com/avatar.jpg',
    role: 'admin',
    bio: '全栈开发者，热爱技术分享',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  reader: {
    id: 'reader-456',
    username: 'visitor',
    email: 'visitor@example.com',
    github_id: null,
    avatar_url: null,
    role: 'reader',
    bio: null,
    created_at: '2026-05-01T00:00:00Z',
    updated_at: '2026-05-01T00:00:00Z',
  },
};

// XSS 测试数据
export const xssTestCases = [
  {
    name: 'Script 标签',
    input: '<script>alert("XSS")</script>',
    expected: '',
  },
  {
    name: 'onerror 事件',
    input: '<img src=x onerror="alert(1)">',
    expected: '<img src="x">',
  },
  {
    name: 'onclick 事件',
    input: '<div onclick="alert(1)">点击</div>',
    expected: '<div>点击</div>',
  },
  {
    name: 'JavaScript 协议',
    input: '<a href="javascript:alert(1)">链接</a>',
    expected: '<a href="#">链接</a>',
  },
  {
    name: 'iframe',
    input: '<iframe src="https://evil.com"></iframe>',
    expected: '',
  },
  {
    name: '内联样式 JavaScript',
    input: '<div style="background: url(javascript:alert(1))">内容</div>',
    expected: '<div>内容</div>',
  },
  {
    name: '表情符号（安全）',
    input: '🎉 恭喜发财！',
    expected: '🎉 恭喜发财！',
  },
];

// Markdown 渲染测试数据
export const markdownTestCases = [
  {
    name: '基本标题',
    input: '# 标题\n## 二级标题\n### 三级标题',
    expected: ['h1', 'h2', 'h3'],
  },
  {
    name: '代码块',
    input: '```javascript\nconsole.log("Hello")\n```',
    expected: 'pre',
  },
  {
    name: '内联代码',
    input: '这是 `inline code` 示例',
    expected: 'code',
  },
  {
    name: '链接',
    input: '[链接文字](https://example.com)',
    expected: 'a',
  },
  {
    name: '列表',
    input: '- 项目1\n- 项目2\n- 项目3',
    expected: 'ul',
  },
  {
    name: '表格',
    input: '| 列1 | 列2 |\n|------|------|\n| 值1 | 值2 |',
    expected: 'table',
  },
  {
    name: 'LaTeX 数学公式',
    input: '行内公式 $E=mc^2$ 和块级公式 $$\\int_{a}^{b}$$',
    expected: '.math',
  },
  {
    name: '任务列表',
    input: '- [x] 已完成任务\n- [ ] 未完成任务',
    expected: 'ul',
  },
];

// 搜索测试数据
export const searchTestCases = [
  {
    query: 'Go 并发',
    expectedResults: ['深入理解 Go 并发'],
    shouldInclude: ['Go', '并发'],
  },
  {
    query: 'react',
    expectedResults: ['React Hooks 最佳实践'],
    shouldInclude: ['React'],
  },
  {
    query: 'nonexistent',
    expectedResults: [],
    shouldInclude: [],
  },
];

// 频率限制测试数据
export const rateLimitTestCases = [
  {
    endpoint: '/api/comments',
    limit: 3,
    windowMs: 60000,
    testIp: '192.168.1.100',
  },
  {
    endpoint: '/api/likes',
    limit: 10,
    windowMs: 60000,
    testIp: '192.168.1.100',
  },
  {
    endpoint: '/api/auth/login',
    limit: 5,
    windowMs: 60000,
    testIp: '192.168.1.100',
  },
];

// 分页测试数据
export const paginationTestCases = [
  {
    page: 1,
    pageSize: 10,
    total: 25,
    expectedTotalPages: 3,
  },
  {
    page: 2,
    pageSize: 10,
    total: 25,
    expectedHasNext: true,
    expectedHasPrev: true,
  },
  {
    page: 3,
    pageSize: 10,
    total: 25,
    expectedHasNext: false,
    expectedHasPrev: true,
  },
];