import { NextRequest } from 'next/server'
import { verifyApiToken, extractBearerToken } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/response'
import { generateAllSitemaps } from '@/lib/sitemap'
import { setCorsHeaders, handleCorsPreflightRequest } from '@/lib/cors'

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  return handleCorsPreflightRequest(origin)
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  
  try {
    const token = extractBearerToken(request)
    
    const validToken = await verifyApiToken(token || '')
    
    if (!validToken) {
      return setCorsHeaders(unauthorizedResponse('Invalid or expired API token'), origin)
    }
    
    console.log('Generating sitemaps...')
    const sitemaps = await generateAllSitemaps()
    
    const responseData = {
      success: true,
      message: 'Sitemaps generated successfully',
      generated_at: new Date().toISOString(),
      sitemaps: {
        root: !!sitemaps.root,
        pages: !!sitemaps.pages,
        blog_index: !!sitemaps.blogIndex,
        blog_chunks: sitemaps.blogChunks.length,
        job_posts_index: !!sitemaps.jobPostsIndex,
        job_posts_chunks: sitemaps.jobPostsChunks.length,
        job_category: !!sitemaps.jobCategorySitemap,
        job_location_index: !!sitemaps.jobLocationIndex,
        job_location_chunks: Object.keys(sitemaps.jobLocationChunks).length
      }
    }
    
    return setCorsHeaders(successResponse(responseData, false), origin)
  } catch (error) {
    console.error('Error generating sitemaps:', error)
    return setCorsHeaders(errorResponse('Failed to generate sitemaps'), origin)
  }
}