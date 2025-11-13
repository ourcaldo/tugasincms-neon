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

export async function generateJobCategorySitemap(baseUrl?: string): Promise<string> {
  const url = baseUrl || getBaseUrl()
  
  const categories = await sql`
    SELECT 
      jc.slug,
      jc.updated_at
    FROM job_categories jc
    ORDER BY jc.name ASC
  `
  
  const categoryUrls: SitemapUrl[] = categories.map((category: any) => {
    return {
      loc: `${url}/lowongan-kerja/${category.slug}`,
      lastmod: category.updated_at ? new Date(category.updated_at).toISOString() : new Date().toISOString(),
      changefreq: 'daily' as const,
      priority: 0.7
    }
  })

  return generateSitemapXML(categoryUrls)
}

export async function generateJobLocationSitemaps(baseUrl?: string): Promise<{ index: string, locationChunks: Record<string, string> }> {
  const url = baseUrl || getBaseUrl()
  const cmsHost = getCmsHost()
  
  const provinces = await sql`
    SELECT 
      p.id,
      p.name
    FROM reg_provinces p
    ORDER BY p.name ASC
  `
  
  const locationChunks: Record<string, string> = {}
  const provinceUrls: string[] = []
  
  for (const province of provinces) {
    const provinceSlug = province.name.toLowerCase().replace(/\s+/g, '-')
    
    const regencies = await sql`
      SELECT 
        r.id,
        r.name
      FROM reg_regencies r
      WHERE r.province_id = ${province.id}
      ORDER BY r.name ASC
    `
    
    if (regencies.length > 0) {
      const locationUrls: SitemapUrl[] = regencies.map((regency: any) => {
        const regencySlug = regency.name.toLowerCase().replace(/\s+/g, '-').replace(/\./g, '')
        return {
          loc: `${url}/lowongan-kerja/lokasi/${provinceSlug}/${regencySlug}`,
          changefreq: 'daily' as const,
          priority: 0.6
        }
      })
      
      const provinceChunkXml = generateSitemapXML(locationUrls)
      const provinceChunkKey = provinceSlug
      locationChunks[provinceChunkKey] = provinceChunkXml
      provinceUrls.push(`${url}/api/v1/sitemaps/sitemap-job-location-${provinceSlug}.xml`)
    }
  }

  const indexXml = generateSitemapIndexXML(provinceUrls)

  return { index: indexXml, locationChunks }
}

export interface JobSitemapsResult {
  jobPostsIndex: string
  jobPostsChunks: string[]
  jobCategorySitemap: string
  jobLocationIndex: string
  jobLocationChunks: Record<string, string>
}

export async function generateJobSitemaps(baseUrl?: string): Promise<JobSitemapsResult> {
  const url = baseUrl || getBaseUrl()
  
  const posts = await sql`
    SELECT 
      jp.id,
      jp.slug,
      jp.updated_at,
      COALESCE(jc.slug, 'uncategorized') as category_slug
    FROM job_posts jp
    LEFT JOIN job_post_categories jpc ON jp.id = jpc.job_post_id
    LEFT JOIN job_categories jc ON jpc.category_id = jc.id
    WHERE jp.status = 'published'
    ORDER BY jp.updated_at DESC
  `
  
  const uniquePosts = new Map()
  posts.forEach((post: any) => {
    if (!uniquePosts.has(post.id)) {
      uniquePosts.set(post.id, post)
    }
  })
  
  const jobUrls: SitemapUrl[] = Array.from(uniquePosts.values()).map((post: any) => {
    return {
      loc: `${url}/jobs/${post.category_slug}/${post.slug}/`,
      lastmod: new Date(post.updated_at).toISOString(),
      changefreq: 'weekly' as const,
      priority: 0.8
    }
  })

  const jobPostsChunks: string[] = []
  const chunkUrls: string[] = []
  
  for (let i = 0; i < jobUrls.length; i += POSTS_PER_SITEMAP) {
    const chunkIndex = Math.floor(i / POSTS_PER_SITEMAP) + 1
    const chunkPosts = jobUrls.slice(i, i + POSTS_PER_SITEMAP)
    const chunkXml = generateSitemapXML(chunkPosts)
    jobPostsChunks.push(chunkXml)
    chunkUrls.push(`${url}/api/v1/sitemaps/sitemap-job-${chunkIndex}.xml`)
  }

  const jobPostsIndex = generateSitemapIndexXML(chunkUrls)
  
  const jobCategorySitemap = await generateJobCategorySitemap(url)
  
  const { index: jobLocationIndex, locationChunks: jobLocationChunks } = await generateJobLocationSitemaps(url)

  return {
    jobPostsIndex,
    jobPostsChunks,
    jobCategorySitemap,
    jobLocationIndex,
    jobLocationChunks
  }
}

export interface GeneratedSitemaps {
  root: string
  pages: string
  blogIndex: string | null
  blogChunks: string[]
  jobPostsIndex: string | null
  jobPostsChunks: string[]
  jobCategorySitemap: string | null
  jobLocationIndex: string | null
  jobLocationChunks: Record<string, string>
  info: SitemapInfo[]
}

export async function generateAllSitemaps(requestHost?: string): Promise<GeneratedSitemaps> {
  const sitemapHost = getSitemapHost()
  const cmsHost = getCmsHost()
  const TTL = 3600 // 60 minutes
  
  const pagesSitemap = await generatePagesSitemap(sitemapHost)
  try { await setCachedData('sitemap:pages', pagesSitemap, TTL) } catch (e) { }

  const { index: blogIndex, chunks: blogChunks } = await generateBlogSitemaps(sitemapHost)
  
  if (blogIndex) {
    try { await setCachedData('sitemap:post:index', blogIndex, TTL) } catch (e) { }
    
    for (let i = 0; i < blogChunks.length; i++) {
      try { await setCachedData(`sitemap:post:chunk:${i + 1}`, blogChunks[i], TTL) } catch (e) { }
    }
    
    try { await setCachedData('sitemap:post:chunk:count', blogChunks.length.toString(), TTL) } catch (e) { }
  }

  const {
    jobPostsIndex,
    jobPostsChunks,
    jobCategorySitemap,
    jobLocationIndex,
    jobLocationChunks
  } = await generateJobSitemaps(sitemapHost)
  
  if (jobPostsIndex) {
    try { await setCachedData('sitemap:job:index', jobPostsIndex, TTL) } catch (e) { }
    
    for (let i = 0; i < jobPostsChunks.length; i++) {
      try { await setCachedData(`sitemap:job:chunk:${i + 1}`, jobPostsChunks[i], TTL) } catch (e) { }
    }
    
    try { await setCachedData('sitemap:job:chunk:count', jobPostsChunks.length.toString(), TTL) } catch (e) { }
  }

  if (jobCategorySitemap) {
    try { await setCachedData('sitemap:job:category', jobCategorySitemap, TTL) } catch (e) { }
  }

  if (jobLocationIndex) {
    try { await setCachedData('sitemap:job:location:index', jobLocationIndex, TTL) } catch (e) { }
    
    for (const [provinceSlug, locationXml] of Object.entries(jobLocationChunks)) {
      try { await setCachedData(`sitemap:job:location:${provinceSlug}`, locationXml, TTL) } catch (e) { }
    }
  }

  const jobSitemapUrl = `${cmsHost}/api/v1/sitemaps/sitemap-job.xml`
  const jobSitemapReferences: string[] = []
  
  if (jobPostsIndex) {
    jobPostsChunks.forEach((_chunk: string, i: number) => {
      jobSitemapReferences.push(`${cmsHost}/api/v1/sitemaps/sitemap-job-${i + 1}.xml`)
    })
  }
  
  if (jobCategorySitemap) {
    jobSitemapReferences.push(`${cmsHost}/api/v1/sitemaps/sitemap-job-category.xml`)
  }
  
  if (jobLocationIndex) {
    jobSitemapReferences.push(`${cmsHost}/api/v1/sitemaps/sitemap-job-location.xml`)
    
    for (const provinceSlug of Object.keys(jobLocationChunks)) {
      jobSitemapReferences.push(`${cmsHost}/api/v1/sitemaps/sitemap-job-location-${provinceSlug}.xml`)
    }
  }
  
  const jobSitemapIndex = generateSitemapIndexXML(jobSitemapReferences)
  try { await setCachedData('sitemap:job:main:index', jobSitemapIndex, TTL) } catch (e) { }

  const rootSitemaps = [
    `${cmsHost}/api/v1/sitemaps/sitemap-pages.xml`,
    ...(blogIndex ? [`${cmsHost}/api/v1/sitemaps/sitemap-post.xml`] : []),
    ...(jobPostsIndex || jobCategorySitemap || jobLocationIndex ? [jobSitemapUrl] : [])
  ]
  const rootSitemap = generateSitemapIndexXML(rootSitemaps)
  try { await setCachedData('sitemap:root', rootSitemap, TTL) } catch (e) { }

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
    const blogChunkUrls = blogChunks.map((_chunk: string, i: number) => 
      `${cmsHost}/api/v1/sitemaps/sitemap-post-${i + 1}.xml`
    )
    sitemapInfo.push({
      type: 'blog',
      url: `${cmsHost}/api/v1/sitemaps/sitemap-post.xml`,
      index: `${cmsHost}/api/v1/sitemaps/sitemap-post.xml`,
      references: blogChunkUrls
    })
  }

  if (jobPostsIndex || jobCategorySitemap || jobLocationIndex) {
    sitemapInfo.push({
      type: 'job',
      url: jobSitemapUrl,
      index: jobSitemapUrl,
      references: jobSitemapReferences
    })
  }

  try { await setCachedData('sitemaps:info', sitemapInfo, TTL) } catch (e) { }

  console.log(`Sitemaps generated successfully (cached: ${TTL}s) using CMS host: ${cmsHost}, Sitemap host: ${sitemapHost}`)
  
  return {
    root: rootSitemap,
    pages: pagesSitemap,
    blogIndex,
    blogChunks,
    jobPostsIndex,
    jobPostsChunks,
    jobCategorySitemap,
    jobLocationIndex,
    jobLocationChunks,
    info: sitemapInfo
  }
}

export async function getSitemapInfo(): Promise<SitemapInfo[]> {
  const cached = await getCachedData('sitemaps:info')
  if (cached) {
    return cached as SitemapInfo[]
  }

  const generated = await generateAllSitemaps()
  return generated.info
}

export async function invalidateSitemaps(): Promise<void> {
  await deleteCachedData('sitemaps:info')
  await generateAllSitemaps()
}
