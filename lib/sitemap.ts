import { sql } from './database'
import { getCachedData, setCachedData, deleteCachedData } from './cache'

export interface SitemapUrl {
  loc: string
  lastmod?: string
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
}

export interface SitemapInfo {
  type: string
  url: string
  index?: string
  references?: string[]
}

const POSTS_PER_SITEMAP = 200

function getCmsHost(): string {
  if (process.env.CMS_HOST) {
    return `https://${process.env.CMS_HOST}`
  }
  
  const replitDomain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS
  if (replitDomain) {
    return `https://${replitDomain.split(',')[0]}`
  }
  
  return 'http://localhost:5000'
}

function getSitemapHost(): string {
  if (process.env.SITEMAP_HOST) {
    return `https://${process.env.SITEMAP_HOST}`
  }
  
  if (process.env.CMS_HOST) {
    return `https://${process.env.CMS_HOST}`
  }
  
  const replitDomain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS
  if (replitDomain) {
    return `https://${replitDomain.split(',')[0]}`
  }
  
  return 'http://localhost:5000'
}

function getBaseUrl(requestHost?: string): string {
  if (requestHost) {
    return `https://${requestHost}`
  }
  
  return getSitemapHost()
}

export function generateSitemapXML(urls: SitemapUrl[]): string {
  const urlEntries = urls.map(url => {
    let entry = `  <url>\n    <loc>${escapeXml(url.loc)}</loc>\n`
    if (url.lastmod) entry += `    <lastmod>${url.lastmod}</lastmod>\n`
    if (url.changefreq) entry += `    <changefreq>${url.changefreq}</changefreq>\n`
    if (url.priority !== undefined) entry += `    <priority>${url.priority}</priority>\n`
    entry += `  </url>`
    return entry
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`
}

export function generateSitemapIndexXML(sitemaps: string[]): string {
  const sitemapEntries = sitemaps.map(sitemap => {
    return `  <sitemap>\n    <loc>${escapeXml(sitemap)}</loc>\n    <lastmod>${new Date().toISOString()}</lastmod>\n  </sitemap>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}
</sitemapindex>`
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '&': return '&amp;'
      case "'": return '&apos;'
      case '"': return '&quot;'
      default: return c
    }
  })
}

export async function generatePagesSitemap(baseUrl?: string): Promise<string> {
  const url = baseUrl || getBaseUrl()
  const staticPages: SitemapUrl[] = [
    {
      loc: `${url}/`,
      changefreq: 'daily',
      priority: 1.0,
      lastmod: new Date().toISOString()
    },
  ]

  return generateSitemapXML(staticPages)
}

export async function generateBlogSitemaps(baseUrl?: string): Promise<{ index: string, chunks: string[] }> {
  const url = baseUrl || getBaseUrl()
  
  // Fetch all published blog posts (excluding other post types like job posts) with their first category
  const posts = await sql`
    SELECT 
      p.id,
      p.slug,
      p.updated_at,
      COALESCE(c.slug, 'uncategorized') as category_slug
    FROM posts p
    LEFT JOIN post_categories pc ON p.id = pc.post_id
    LEFT JOIN categories c ON pc.category_id = c.id
    WHERE p.status = 'published'
      AND (p.post_type = 'post' OR p.post_type IS NULL)
    ORDER BY p.updated_at DESC
  `
  
  // Group posts by id to get only the first category for each post
  const uniquePosts = new Map()
  posts.forEach((post: any) => {
    if (!uniquePosts.has(post.id)) {
      uniquePosts.set(post.id, post)
    }
  })
  
  const blogUrls: SitemapUrl[] = Array.from(uniquePosts.values()).map((post: any) => {
    return {
      loc: `${url}/blog/${post.category_slug}/${post.slug}/`,
      lastmod: new Date(post.updated_at).toISOString(),
      changefreq: 'weekly' as const,
      priority: 0.8
    }
  })

  const chunks: string[] = []
  const chunkUrls: string[] = []
  
  for (let i = 0; i < blogUrls.length; i += POSTS_PER_SITEMAP) {
    const chunkIndex = Math.floor(i / POSTS_PER_SITEMAP) + 1
    const chunkPosts = blogUrls.slice(i, i + POSTS_PER_SITEMAP)
    const chunkXml = generateSitemapXML(chunkPosts)
    chunks.push(chunkXml)
    chunkUrls.push(`${url}/api/v1/sitemaps/sitemap-post-${chunkIndex}.xml`)
  }

  const indexXml = generateSitemapIndexXML(chunkUrls)

  return { index: indexXml, chunks }
}

export async function generateAllSitemaps(requestHost?: string): Promise<void> {
  try {
    const sitemapHost = getSitemapHost()
    const cmsHost = getCmsHost()
    const TTL = 3600 // 60 minutes
    
    const pagesSitemap = await generatePagesSitemap(sitemapHost)
    await setCachedData('sitemap:pages', pagesSitemap, TTL)

    const { index: blogIndex, chunks: blogChunks } = await generateBlogSitemaps(sitemapHost)
    
    if (blogIndex) {
      await setCachedData('sitemap:post:index', blogIndex, TTL)
      
      for (let i = 0; i < blogChunks.length; i++) {
        await setCachedData(`sitemap:post:chunk:${i + 1}`, blogChunks[i], TTL)
      }
      
      await setCachedData('sitemap:post:chunk:count', blogChunks.length.toString(), TTL)
    }

    const rootSitemaps = [
      `${cmsHost}/api/v1/sitemaps/sitemap-pages.xml`,
      ...(blogIndex ? [`${cmsHost}/api/v1/sitemaps/sitemap-post.xml`] : [])
    ]
    const rootSitemap = generateSitemapIndexXML(rootSitemaps)
    await setCachedData('sitemap:root', rootSitemap, TTL)

    const sitemapInfo: SitemapInfo[] = [
      {
        type: 'root',
        url: `${cmsHost}/api/v1/sitemaps/sitemap.xml`
      },
      {
        type: 'pages',
        url: `${cmsHost}/api/v1/sitemaps/sitemap-pages.xml`
      }
    ]

    if (blogIndex) {
      const blogChunkUrls = blogChunks.map((_, i) => 
        `${cmsHost}/api/v1/sitemaps/sitemap-post-${i + 1}.xml`
      )
      sitemapInfo.push({
        type: 'blog',
        url: `${cmsHost}/api/v1/sitemaps/sitemap-post.xml`,
        index: `${cmsHost}/api/v1/sitemaps/sitemap-post.xml`,
        references: blogChunkUrls
      })
    }

    await setCachedData('sitemaps:info', sitemapInfo, TTL)

    console.log(`Sitemaps generated successfully in Redis (TTL: ${TTL}s) using CMS host: ${cmsHost}, Sitemap host: ${sitemapHost}`)
  } catch (error) {
    console.error('Error generating sitemaps:', error)
    throw error
  }
}

export async function getSitemapInfo(): Promise<SitemapInfo[]> {
  const cached = await getCachedData('sitemaps:info')
  if (cached) {
    return cached as SitemapInfo[]
  }

  await generateAllSitemaps()
  
  const info = await getCachedData('sitemaps:info')
  return (info as SitemapInfo[]) || []
}

export async function invalidateSitemaps(): Promise<void> {
  await deleteCachedData('sitemaps:info')
  await generateAllSitemaps()
}
