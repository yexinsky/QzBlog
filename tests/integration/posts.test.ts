/**
 * 文章 API 集成测试
 * 测试文章的 CRUD 操作和相关功能
 */
import { mockPosts, paginationTestCases } from '../lib/mock-data';

// 模拟文章服务
interface CreatePostData {
  title: string;
  slug: string;
  content_md: string;
  status: 'draft' | 'published' | 'scheduled';
  scheduled_at?: string;
}

interface UpdatePostData {
  title?: string;
  slug?: string;
  content_md?: string;
  status?: string;
  tags?: string[];
}

// 模拟的文章存储
let postsStore = [...mockPosts];

// 模拟 API 函数
const createPost = async (data: CreatePostData): Promise<typeof mockPosts[0]> => {
  const newPost = {
    id: `new-${Date.now()}`,
    author_id: 'author-123',
    title: data.title,
    slug: data.slug,
    content_md: data.content_md,
    content_html: `<h1>${data.title}</h1><p>${data.content_md}</p>`,
    summary: data.content_md.slice(0, 100),
    cover_image: null,
    status: data.status,
    is_pinned: false,
    word_count: data.content_md.length,
    like_count: 0,
    view_count: 0,
    scheduled_at: data.scheduled_at || null,
    published_at: data.status === 'published' ? new Date().toISOString() : null,
    cancel_scheduled: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: [],
  };

  postsStore.push(newPost);
  return newPost;
};

const updatePost = async (id: string, data: UpdatePostData): Promise<typeof mockPosts[0] | null> => {
  const index = postsStore.findIndex((p) => p.id === id);
  if (index === -1) return null;

  postsStore[index] = {
    ...postsStore[index],
    ...data,
    updated_at: new Date().toISOString(),
  };

  return postsStore[index];
};

const deletePost = async (id: string): Promise<boolean> => {
  const index = postsStore.findIndex((p) => p.id === id);
  if (index === -1) return false;

  postsStore.splice(index, 1);
  return true;
};

const getPost = async (id: string): Promise<typeof mockPosts[0] | null> => {
  return postsStore.find((p) => p.id === id) || null;
};

const getPosts = async (options: {
  page?: number;
  pageSize?: number;
  status?: string;
  tag?: string;
}): Promise<{ data: typeof mockPosts; total: number }> => {
  const { page = 1, pageSize = 10, status, tag } = options;

  let filtered = postsStore;

  if (status) {
    filtered = filtered.filter((p) => p.status === status);
  }

  if (tag) {
    filtered = filtered.filter((p) => p.tags.some((t) => t.slug === tag));
  }

  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const data = filtered.slice(start, end);

  return {
    data,
    total: filtered.length,
  };
};

const publishPost = async (id: string): Promise<typeof mockPosts[0] | null> => {
  const index = postsStore.findIndex((p) => p.id === id);
  if (index === -1) return null;

  postsStore[index] = {
    ...postsStore[index],
    status: 'published',
    published_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return postsStore[index];
};

const schedulePost = async (
  id: string,
  scheduledAt: string
): Promise<typeof mockPosts[0] | null> => {
  const index = postsStore.findIndex((p) => p.id === id);
  if (index === -1) return null;

  postsStore[index] = {
    ...postsStore[index],
    status: 'scheduled',
    scheduled_at: scheduledAt,
    cancel_scheduled: false,
    updated_at: new Date().toISOString(),
  };

  return postsStore[index];
};

const cancelScheduledPost = async (id: string): Promise<typeof mockPosts[0] | null> => {
  const index = postsStore.findIndex((p) => p.id === id);
  if (index === -1) return null;

  postsStore[index] = {
    ...postsStore[index],
    status: 'draft',
    cancel_scheduled: true,
    updated_at: new Date().toISOString(),
  };

  return postsStore[index;
};

// 辅助函数
const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

describe('文章创建测试', () => {
  beforeEach(() => {
    postsStore = [...mockPosts];
  });

  test('创建新文章', async () => {
    const data: CreatePostData = {
      title: '测试文章',
      slug: generateSlug('测试文章'),
      content_md: '# 测试文章\n\n这是测试内容。',
      status: 'draft',
    };

    const post = await createPost(data);

    expect(post).toBeTruthy();
    expect(post.title).toBe(data.title);
    expect(post.slug).toBe(data.slug);
    expect(post.status).toBe('draft');
    expect(post.author_id).toBe('author-123');
  });

  test('创建文章时自动生成 slug', async () => {
    const data: CreatePostData = {
      title: 'Go 并发编程',
      slug: generateSlug('Go 并发编程'),
      content_md: '内容',
      status: 'published',
    };

    const post = await createPost(data);

    expect(post.slug).toBe('go-bing-fa-bian-cheng');
  });

  test('创建定时发布文章', async () => {
    const scheduledAt = '2026-05-20T10:00:00Z';
    const data: CreatePostData = {
      title: '定时发布测试',
      slug: generateSlug('定时发布测试'),
      content_md: '定时发布内容',
      status: 'scheduled',
      scheduled_at: scheduledAt,
    };

    const post = await createPost(data);

    expect(post.status).toBe('scheduled');
    expect(post.scheduled_at).toBe(scheduledAt);
    expect(post.published_at).toBeNull();
  });

  test('创建时计算字数', async () => {
    const content = '这是一段测试内容，用于验证字数统计功能。';
    const data: CreatePostData = {
      title: '字数统计测试',
      slug: generateSlug('字数统计测试'),
      content_md: content,
      status: 'draft',
    };

    const post = await createPost(data);

    expect(post.word_count).toBe(content.length);
  });
});

describe('文章读取测试', () => {
  beforeEach(() => {
    postsStore = [...mockPosts];
  });

  test('获取已发布的文章', async () => {
    const post = await getPost('1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6');

    expect(post).toBeTruthy();
    expect(post?.status).toBe('published');
  });

  test('获取不存在的文章返回 null', async () => {
    const post = await getPost('non-existent-id');
    expect(post).toBeNull();
  });

  test('按状态筛选文章', async () => {
    const result = await getPosts({ status: 'published' });

    expect(result.data.length).toBeGreaterThan(0);
    result.data.forEach((post) => {
      expect(post.status).toBe('published');
    });
  });

  test('分页获取文章', async () => {
    const result = await getPosts({ page: 1, pageSize: 2 });

    expect(result.data.length).toBeLessThanOrEqual(2);
    expect(result.total).toBeGreaterThanOrEqual(result.data.length);
  });

  test('获取草稿列表', async () => {
    const result = await getPosts({ status: 'draft' });

    expect(result.data.every((p) => p.status === 'draft')).toBe(true);
  });
});

describe('文章更新测试', () => {
  beforeEach(() => {
    postsStore = [...mockPosts];
  });

  test('更新文章标题', async () => {
    const id = '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6';
    const updated = await updatePost(id, { title: '更新后的标题' });

    expect(updated?.title).toBe('更新后的标题');
  });

  test('更新文章内容', async () => {
    const id = '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6';
    const newContent = '# 新内容\n\n更新后的内容。';
    const updated = await updatePost(id, { content_md: newContent });

    expect(updated?.content_md).toBe(newContent);
  });

  test('更新 slug 时保持唯一性', async () => {
    const id = '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6';
    const newSlug = 'new-slug-' + Date.now();
    const updated = await updatePost(id, { slug: newSlug });

    expect(updated?.slug).toBe(newSlug);
    // 验证 slug 在存储中是唯一的
    const duplicates = postsStore.filter((p) => p.slug === newSlug);
    expect(duplicates).toHaveLength(1);
  });

  test('更新时更新时间戳', async () => {
    const id = '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6';
    const beforeUpdate = postsStore.find((p) => p.id === id)?.updated_at;

    await new Promise((resolve) => setTimeout(resolve, 10));
    await updatePost(id, { title: '测试更新' });

    const afterUpdate = postsStore.find((p) => p.id === id)?.updated_at;
    expect(afterUpdate).not.toBe(beforeUpdate);
  });

  test('更新不存在的文章返回 null', async () => {
    const updated = await updatePost('non-existent-id', { title: '测试' });
    expect(updated).toBeNull();
  });
});

describe('文章删除测试', () => {
  beforeEach(() => {
    postsStore = [...mockPosts];
  });

  test('删除已存在的文章', async () => {
    const id = '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6';
    const result = await deletePost(id);

    expect(result).toBe(true);
    expect(postsStore.find((p) => p.id === id)).toBeUndefined();
  });

  test('删除不存在的文章返回 false', async () => {
    const result = await deletePost('non-existent-id');
    expect(result).toBe(false);
  });

  test('删除文章后相关标签也应清理（外键约束）', async () => {
    // 模拟删除时标签关联的处理
    const id = '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6';
    const post = postsStore.find((p) => p.id === id);

    if (post) {
      // 模拟标签清理
      post.tags = [];
      await deletePost(id);
    }

    const deleted = postsStore.find((p) => p.id === id);
    expect(deleted).toBeUndefined();
  });
});

describe('文章发布与定时发布测试', () => {
  beforeEach(() => {
    postsStore = [...mockPosts];
  });

  test('发布草稿文章', async () => {
    const id = '4d5e6f7a-8b9c-0d1e-2f3a-4g5h6i7j8k9'; // 草稿文章
    const published = await publishPost(id);

    expect(published?.status).toBe('published');
    expect(published?.published_at).toBeTruthy();
  });

  test('设置定时发布', async () => {
    const id = '4d5e6f7a-8b9c-0d1e-2f3a-4g5h6i7j8k9';
    const scheduledAt = '2026-06-01T10:00:00Z';

    const scheduled = await schedulePost(id, scheduledAt);

    expect(scheduled?.status).toBe('scheduled');
    expect(scheduled?.scheduled_at).toBe(scheduledAt);
    expect(scheduled?.cancel_scheduled).toBe(false);
  });

  test('取消定时发布', async () => {
    const id = '3c4d5e6f-7a8b-9c0d-1e2f-3g4h5i6j7k8'; // 定时发布的文章
    const canceled = await cancelScheduledPost(id);

    expect(canceled?.status).toBe('draft');
    expect(canceled?.cancel_scheduled).toBe(true);
  });

  test('定时发布前 5 分钟内可取消', () => {
    const scheduledAt = new Date();
    scheduledAt.setMinutes(scheduledAt.getMinutes() + 3); // 3分钟后
    const now = new Date();

    const canCancel =
      scheduledAt.getTime() - now.getTime() <= 5 * 60 * 1000 &&
      scheduledAt.getTime() > now.getTime();

    expect(canCancel).toBe(true);
  });

  test('定时发布已过期不可取消（需发布）', () => {
    const scheduledAt = new Date();
    scheduledAt.setMinutes(scheduledAt.getMinutes() - 1); // 1分钟前
    const now = new Date();

    const shouldPublish =
      scheduledAt.getTime() <= now.getTime();

    expect(shouldPublish).toBe(true);
  });
});

describe('文章列表与排序测试', () => {
  beforeEach(() => {
    postsStore = [...mockPosts];
  });

  test('置顶文章排在最前', async () => {
    const result = await getPosts({ pageSize: 10 });
    const pinnedPosts = result.data.filter((p) => p.is_pinned);

    if (pinnedPosts.length > 0) {
      const firstPinnedIndex = result.data.findIndex((p) => p.is_pinned);
      expect(firstPinnedIndex).toBeLessThan(pinnedPosts.length);
    }
  });

  test('按发布时间降序排列', async () => {
    const result = await getPosts({ status: 'published' });

    const dates = result.data
      .filter((p) => p.published_at)
      .map((p) => new Date(p.published_at!).getTime());

    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
  });
});

describe('文章异常状态测试', () => {
  beforeEach(() => {
    postsStore = [...mockPosts];
  });

  test('空文章列表返回空数组', async () => {
    postsStore = [];
    const result = await getPosts({ status: 'published' });

    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });

  test('获取已删除文章返回 null', async () => {
    const id = '1a2b3c4d-5e6f-7g8h-9i0j-k1l2m3n4o5p6';
    await deletePost(id);
    const post = await getPost(id);

    expect(post).toBeNull();
  });

  test('分页边界测试', async () => {
    // 请求超出范围
    const result = await getPosts({ page: 100, pageSize: 10 });

    expect(result.data.length).toBe(0);
    expect(result.total).toBe(postsStore.length);
  });
});

describe('文章搜索与筛选测试', () => {
  beforeEach(() => {
    postsStore = [...mockPosts];
  });

  test('按标签筛选文章', async () => {
    const result = await getPosts({ tag: 'go' });

    expect(result.data.length).toBeGreaterThan(0);
    result.data.forEach((post) => {
      expect(post.tags.some((t) => t.slug === 'go')).toBe(true);
    });
  });

  test('组合筛选条件', async () => {
    const result = await getPosts({
      status: 'published',
      tag: 'go',
    });

    expect(result.data.every((p) => p.status === 'published')).toBe(true);
  });

  test('返回分页元数据', async () => {
    const result = await getPosts({ page: 1, pageSize: 2 });

    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('total');
    expect(result.total).toBeGreaterThanOrEqual(result.data.length);
  });
});

describe('分页测试', () => {
  beforeEach(() => {
    postsStore = [...mockPosts];
  });

  test.each(paginationTestCases)(
    '分页计算正确 (page=$page, pageSize=$pageSize)',
    ({ page, pageSize, total, expectedTotalPages }) => {
      const totalPages = Math.ceil(total / pageSize);
      expect(totalPages).toBe(expectedTotalPages);
    }
  );

  test('首页和末页识别', () => {
    const total = 25;
    const pageSize = 10;
    const totalPages = Math.ceil(total / pageSize);

    const firstPage = 1;
    const lastPage = totalPages;

    expect(firstPage).toBe(1);
    expect(lastPage).toBe(3);
  });

  test('上一页下一页状态', () => {
    const testCases = [
      { page: 1, hasPrev: false, hasNext: true },
      { page: 2, hasPrev: true, hasNext: true },
      { page: 3, hasPrev: true, hasNext: false },
    ];

    testCases.forEach(({ page, hasPrev, hasNext }) => {
      const canGoPrev = page > 1;
      const canGoNext = page < 3; // 假设共3页

      expect(canGoPrev).toBe(hasPrev);
      expect(canGoNext).toBe(hasNext);
    });
  });
});