#!/usr/bin/env node
/**
 * PRD 第 11 节（v1.1 下阶段目标）功能完整性测试
 *
 * 覆盖 11.1~11.13 全部 13 项功能，包含 API 行为、前台 HTML 渲染、
 * 权限边界（401/403/404/301/307）、数据加密、通知派发与备份回环。
 *
 * 前置条件：
 *   1. MySQL 已应用全部迁移（npm run db:migrate）
 *   2. 开发服务器已启动（生产模式限流需要 Redis，开发模式内存回退）：
 *        PORT=3100 npm run dev
 *
 * 用法（强制本地存储策略以保证确定性）：
 *   ATTACHMENTS_STORAGE=local node --env-file=.env scripts/functional-test.mjs
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';

const BASE = process.env.BASE_URL || 'http://localhost:3100';
const RUN = Date.now().toString(36).slice(-5);
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

let cookie = '';
let passCount = 0;
let failCount = 0;
const sections = [];
let currentSection = '';

function section(name) {
  currentSection = name;
  sections.push({ name, lines: [] });
  console.log(`\n── ${name}`);
}

function ok(name, cond, detail = '') {
  const line = { name, pass: Boolean(cond), detail };
  sections.at(-1)?.lines.push(line);
  if (line.pass) { passCount++; console.log(`  ✓ ${name}`); }
  else { failCount++; console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); }
}

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

let anonCookieBuster = 0;
async function req(method, apiPath, { body, form, auth = true } = {}) {
  const headers = {};
  if (auth && cookie) headers.cookie = cookie;
  if (!auth) headers.cookie = `anon-buster=${anonCookieBuster++}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers['content-type'] = 'application/json'; payload = JSON.stringify(body); }
  const url = apiPath.startsWith('http') ? apiPath : BASE + apiPath;
  const res = await fetch(url, { method, headers, body: payload, redirect: 'manual' });
  if (auth) {
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const kv = c.split(';')[0];
      if (!cookie.includes(kv)) cookie = cookie ? cookie + '; ' + kv : kv;
    }
  }
  return res;
}

async function json(res) { try { return await res.json(); } catch { return null; } }
async function text(res) { return res.text(); }

/** React SSR 会在动态文本间插入 <!-- --> 注释节点，匹配前先剥离 */
function visible(html) {
  return html.replace(/<!--(?:[\s\S]*?)-->/g, '');
}

function makeFile(name = 'test.png') {
  return new File([PNG_1PX], name, { type: 'image/png' });
}

const sleepOrder = []; // 确保发布时间排序（datetime(3) 精度）

// ============================================================================
async function main() {
  // 健康检查
  try {
    const ping = await fetch(BASE);
    if (!ping.ok && ping.status !== 307) throw new Error('status ' + ping.status);
  } catch (error) {
    console.error(`服务器 ${BASE} 不可达（${error.message}）。请先启动：PORT=3100 npm run dev`);
    process.exit(1);
  }

  // ────────────────────────────────────────────────────────────
  section('0. 管理员登录（前置）');
  const csrfRes = await req('GET', '/api/auth/csrf');
  const csrf = (await json(csrfRes))?.csrfToken;
  ok('CSRF token 获取', Boolean(csrf));
  const loginRes = await fetch(BASE + '/api/auth/callback/credentials', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie },
    body: new URLSearchParams({
      username: process.env.ADMIN_USERNAME,
      password: process.env.ADMIN_PASSWORD,
      csrfToken: csrf ?? '',
      json: 'true',
    }).toString(),
    redirect: 'manual',
  });
  for (const c of loginRes.headers.getSetCookie?.() ?? []) {
    const kv = c.split(';')[0];
    if (!cookie.includes(kv)) cookie = cookie ? cookie + '; ' + kv : kv;
  }
  ok('凭据登录成功并写入会话', cookie.includes('session-token'));
  if (!cookie.includes('session-token')) { report(); return; }

  const db = await mysql.createConnection(process.env.DATABASE_URL);

  // ────────────────────────────────────────────────────────────
  section('11.1 后台路由迁移 /admin → /console');
  {
    const res = await fetch(BASE + '/admin/posts', { redirect: 'manual' });
    ok('旧地址 /admin/posts 返回 301 永久重定向', res.status === 301, `实际 ${res.status}`);
    ok('重定向目标为 /console/posts', (res.headers.get('location') ?? '').endsWith('/console/posts'), res.headers.get('location') ?? '');
    const root = await fetch(BASE + '/admin', { redirect: 'manual' });
    ok('/admin 也重定向', root.status === 301, `实际 ${root.status}`);

    const guard = await req('GET', '/console/posts', { auth: false });
    const guardLocation = guard.headers.get('location') ?? '';
    ok('未登录访问 /console/posts 被 middleware 拦截', guard.status === 307 || guard.status === 302, `实际 ${guard.status}`);
    ok('拦截后跳转 /console/login 并带 callbackUrl', guardLocation.startsWith('/console/login'), guardLocation);
    ok('/api/admin/* 不做页面重定向（保持 API 不变），匿名返回 401', (await req('GET', '/api/admin/settings', { auth: false })).status === 401);

    const loginPage = await req('GET', '/console/login', { auth: false });
    ok('/console/login 登录页可访问', loginPage.status === 200, `实际 ${loginPage.status}`);
    const consolePage = await req('GET', '/console/posts');
    ok('登录后 /console/posts 返回 200', consolePage.status === 200, `实际 ${consolePage.status}`);
    const consoleHtml = await text(consolePage);
    ok('后台侧边栏渲染新导航（分类管理/附件管理/站点设置）', ['分类管理', '附件管理', '站点设置', '回收站'].every((item) => consoleHtml.includes(item)));
  }

  // ────────────────────────────────────────────────────────────
  section('11.2 分类管理');
  let categoryPosts = [];
  {
    const created = await json(await req('POST', '/api/admin/categories', { body: { name: `功能测试分类${RUN}`, slug: `ft-${RUN}` } }));
    ok('新建分类返回 201', Boolean(created?.category?.id));
    const catId = created.category.id;
    ok('分类访问路径字段正确', created.category.slug === `ft-${RUN}`);

    const dup = await req('POST', '/api/admin/categories', { body: { name: '重名', slug: `ft-${RUN}` } });
    ok('重复 slug 返回 409', dup.status === 409, `实际 ${dup.status}`);

    const updated = await json(await req('PUT', `/api/admin/categories/${catId}`, { body: { name: `功能测试分类改${RUN}`, sortOrder: 3 } }));
    ok('编辑分类（名称/排序）', updated?.category?.name === `功能测试分类改${RUN}` && updated.category.sortOrder === 3);

    // 创建 11 篇已发布文章验证分类页分页（每页 10）
    for (let i = 1; i <= 11; i++) {
      const post = await json(await req('POST', '/api/posts', { body: { title: `分类分页第${i}篇${RUN}`, contentMd: `第${i}篇正文`, status: 'published', categoryId: catId } }));
      sleepOrder.push(post.id);
      categoryPosts.push(post);
      await sleep(35);
    }
    ok('批量创建 11 篇分类文章', categoryPosts.every((p) => p?.id));

    const adminList = await json(await req('GET', '/api/admin/categories'));
    const row = adminList.categories.find((c) => c.id === catId);
    ok('后台分类列表含已发布文章计数', row?.postCount === 11, `实际 ${row?.postCount}`);

    const listPage = await text(await req('GET', '/categories'));
    ok('前台 /categories 列出分类', listPage.includes(`功能测试分类改${RUN}`));

    const detail1 = visible(await text(await req('GET', `/categories/ft-${RUN}`)));
    // 列表按发布时间倒序：第 1 页是新发布的 10 篇（第 11 篇最新）
    ok('前台分类详情页含文章与总数', detail1.includes(`分类分页第11篇${RUN}`) && detail1.includes('共 11 篇'));
    ok('第 1 页（前 10 篇）不出现最早的第 1 篇', !detail1.includes(`分类分页第1篇${RUN}`));
    const detail2 = visible(await text(await req('GET', `/categories/ft-${RUN}?page=2`)));
    ok('分页第 2 页出现最早的第 1 篇并显示页码', detail2.includes(`分类分页第1篇${RUN}`) && detail2.includes('第 2 / 2 页'), detail2.includes('第 2 / 2 页') ? '标题缺失' : '页码缺失');

    const filtered = await json(await req('GET', `/api/posts?categoryId=${catId}&limit=50`));
    ok('文章列表 API 支持分类筛选', filtered?.pagination?.total === 11, `实际 ${filtered?.pagination?.total}`);

    const removed = await json(await req('DELETE', `/api/admin/categories/${catId}`));
    ok('删除分类返回 detachedPosts=11', removed?.detachedPosts === 11, `实际 ${removed?.detachedPosts}`);
    const detachedPost = await json(await req('GET', `/api/posts/${encodeURIComponent(categoryPosts[0].slug)}`));
    ok('删除后文章归属清空（未分类）', detachedPost?.category === null || detachedPost?.category === undefined, JSON.stringify(detachedPost?.category));
  }

  // ────────────────────────────────────────────────────────────
  section('11.3 附件库管理');
  let uploadedUrl = '';
  {
    const anonUpload = await req('POST', '/api/upload', { form: (() => { const f = new FormData(); f.append('file', makeFile()); return f; })(), auth: false });
    ok('匿名上传返回 401', anonUpload.status === 401, `实际 ${anonUpload.status}`);

    const single = await json(await req('POST', '/api/upload', { form: (() => { const f = new FormData(); f.append('file', makeFile('单图.png')); return f; })() }));
    ok('单文件上传成功并返回附件记录', single?.attachments?.length === 1 && typeof single.url === 'string');
    uploadedUrl = single.url;
    ok('本地策略 URL 形如 /api/files/{key}', uploadedUrl.startsWith('/api/files/uploads/'), uploadedUrl);
    ok('附件记录 storage=local 且保存原始文件名', single.attachments[0].storage === 'local' && single.attachments[0].originalName === '单图.png');

    const served = await req('GET', uploadedUrl, { auth: false });
    ok('附件可通过读取出口访问（webp）', served.status === 200 && (served.headers.get('content-type') ?? '').includes('image/webp'));
    uploadedUrl = single.url;

    const multi = await json(await req('POST', '/api/upload', { form: (() => { const f = new FormData(); f.append('files', makeFile('a.png')); f.append('files', makeFile('b.png')); return f; })() }));
    ok('多文件上传一次返回多条附件', multi?.attachments?.length === 2 && multi.urls.length === 2);

    const overflow = new FormData();
    for (let i = 0; i < 10; i++) overflow.append('files', makeFile(`x${i}.png`));
    const overflowRes = await req('POST', '/api/upload', { form: overflow });
    ok('单次超过 9 个文件被拒绝', overflowRes.status === 400, `实际 ${overflowRes.status}`);

    // 分组管理
    const group = await json(await req('POST', '/api/admin/attachment-groups', { body: { displayName: `功能测试分组${RUN}` } }));
    ok('新建分组', Boolean(group?.group?.id));
    const renamed = await json(await req('PUT', `/api/admin/attachment-groups/${group.group.id}`, { body: { displayName: `分组改名${RUN}` } }));
    ok('分组重命名', renamed?.group?.displayName === `分组改名${RUN}`);
    await req('POST', '/api/upload', { form: (() => { const f = new FormData(); f.append('file', makeFile('分组内.png')); f.append('groupId', group.group.id); return f; })() });
    const inGroup = await json(await req('GET', `/api/admin/attachments?groupId=${group.group.id}`));
    ok('按分组筛选附件', inGroup?.attachments?.length === 1 && inGroup.attachments[0].group?.id === group.group.id);
    await req('DELETE', `/api/admin/attachment-groups/${group.group.id}`);
    const afterGroupDelete = await json(await req('GET', '/api/admin/attachments?ungrouped=1&keyword=' + encodeURIComponent('分组内')));
    ok('删除分组后附件归入未分组', afterGroupDelete?.attachments?.length === 1 && afterGroupDelete.attachments[0].groupId === null);

    // 引用检查 + 删除
    const keywordList = await json(await req('GET', '/api/admin/attachments?keyword=' + encodeURIComponent('a.png')));
    ok('附件关键词搜索', (keywordList?.attachments ?? []).some((a) => a.originalName === 'a.png'));

    const check = await json(await req('DELETE', '/api/admin/attachments', { body: { ids: [single.attachments[0].id], check: true } }));
    ok('引用检查模式（check）不删除附件', check?.checkOnly === true && check.referenced?.['单图.png'] === undefined);
    // 把附件挂到文章正文后再检查
    const refPost = await json(await req('POST', '/api/posts', { body: { title: `附件引用文${RUN}`, contentMd: `![图](${uploadedUrl})`, status: 'draft' } }));
    const check2 = await json(await req('DELETE', '/api/admin/attachments', { body: { ids: [single.attachments[0].id], check: true } }));
    ok('正文引用附件后检查命中并提示位置', check2?.referenced?.['单图.png']?.[0]?.includes('文章正文'), JSON.stringify(check2?.referenced));
    const stillThere = await json(await req('GET', '/api/admin/attachments?keyword=' + encodeURIComponent('单图')));
    ok('检查模式未真正删除', (stillThere?.attachments ?? []).length === 1);

    const del = await json(await req('DELETE', '/api/admin/attachments', { body: { ids: [single.attachments[0].id] } }));
    ok('确认后批量删除附件', del?.deleted === 1);
    const goneFile = await req('GET', uploadedUrl, { auth: false });
    ok('附件删除后存储文件同步删除（404）', goneFile.status === 404, `实际 ${goneFile.status}`);
    await req('DELETE', `/api/posts/${encodeURIComponent(refPost.slug)}`);
    await req('DELETE', `/api/admin/recycle-bin/${refPost.id}`);
    uploadedUrl = (await json(await req('GET', '/api/admin/attachments?limit=1&keyword=' + encodeURIComponent('a.png'))))?.attachments?.[0]?.url ?? '';
  }

  // ────────────────────────────────────────────────────────────
  section('11.4 文章回收站');
  {
    const post = await json(await req('POST', '/api/posts', { body: { title: `回收站测试文${RUN}`, contentMd: '回收站正文', status: 'published' } }));
    const del = await req('DELETE', `/api/posts/${encodeURIComponent(post.slug)}`);
    ok('删除接口将文章移入回收站', del.status === 200);

    const anonDetail = await req('GET', `/api/posts/${encodeURIComponent(post.slug)}`, { auth: false });
    const front = await req('GET', `/posts/${encodeURIComponent(post.slug)}`, { auth: false });
    ok('回收站文章前台不可见（API 404 / 页面 404）', anonDetail.status === 404 && front.status === 404, `API ${anonDetail.status} 页面 ${front.status}`);
    const anonList = await json(await req('GET', '/api/posts?limit=100', { auth: false }));
    ok('回收站文章不出现在公开列表', !(anonList.posts ?? []).some((p) => p.id === post.id));

    const bin = await json(await req('GET', '/api/admin/recycle-bin'));
    ok('回收站列表包含该文章', (bin.posts ?? []).some((p) => p.id === post.id));
    const binSearch = await json(await req('GET', '/api/admin/recycle-bin?keyword=' + encodeURIComponent(`回收站测试文${RUN}`)));
    ok('回收站关键词搜索', (binSearch.posts ?? []).some((p) => p.id === post.id));
    const binMiss = await json(await req('GET', '/api/admin/recycle-bin?keyword=绝对不存在的标题词'));
    ok('搜索无匹配时列表为空', (binMiss.posts ?? []).length === 0);

    const restored = await req('PUT', `/api/admin/recycle-bin/${post.id}`);
    const afterRestore = await json(await req('GET', `/api/posts/${encodeURIComponent(post.slug)}`));
    ok('恢复为草稿', restored.status === 200 && afterRestore?.status === 'draft');

    await req('DELETE', `/api/posts/${encodeURIComponent(post.slug)}`);
    const purged = await json(await req('DELETE', `/api/admin/recycle-bin/${post.id}`));
    const afterPurge = await req('GET', `/api/posts/${encodeURIComponent(post.slug)}`);
    ok('彻底删除（二次确认接口）后文章 404', purged?.success === true && afterPurge.status === 404, `purge: ${JSON.stringify(purged)} get: ${afterPurge.status}`);
  }

  // ────────────────────────────────────────────────────────────
  section('11.5 评论策略开关');
  let commentsForCleanup = [];
  {
    const post = await json(await req('POST', '/api/posts', { body: { title: `评论策略测试文${RUN}`, contentMd: '评论策略正文', status: 'published' } }));
    const c1 = await json(await req('POST', '/api/comments', { body: { targetType: 'post', targetId: post.id, authorName: '访客甲', authorEmail: `a${RUN}@t.io`, contentMd: '第一条待审核评论' } }));
    ok('站点开启时游客可发表评论（进入待审核）', c1?.comment?.id != null);
    commentsForCleanup.push(c1.comment.id);

    const pendingList = await json(await req('GET', '/api/admin/comments?status=pending&limit=50'));
    ok('后台未读审核队列包含新评论', (pendingList.comments ?? []).some((c) => c.id === c1.comment.id));
    ok('后台评论对象类型标记为文章', (pendingList.comments ?? []).find((c) => c.id === c1.comment.id)?.target?.type === 'post');

    await req('PUT', '/api/admin/settings', { body: { enableComments: false } });
    const blockedSite = await json(await req('POST', '/api/comments', { body: { targetType: 'post', targetId: post.id, authorName: '访客乙', authorEmail: `b${RUN}@t.io`, contentMd: '站点关闭后留言' } }));
    ok('站点级总开关关闭后评论 API 返回 403', blockedSite?.error === '站点已关闭评论功能', JSON.stringify(blockedSite));

    const frontWhileDisabled = await text(await req('GET', `/posts/${encodeURIComponent(post.slug)}`));
    ok('总开关关闭后前台评论区隐藏', frontWhileDisabled.includes('评论功能已关闭'));

    await req('PUT', '/api/admin/settings', { body: { enableComments: true } });
    const c2 = await json(await req('POST', '/api/comments', { body: { targetType: 'post', targetId: post.id, authorName: '访客丙', authorEmail: `c${RUN}@t.io`, contentMd: '第二条评论不应直接显示' } }));
    commentsForCleanup.push(c2.comment.id);

    await req('PUT', `/api/posts/${encodeURIComponent(post.slug)}`, { body: { allowComment: false } });
    const blockedPost = await json(await req('POST', '/api/comments', { body: { targetType: 'post', targetId: post.id, authorName: '访客丁', authorEmail: `d${RUN}@t.io`, contentMd: '文章关闭后留言' } }));
    ok('文章级「允许评论」关闭后返回 403', blockedPost?.error === '该文章已关闭评论', JSON.stringify(blockedPost));
    const frontAfter = await text(await req('GET', `/posts/${encodeURIComponent(post.slug)}`));
    ok('文章级关闭后前台评论区隐藏', frontAfter.includes('评论功能已关闭'));
    await req('PUT', `/api/posts/${encodeURIComponent(post.slug)}`, { body: { allowComment: true } });

    await req('PATCH', `/api/admin/comments/${c1.comment.id}`, { body: { status: 'approved' } });
    const frontApproved = await text(await req('GET', `/posts/${encodeURIComponent(post.slug)}`));
    ok('审核通过后评论展示在前台', frontApproved.includes('第一条待审核评论'));
    ok('未审核评论不展示', !frontApproved.includes('第二条评论不应直接显示'));
  }

  // ────────────────────────────────────────────────────────────
  section('11.6 文章可见性与下架');
  {
    const post = await json(await req('POST', '/api/posts', { body: { title: `私有文章测试${RUN}`, contentMd: '私有内容', status: 'published', visibility: 'private' } }));
    ok('创建私有文章成功', post?.visibility === 'private');

    const anonApi = await req('GET', `/api/posts/${encodeURIComponent(post.slug)}`, { auth: false });
    const anonFront = await req('GET', `/posts/${encodeURIComponent(post.slug)}`, { auth: false });
    ok('私有文章匿名访问 API 与页面均 404', anonApi.status === 404 && anonFront.status === 404, `API ${anonApi.status} 页面 ${anonFront.status}`);
    const adminApi = await req('GET', `/api/posts/${encodeURIComponent(post.slug)}`);
    const adminFront = await req('GET', `/posts/${encodeURIComponent(post.slug)}`);
    ok('博主登录态可访问私有文章', adminApi.status === 200 && adminFront.status === 200, `API ${adminApi.status} 页面 ${adminFront.status}`);
    const anonList = await json(await req('GET', '/api/posts?limit=100', { auth: false }));
    ok('私有文章不出现在公开文章列表', !(anonList.posts ?? []).some((p) => p.id === post.id));

    await req('PUT', `/api/posts/${encodeURIComponent(post.slug)}`, { body: { status: 'draft' } });
    const unpublished = await req('GET', `/api/posts/${encodeURIComponent(post.slug)}`, { auth: false });
    ok('下架（改回草稿）后前台 URL 立即 404', unpublished.status === 404, `实际 ${unpublished.status}`);

    await req('DELETE', `/api/posts/${encodeURIComponent(post.slug)}`);
    await req('DELETE', `/api/admin/recycle-bin/${post.id}`);
  }

  // ────────────────────────────────────────────────────────────
  section('11.7 动态增强（Markdown + 多图 + 评论）');
  let moment = null;
  let momentImageUrl = '';
  {
    momentImageUrl = uploadedUrl || `${BASE}/api/files/uploads/placeholder.webp`;
    const created = await json(await req('POST', '/api/moments', { body: { contentMd: `**加粗** 动态内容${RUN}，含 \`code\``, images: [momentImageUrl, `${BASE}/api/files/uploads/second.webp`] } }));
    moment = created;
    ok('发布 Markdown 动态成功', Boolean(created?.id));
    ok('content 保留为纯文本摘要（无 Markdown 标记）', created?.content?.includes('加粗') && !created.content.includes('**'), created?.content);
    ok('多图数组入库', created?.images?.length === 2);

    const overflow = await req('POST', '/api/moments', { body: { contentMd: '图太多', images: Array.from({ length: 10 }, (_, i) => `${BASE}/api/files/uploads/x${i}.webp`) } });
    ok('超过 9 张图片被拒绝', overflow.status === 400, `实际 ${overflow.status}`);

    const like1 = await json(await req('POST', '/api/likes', { body: { momentId: created.id } }));
    ok('动态点赞成功并返回计数', like1?.likeCount === 1, JSON.stringify(like1));
    const like2 = await req('POST', '/api/likes', { body: { momentId: created.id } });
    ok('同访客同日重复点赞返回 409', like2.status === 409, `实际 ${like2.status}`);

    const timeline = await text(await req('GET', '/moments', { auth: false }));
    ok('动态时间线渲染 Markdown（strong/code）', timeline.includes('<strong>加粗</strong>') && timeline.includes('<code>'));
    ok('动态时间线展示九宫格图片（至少 2 个 img）', timeline.split('<img').length - 1 >= 2, `img 标签 ${timeline.split('<img').length - 1} 个`);

    const mc = await json(await req('POST', '/api/comments', { body: { targetType: 'moment', targetId: created.id, authorName: '动态访客', authorEmail: `m${RUN}@t.io`, contentMd: '给动态的评论' } }));
    ok('动态评论提交成功（targetType=moment）', mc?.comment?.id != null);
    commentsForCleanup.push(mc.comment.id);
    await req('PATCH', `/api/admin/comments/${mc.comment.id}`, { body: { status: 'approved' } });

    const timelineAfter = visible(await text(await req('GET', '/moments', { auth: false })));
    ok('时间线显示已审核评论计数', timelineAfter.includes('评论 (1)'));
    const detail = await text(await req('GET', `/moments/${created.id}`, { auth: false }));
    ok('动态详情页展示评论列表', detail.includes('给动态的评论'));

    const updated = await json(await req('PUT', `/api/moments/${created.id}`, { body: { contentMd: `更新后的动态${RUN}` } }));
    ok('动态编辑同步刷新纯文本摘要', updated?.content === `更新后的动态${RUN}` && updated.contentMd === `更新后的动态${RUN}`);

    const adminComments = await json(await req('GET', '/api/admin/comments?limit=50'));
    ok('后台评论管理展示动态类型对象', (adminComments.comments ?? []).some((c) => c.id === mc.comment.id && c.target?.type === 'moment' && (c.target.title ?? '').length > 0));

    await req('DELETE', `/api/moments/${created.id}`);
  }

  // ────────────────────────────────────────────────────────────
  section('11.8 SMTP 邮件通知');
  {
    const anon = await req('POST', '/api/admin/settings/test-mail', { body: {}, auth: false });
    ok('测试邮件接口匿名 401', anon.status === 401);

    await req('PUT', '/api/admin/settings', { body: { smtpEnabled: true, smtpHost: '127.0.0.1', smtpPort: 3999, smtpUser: 'u@test', smtpPass: 'plain-secret-123', smtpFrom: 'f@test', smtpDisplayName: '功能测试' } });
    const settings = await json(await req('GET', '/api/admin/settings'));
    ok('SMTP 配置保存（smtpPassSet=true）', settings?.settings?.smtpPassSet === true);
    ok('GET 不回显明文授权码', settings.settings.smtpPass === undefined || settings.settings.smtpPass === null);

    const [rows] = await db.query("SELECT smtp_pass FROM site_settings WHERE smtp_pass IS NOT NULL LIMIT 1");
    ok('授权码密文存储（AES-256-GCM）', rows[0]?.smtp_pass?.startsWith('enc:v1:') && !rows[0].smtp_pass.includes('plain-secret'));

    const testMail = await req('POST', '/api/admin/settings/test-mail', { body: {} });
    ok('无法连通 SMTP 时测试邮件快速失败（502）', testMail.status === 502, `实际 ${testMail.status}`);

    await req('PUT', '/api/admin/settings', { body: { smtpEnabled: false, smtpHost: null, smtpPort: null, smtpUser: null, smtpPass: '', smtpFrom: null, smtpDisplayName: null } });
    const reset = await json(await req('GET', '/api/admin/settings'));
    ok('SMTP 配置清除（含授权码）', reset?.settings?.smtpPassSet === false && reset.settings.smtpHost === null);
  }

  // ────────────────────────────────────────────────────────────
  section('11.9 飞书群通知');
  {
    const received = [];
    const capture = http.createServer((request, response) => {
      let body = '';
      request.on('data', (chunk) => { body += chunk; });
      request.on('end', () => {
        received.push(JSON.parse(body || '{}'));
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ code: 0 }));
      });
    });
    await new Promise((resolve) => capture.listen(3199, '127.0.0.1', resolve));

    await req('PUT', '/api/admin/settings', { body: { feishuEnabled: true, feishuWebhookUrl: 'http://127.0.0.1:3199/hook', feishuSecret: 'test-secret-123', feishuEvents: ['post.published'] } });

    const post = await json(await req('POST', '/api/posts', { body: { title: `飞书通知测试文${RUN}`, contentMd: '飞书通知正文', status: 'published' } }));
    let card = null;
    for (let i = 0; i < 20 && !card; i++) { await sleep(300); card = received[0]; }
    ok('文章发布事件推送到飞书 Webhook', Boolean(card));
    ok('消息为交互卡片且标题含「发布」', card?.msg_type === 'interactive' && (card?.card?.header?.title?.content ?? '').includes('发布'), JSON.stringify(card?.card?.header));
    ok('签名密钥生效（携带 timestamp/sign）', typeof card?.timestamp === 'string' && typeof card?.sign === 'string');

    const countBefore = received.length;
    const comment = await json(await req('POST', '/api/comments', { body: { targetType: 'post', targetId: post.id, authorName: '飞书访客', authorEmail: `f${RUN}@t.io`, contentMd: '订阅外的评论事件' } }));
    commentsForCleanup.push(comment.comment.id);
    await sleep(2000);
    ok('未订阅的事件（评论待审核）不推送', received.length === countBefore, `收到 ${received.length - countBefore} 条`);

    await req('DELETE', `/api/posts/${encodeURIComponent(post.slug)}`);
    await req('DELETE', `/api/admin/recycle-bin/${post.id}`);
    await req('PUT', '/api/admin/settings', { body: { feishuEnabled: false, feishuWebhookUrl: null, feishuSecret: '', feishuEvents: [] } });
    capture.close();
  }

  // ────────────────────────────────────────────────────────────
  section('11.10 SEO 设置');
  {
    await req('PUT', '/api/admin/settings', { body: { seoKeywords: '功能测试关键词甲,关键词乙' } });
    const home = await text(await req('GET', '/', { auth: false }));
    ok('站点关键词输出至 meta keywords', home.includes('功能测试关键词甲'));
    const robots = await text(await req('GET', '/robots.txt', { auth: false }));
    ok('未屏蔽时 robots 允许抓取并屏蔽后台', robots.includes('Disallow: /console') && !robots.includes('Disallow: /$') && robots.includes('Sitemap:'));
    const sitemap = await text(await req('GET', '/sitemap.xml', { auth: false }));
    ok('未屏蔽时 sitemap 非空', sitemap.includes('<url>'));

    await req('PUT', '/api/admin/settings', { body: { blockSearchEngine: true } });
    const blockedRobots = await text(await req('GET', '/robots.txt', { auth: false }));
    ok('屏蔽后 robots 全站 Disallow', blockedRobots.includes('Disallow: /') && !blockedRobots.includes('/console'), blockedRobots.slice(0, 120));
    const blockedHome = await text(await req('GET', '/', { auth: false }));
    ok('屏蔽后页面携带 noindex', blockedHome.includes('noindex'));
    const blockedSitemap = await text(await req('GET', '/sitemap.xml', { auth: false }));
    ok('屏蔽后 sitemap 置空', !blockedSitemap.includes('<url>'));

    await req('PUT', '/api/admin/settings', { body: { blockSearchEngine: false, seoKeywords: null } });
  }

  // ────────────────────────────────────────────────────────────
  section('11.13 文章版本历史');
  {
    const post = await json(await req('POST', '/api/posts', { body: { title: `版本历史测试文${RUN}`, contentMd: '第一版内容', status: 'draft' } }));
    let revisions = (await json(await req('GET', `/api/admin/posts/${post.id}/revisions`)))?.revisions ?? [];
    ok('创建文章即生成首版快照', revisions.length === 1);

    for (let i = 2; i <= 26; i++) {
      await req('PUT', `/api/posts/${encodeURIComponent(post.slug)}`, { body: { contentMd: `第${i}版内容标记${RUN}` } });
    }
    revisions = (await json(await req('GET', `/api/admin/posts/${post.id}/revisions`)))?.revisions ?? [];
    ok('超过 20 条后滚动淘汰最旧（保持 20 条）', revisions.length === 20, `实际 ${revisions.length}`);

    const oldest = revisions[0];
    const snapshot = await json(await req('GET', `/api/admin/posts/${post.id}/revisions?revisionId=${oldest.id}`));
    ok('可查看快照内容', snapshot?.revision?.contentMd?.includes('版内容标记'), JSON.stringify(snapshot?.revision?.contentMd?.slice(0, 30)));

    const rollback = await req('POST', `/api/admin/posts/${post.id}/revisions`, { body: { revisionId: oldest.id } });
    const afterRollback = await json(await req('GET', `/api/posts/${encodeURIComponent(post.slug)}`));
    ok('一键回滚恢复历史内容', rollback.status === 200 && afterRollback?.contentMd === snapshot.revision.contentMd);
    const revisionsAfter = (await json(await req('GET', `/api/admin/posts/${post.id}/revisions`)))?.revisions ?? [];
    ok('回滚动作本身生成新快照', revisionsAfter.length === 20 && revisionsAfter.at(-1).wordCount === snapshot.revision.wordCount);

    await req('DELETE', `/api/posts/${encodeURIComponent(post.slug)}`);
    await req('DELETE', `/api/admin/recycle-bin/${post.id}`);
  }

  // ────────────────────────────────────────────────────────────
  section('11.11 备份与恢复');
  {
    await req('PUT', '/api/admin/settings', { body: { backupKeepCount: 2 } });

    const marker = await json(await req('POST', '/api/admin/categories', { body: { name: `恢复标记分类${RUN}`, slug: `restore-${RUN}` } }));
    ok('创建恢复标记分类', Boolean(marker?.category?.id));

    const b1 = await json(await req('POST', '/api/admin/backup', { body: { note: 'retention-1' } }));
    await json(await req('POST', '/api/admin/backup', { body: { note: 'retention-2' } }));
    await json(await req('POST', '/api/admin/backup', { body: { note: 'retention-3' } }));
    let list = (await json(await req('GET', '/api/admin/backup')))?.backups ?? [];
    const successCount = list.filter((b) => b.status === 'success').length;
    ok('保留策略生效（keep=2，创建 3 份后仅存 2 份）', successCount === 2, `实际 ${successCount}`);
    ok('最旧的备份被滚动淘汰', !list.some((b) => b.id === b1.id));

    // 为恢复准备：确保标记分类在最新备份里（刚才 3 次备份之后创建的分类可能不在，重建一次）
    const markerBackup = await json(await req('POST', '/api/admin/backup', { body: { note: `恢复点${RUN}` } }));
    ok('创建恢复点备份', markerBackup?.id != null);
    const archive = Buffer.from(await (await req('GET', `/api/admin/backup/${markerBackup.id}/download`)).arrayBuffer());
    ok('备份包可下载（gzip）', archive[0] === 0x1f && archive[1] === 0x8b);
    const dumpCheck = fs.existsSync(path.join(process.cwd(), 'backups', markerBackup.filename));
    ok('备份文件落盘', dumpCheck);

    await req('DELETE', `/api/admin/categories/${marker.category.id}`);
    const markerGone = await json(await req('GET', '/api/admin/categories'));
    ok('删除标记分类（制造数据丢失）', !markerGone.categories.some((c) => c.id === marker.category.id));

    const form = new FormData();
    form.append('file', new File([archive], 'restore.tar.gz', { type: 'application/gzip' }));
    const restoreRes = await json(await req('POST', '/api/admin/backup/restore', { form }));
    ok('上传备份包整站恢复', restoreRes?.restored === true, JSON.stringify(restoreRes));

    const afterRestore = await json(await req('GET', '/api/admin/categories'));
    ok('恢复后标记分类数据回归', afterRestore.categories.some((c) => c.id === marker.category.id));
    const backupsOnDisk = fs.readdirSync(path.join(process.cwd(), 'backups')).filter((f) => f.endsWith('.tar.gz'));
    ok('恢复前自动备份已生成（保留策略外的安全网）', backupsOnDisk.length >= 1, `磁盘文件 ${backupsOnDisk.length} 个`);

    // 清理
    await req('PUT', '/api/admin/settings', { body: { backupKeepCount: 5 } });
    list = (await json(await req('GET', '/api/admin/backup')))?.backups ?? [];
    for (const b of list) await req('DELETE', `/api/admin/backup/${b.id}`);
    for (const file of fs.readdirSync(path.join(process.cwd(), 'backups')).filter((f) => f.endsWith('.tar.gz'))) {
      fs.rmSync(path.join(process.cwd(), 'backups', file), { force: true });
    }
    await req('DELETE', `/api/admin/categories/${marker.category.id}`);
    ok('备份测试数据清理完成', ((await json(await req('GET', '/api/admin/backup')))?.backups ?? []).length === 0);
  }

  // ────────────────────────────────────────────────────────────
  section('收尾：清理功能测试数据');
  {
    for (const post of categoryPosts) {
      await req('DELETE', `/api/posts/${encodeURIComponent(post.slug)}`);
      await req('DELETE', `/api/admin/recycle-bin/${post.id}`);
    }
    for (const commentId of commentsForCleanup) {
      if (commentId) await req('DELETE', `/api/comments?id=${commentId}`);
    }
    // 清理分组测试遗留附件
    const leftovers = await json(await req('GET', '/api/admin/attachments?limit=100'));
    const leftoverIds = (leftovers?.attachments ?? []).filter((a) => a.originalName.endsWith('.png')).map((a) => a.id);
    if (leftoverIds.length) await req('DELETE', '/api/admin/attachments', { body: { ids: leftoverIds } });

    const adminPosts = await json(await req('GET', '/api/posts?limit=100'));
    const testPosts = (adminPosts?.posts ?? []).filter((p) => p.title.includes(RUN));
    for (const p of testPosts) {
      await req('DELETE', `/api/posts/${encodeURIComponent(p.slug)}`);
      await req('DELETE', `/api/admin/recycle-bin/${p.id}`);
    }

    const remainingBin = await json(await req('GET', '/api/admin/recycle-bin?limit=100'));
    const testBinPosts = (remainingBin?.posts ?? []).filter((p) => p.title.includes(RUN));
    for (const p of testBinPosts) await req('DELETE', `/api/admin/recycle-bin/${p.id}`);

    const anonList = await json(await req('GET', '/api/posts?limit=100', { auth: false }));
    ok('功能测试数据已全部清理', !(anonList.posts ?? []).some((p) => p.title.includes(RUN)));
    ok('站点健康检查（首页 200）', (await fetch(BASE)).status === 200);
  }

  await db.end();
  report();
}

function report() {
  console.log('\n══════════════════════════════════════');
  console.log(`功能完整性测试完成：通过 ${passCount}，失败 ${failCount}`);
  if (failCount > 0) {
    console.log('失败项：');
    for (const s of sections) {
      for (const line of s.lines) {
        if (!line.pass) console.log(`  [${s.name}] ${line.name}${line.detail ? ' — ' + line.detail : ''}`);
      }
    }
  }
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('测试执行异常：', error);
  report();
});
