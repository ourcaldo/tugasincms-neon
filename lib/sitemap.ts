import { supabase } from './supabase'
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
  chunks?: string[]
}

const POSTS_PER_SITEMAP = 200
const SITEMAP_BASE_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.domain.com'

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

export async function generatePagesSitemap(): Promise<string> {
  const staticPages: SitemapUrl[] = [
    {
      loc: `${SITEMAP_BASE_URL}/`,
      changefreq: 'daily',
      priority: 1.0,
      lastmod: new Date().toISOString()
    },
  ]

  return generateSitemapXML(staticPages)
}

export async function generateBlogSitemaps(): Promise<{ index: string, chunks: string[] }> {
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, slug, updated_at')
    .eq('status', 'published')
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching posts for sitemap:', error)
    return { index: '', chunks: [] }
  }

  const blogUrls: SitemapUrl[] = (posts || []).map(post => ({
    loc: `${SITEMAP_BASE_URL}/blog/${post.slug}`,
    lastmod: new Date(post.updated_at).toISOString(),
    changefreq: 'weekly' as const,
    priority: 0.8
  }))

  const chunks: string[] = []
  const chunkUrls: string[] = []
  
  for (let i = 0; i < blogUrls.length; i += POSTS_PER_SITEMAP) {
    const chunkIndex = Math.floor(i / POSTS_PER_SITEMAP) + 1
    const chunkPosts = blogUrls.slice(i, i + POSTS_PER_SITEMAP)
    const chunkXml = generateSitemapXML(chunkPosts)
    chunks.push(chunkXml)
    chunkUrls.push(`${SITEMAP_BASE_URL}/api/v1/sitemaps/blog-${chunkIndex}.xml`)
  }

  const indexXml = generateSitemapIndexXML(chunkUrls)

  return { index: indexXml, chunks }
}

export async function generateAllSitemaps(): Promise<void> {
  try {
    const pagesSitemap = await generatePagesSitemap()
    await setCachedData('sitemap:pages', pagesSitemap, 0)

    const { index: blogIndex, chunks: blogChunks } = await generateBlogSitemaps()
    
    if (blogIndex) {
      await setCachedData('sitemap:blog:index', blogIndex, 0)
      
      for (let i = 0; i < blogChunks.length; i++) {
        await setCachedData(`sitemap:blog:chunk:${i + 1}`, blogChunks[i], 0)
      }
      
      await setCachedData('sitemap:blog:chunk:count', blogChunks.length.toString(), 0)
    }

    const rootSitemaps = [
      `${SITEMAP_BASE_URL}/api/v1/sitemaps/pages.xml`,
      ...(blogIndex ? [`${SITEMAP_BASE_URL}/api/v1/sitemaps/blog.xml`] : [])
    ]
    const rootSitemap = generateSitemapIndexXML(rootSitemaps)
    await setCachedData('sitemap:root', rootSitemap, 0)

    const sitemapInfo: SitemapInfo[] = [
      {
        type: 'root',
        url: `${SITEMAP_BASE_URL}/api/v1/sitemaps/root.xml`
      },
      {
        type: 'pages',
        url: `${SITEMAP_BASE_URL}/api/v1/sitemaps/pages.xml`
      }
    ]

    if (blogIndex) {
      const blogChunkUrls = blogChunks.map((_, i) => 
        `${SITEMAP_BASE_URL}/api/v1/sitemaps/blog-${i + 1}.xml`
      )
      sitemapInfo.push({
        type: 'blog',
        url: `${SITEMAP_BASE_URL}/api/v1/sitemaps/blog.xml`,
        index: `${SITEMAP_BASE_URL}/api/v1/sitemaps/blog.xml`,
        chunks: blogChunkUrls
      })
    }

    await setCachedData('sitemaps:info', sitemapInfo, 0)

    console.log('Sitemaps generated successfully in Redis')
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
