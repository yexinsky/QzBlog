/**
 * 清除 Mock 数据脚本
 * 保留管理员账号，删除所有其他测试数据
 * 运行方式: npx tsx scripts/clear-mock-data.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/db/schema';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/qzblog';

async function clearMockData() {
  console.log('🔄 正在连接数据库...');
  const client = postgres(DATABASE_URL, { max: 10, idle_timeout: 20 });
  const db = drizzle(client, { schema });

  console.log('🗑️  开始清除 Mock 数据...');

  try {
    // 按依赖顺序删除数据（先删子表，再删主表）
    // 注意：需要先关闭外键约束或使用 CASCADE

    // 1. 删除点赞记录（无依赖）
    await db.delete(schema.postLikes);
    console.log('  ✓ 已清除 post_likes');

    await db.delete(schema.momentLikes);
    console.log('  ✓ 已清除 moment_likes');

    // 2. 删除评论
    await db.delete(schema.comments);
    console.log('  ✓ 已清除 comments');

    // 3. 删除文章标签关联
    await db.delete(schema.postTags);
    console.log('  ✓ 已清除 post_tags');

    // 4. 删除系列文章关联
    await db.delete(schema.seriesPosts);
    console.log('  ✓ 已清除 series_posts');

    // 5. 删除学习节点
    await db.delete(schema.learningNodes);
    console.log('  ✓ 已清除 learning_nodes');

    // 6. 删除动态
    await db.delete(schema.moments);
    console.log('  ✓ 已清除 moments');

    // 7. 删除文章
    await db.delete(schema.posts);
    console.log('  ✓ 已清除 posts');

    // 8. 删除学习路线
    await db.delete(schema.learningRoutes);
    console.log('  ✓ 已清除 learning_routes');

    // 9. 删除系列
    await db.delete(schema.series);
    console.log('  ✓ 已清除 series');

    // 10. 删除标签
    await db.delete(schema.tags);
    console.log('  ✓ 已清除 tags');

    // 11. 删除项目
    await db.delete(schema.projects);
    console.log('  ✓ 已清除 projects');

    // 12. 删除里程碑
    await db.delete(schema.milestones);
    console.log('  ✓ 已清除 milestones');

    // 13. 删除访问记录
    await db.delete(schema.pageViews);
    console.log('  ✓ 已清除 page_views');

    // 14. 删除技能
    await db.delete(schema.skills);
    console.log('  ✓ 已清除 skills');

    // 15. 删除社交链接
    await db.delete(schema.socialLinks);
    console.log('  ✓ 已清除 social_links');

    // 16. 删除工作经历
    await db.delete(schema.workExperience);
    console.log('  ✓ 已清除 work_experience');

    // 17. 删除站点设置
    await db.delete(schema.siteSettings);
    console.log('  ✓ 已清除 site_settings');

    // 18. 删除非管理员用户（保留管理员账号）
    // 使用 SQL 直接执行保留管理员的删除
    await client.unsafe(`DELETE FROM users WHERE role != 'admin'`);
    console.log('  ✓ 已清除非管理员用户');

    console.log('\n✅ Mock 数据清除完成！');
    console.log('📌 管理员账号已保留，可用于测试');

  } catch (error) {
    console.error('❌ 清除数据时出错:', error);
    throw error;
  } finally {
    await client.end();
  }
}

clearMockData().catch(console.error);
