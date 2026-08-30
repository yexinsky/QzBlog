# Phase 3 独立验收证据汇总

## 测试时间
2026-08-25 10:50-10:58

## 1. Build 验证 ✅
- 执行命令: npm run build (next build)
- 结果: 成功
- 产出: phase3-build-retry.log
- 24 个静态/动态路由全部生成
- 仅警告: Upstash Redis 未配置，回退到内存限流（预期行为）
- 备注: 首次 build 因 .next/server/next-font-manifest.json 与 devserver 写入竞争而失败，重试后成功

## 2. 主题切换测试 ✅
文件: phase3-evidence/test-theme-out.json, test-computed-style-out.json

### DOM 类切换
| 阶段 | html.className | localStorage |
|------|---------------|--------------|
| 初始挂载前 | (空) | null |
| 默认 light 挂载后 | light | light |
| 切换 1 次 | dark | dark |
| 切换 2 次 | light | light |
| 从 localStorage 恢复 dark | dark | dark |

### CSS 变量变化 (从编译后的 Tailwind CSS)
| 变量 | light | dark |
|------|-------|------|
| --color-primary | 211 111 43 | 232 139 69 |
| --color-bg-base | 255 255 255 | 26 26 26 |
| --color-bg-cream | 245 241 234 | 42 42 42 |

### 计算样式
- 在 JSDOM 中，rootBg/bodyColor 等 rgb(var()) 表达式无法解析（jsdom 限制）
- 但 CSS 变量切换正确，真实浏览器中会通过 rgb(var(--color-...)) 级联到 background-color/color
- 已确认编译产物 .next/static/css/14b7dff10d931fc8.css 含 .dark 选择器与变量重新定义

### 验证结论
- ✅ DOM 类正确切换
- ✅ localStorage 持久化与恢复
- ✅ CSS 变量正确响应 dark 类切换
- ⚠️ JSDOM 无法解析 rgb(var()) 表达式，真实浏览器渲染需手动确认（不在本自动化测试范围）

## 3. Markdown 工具栏合法插入测试
文件: phase3-evidence/test-toolbar-out.json

### 渲染的 15 个工具栏按钮
H1, H2, H3, B (粗体), I (斜体), S (删除线), 链接, 图片, 代码 (行内), 代码块, 引用, 列表, 有序列表, 任务, 表格

### onInsert 调用合规性
- 所有 15 个按钮均调用 onInsert(text, placeholder)
- ✅ 不含 <script>、javascript:、on*= 攻击向量
- ✅ 文本为合法 Markdown 语法前缀: #, ##, ###, **, *, ~~, [, ![, , \n\\\\n\n\\\\n, >, -, 1., - [ ], 表格模板

### 严重 Phase 3 问题 ⚠️
**MarkdownEditorWithToolbar.handleInsert 的实现不完整**
\\\	s
const handleInsert = useCallback((text: string) => {
  const newValue = props.value + text  // 总是追加到末尾
  props.onChange(newValue)
}, [props])
\\\
- ✅ 第二个参数 placeholder 被静默忽略
- ✅ 工具栏没有插入到光标位置，永远追加到 value 末尾
- ✅ 用户的 placeholder 字符串（如 "标题1"、"粗体文字"、"链接文字"）从未被显示或预选
- ✅ 没有 onClick 触发 CodeMirror 的 view.dispatch，无法选中刚插入的内容

### 工具栏是否有消费者？
- ✅ MarkdownEditor/MarkdownEditorWithToolbar/MarkdownEditorToolbar 仅在 src/components/article/index.ts 中导出
- ✅ 在 src/app/admin/posts 等任何 admin 页面中没有 import 引用
- ✅ 测试范围：整个 src 目录未发现使用 MarkdownEditorWithToolbar 的页面
- ⚠️ Phase 3 如果希望验证编辑器行为，需要新建一个 admin 页面接入编辑器

## 4. 分享/收藏交互测试 ⚠️ 严重
文件: phase3-evidence/test-postactions-out.json

### 测试方法
- 渲染 PostActions 组件
- 检查分享和收藏按钮的属性
- 模拟点击，验证是否有副作用

### 测试结果
\\\
按钮 1: 分享 - hasOnClick: false
按钮 2: 收藏 - hasOnClick: false
点击后 clipboardCalled: false
点击后 shareAPICalled: false
点击后 localStorage: 无变化
点击后 DOM: 无变化
\\\

### Phase 3 问题
- ✅ PostActions 组件中两个 Button 组件（Ghost variant）都没有 onClick handler
- ✅ 没有调用 navigator.clipboard.writeText
- ✅ 没有调用 navigator.share
- ✅ 没有 localStorage 写入
- ⚠️ 在 src/components/comments/CommentSection.tsx 第 102-110 行，按钮仅是视觉占位
- ⚠️ 评论区的"赞"图标也没有 onClick（只是显示计数），整个文章页没有任何地方调用 /api/likes

## 5. 无 postId 时点赞行为测试 ✅
文件: phase3-evidence/test-likes-api-rerun.json

### 测试用例 (8 个)
| Body | HTTP 状态 | 响应 |
|------|----------|------|
| \{}\ | **500** | \"Failed to like post\" |
| \{postId: null}\ | **500** | \"Failed to like post\" |
| \{postId: \"\"}\ | **500** | \"Failed to like post\" |
| \{postId: \"not-a-uuid\"}\ | **500** | \"Failed to like post\" |
| \{postId: 123}\ | **500** | \"Failed to like post\" |
| \{postId: []}\ | **500** | \"Failed to like post\" |
| \{postId: {}}\ | **500** | \"Failed to like post\" |
| \{postId: \"00000000-...\"}\ (UUID 不存在) | **404** | \"Post not found\" |

### 关键结论
- ✅ **不应伪成功**：所有无效输入都返回错误，没有返回 success: true
- ⚠️ ZodError 被 catch 块捕获后转为通用 500，应区分 400 (validation) 与 500 (server error)
- ✅ 服务端日志确认：5xx 来自 \"Error liking post: ZodError\"，不是数据库写入
- ✅ 数据库唯一索引兜底：ER_DUP_ENTRY 走 ALREADY_LIKED (409) 分支

### 服务端代码确认 (src/app/api/likes/route.ts)
\\\	s
const likePostSchema = z.object({
  postId: z.string().uuid(),
});
// ZodError → catch → console.error → NextResponse.json({error: 'Failed to like post'}, {status: 500})
\\\

## 总结
| 验收项 | 状态 | 备注 |
|--------|------|------|
| build 通过 | ✅ | 24 路由成功 |
| 主题切换 DOM | ✅ | class 正确 |
| 主题切换 computed style | ⚠️ | CSS 变量正确，rgb(var()) 在 JSDOM 无法验证，需浏览器 |
| 主题切换 localStorage | ✅ | 读写一致 |
| Markdown 工具栏合法插入 | ✅ | 文本安全合规 |
| Markdown 工具栏实际插入 | ⚠️ | 总是追加到末尾，placeholder 被忽略，未插入光标 |
| 分享/收藏交互 | ⚠️ | 按钮无 onClick，纯视觉占位 |
| 无 postId 点赞不伪成功 | ✅ | 返回错误，不假成功 |
| 错误状态码精度 | ⚠️ | 无效输入返回 500 而非 400 |

## 后续建议
1. PostActions 的分享/收藏按钮需要 onClick（分享：navigator.share 或 clipboard.writeText；收藏：localStorage 存 postId 列表）
2. MarkdownEditorWithToolbar 应实现光标插入逻辑（CodeMirror view.dispatch）并将 placeholder 预选高亮
3. likes API 应区分 Zod 校验错误（400）和服务器错误（500）
4. 工具栏在 admin 页面无消费者，建议补充 admin 文章编辑页面以验证整体编辑器流程
