import { MetadataRoute } from 'next'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'

const BASE_URL = process.env.NEXTAUTH_URL || 'https://qzblog.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/moments`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/projects`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/timeline`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/learning`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
  ]

  try {
    // 文章页面
    const posts = await db.query.posts.findMany({
      where: eq(schema.posts.status, 'published'),
      columns: { slug: true, updatedAt: true },
    })

    const postPages: MetadataRoute.Sitemap = posts.map((post) => ({
      url: `${BASE_URL}/posts/${post.slug}`,
      lastModified: post.updatedAt ? new Date(post.updatedAt) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    }))

    // 标签页面
    const tags = await db.query.tags.findMany({
      columns: { slug: true, createdAt: true },
    })

    const tagPages: MetadataRoute.Sitemap = tags.map((tag) => ({
      url: `${BASE_URL}/tags/${tag.slug}`,
      lastModified: tag.createdAt ? new Date(tag.createdAt) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }))

    // 系列页面
    const series = await db.query.series.findMany({
      columns: { slug: true, updatedAt: true },
    })

    const seriesPages: MetadataRoute.Sitemap = series.map((s) => ({
      url: `${BASE_URL}/series/${s.slug}`,
      lastModified: s.updatedAt ? new Date(s.updatedAt) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

    return [...staticPages, ...postPages, ...tagPages, ...seriesPages]
  } catch (error) {
    console.error('Error generating sitemap:', error)
    return staticPages
  }
}
