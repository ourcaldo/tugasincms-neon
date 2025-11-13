import { NextRequest, NextResponse } from 'next/server'
import { getCachedData } from '@/lib/cache'
import { generateAllSitemaps } from '@/lib/sitemap'

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const { path } = params
    const filename = path.join('/')
    
    let sitemapKey: string
    let sitemapField: 'root' | 'pages' | 'blogIndex' | 'jobPostsIndex' | 'jobCategorySitemap' | 'jobLocationIndex' | null = null
    let chunkType: 'blog' | 'job' | null = null
    let chunkNum: number | null = null
    let locationProvince: string | null = null
    
    if (filename === 'sitemap.xml') {
      sitemapKey = 'sitemap:root'
      sitemapField = 'root'
    } else if (filename === 'sitemap-pages.xml') {
      sitemapKey = 'sitemap:pages'
      sitemapField = 'pages'
    } else if (filename === 'sitemap-post.xml') {
      sitemapKey = 'sitemap:post:index'
      sitemapField = 'blogIndex'
    } else if (filename.match(/^sitemap-post-(\d+)\.xml$/)) {
      const match = filename.match(/^sitemap-post-(\d+)\.xml$/)!
      chunkNum = parseInt(match[1])
      sitemapKey = `sitemap:post:chunk:${chunkNum}`
      chunkType = 'blog'
    } else if (filename === 'sitemap-job.xml') {
      sitemapKey = 'sitemap:job:main:index'
    } else if (filename.match(/^sitemap-job-(\d+)\.xml$/)) {
      const match = filename.match(/^sitemap-job-(\d+)\.xml$/)!
      chunkNum = parseInt(match[1])
      sitemapKey = `sitemap:job:chunk:${chunkNum}`
      chunkType = 'job'
    } else if (filename === 'sitemap-job-category.xml') {
      sitemapKey = 'sitemap:job:category'
      sitemapField = 'jobCategorySitemap'
    } else if (filename === 'sitemap-job-location.xml') {
      sitemapKey = 'sitemap:job:location:index'
      sitemapField = 'jobLocationIndex'
    } else if (filename.match(/^sitemap-job-location-(.+)\.xml$/)) {
      const match = filename.match(/^sitemap-job-location-(.+)\.xml$/)!
      locationProvince = match[1]
      sitemapKey = `sitemap:job:location:${locationProvince}`
    } else {
      return new NextResponse('Not Found', { status: 404 })
    }
    
    let sitemapXml = await getCachedData(sitemapKey)
    
    if (!sitemapXml) {
      console.log('Sitemap not found in cache, generating...')
      const generated = await generateAllSitemaps()
      
      if (sitemapField) {
        sitemapXml = generated[sitemapField]
      } else if (chunkType && chunkNum !== null) {
        const chunks = chunkType === 'blog' ? generated.blogChunks : generated.jobPostsChunks
        sitemapXml = chunks[chunkNum - 1] || null
      } else if (locationProvince) {
        sitemapXml = generated.jobLocationChunks[locationProvince] || null
      }
      
      if (!sitemapXml) {
        return new NextResponse('Sitemap not found', { status: 404 })
      }
    }
    
    return new NextResponse(sitemapXml as string, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Error serving sitemap:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
