import { NextRequest, NextResponse } from 'next/server'
import { getCachedData } from '@/lib/cache'
import { generateAllSitemaps } from '@/lib/sitemap'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params
    const filename = path.join('/')
    
    let sitemapKey: string
    
    if (filename === 'sitemap.xml') {
      sitemapKey = 'sitemap:root'
    } else if (filename === 'sitemap-pages.xml') {
      sitemapKey = 'sitemap:pages'
    } else if (filename === 'sitemap-post.xml') {
      sitemapKey = 'sitemap:post:index'
    } else if (filename.match(/^sitemap-post-(\d+)\.xml$/)) {
      const chunkNum = filename.match(/^sitemap-post-(\d+)\.xml$/)![1]
      sitemapKey = `sitemap:post:chunk:${chunkNum}`
    } else {
      return new NextResponse('Not Found', { status: 404 })
    }
    
    let sitemapXml = await getCachedData(sitemapKey)
    
    if (!sitemapXml) {
      console.log('Sitemap not found in cache, generating...')
      await generateAllSitemaps()
      sitemapXml = await getCachedData(sitemapKey)
      
      if (!sitemapXml) {
        return new NextResponse('Failed to generate sitemap', { status: 500 })
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
