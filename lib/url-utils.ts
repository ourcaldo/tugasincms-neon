/**
 * URL utility functions for consistent URL handling across the application
 */

/**
 * Ensures a URL ends with a trailing slash (except for files and special cases)
 * @param url - The URL to normalize
 * @returns The URL with trailing slash added if needed
 */
export function ensureTrailingSlash(url: string): string {
  try {
    const urlObj = new URL(url, 'http://localhost') // Use base for relative URLs
    
    // Don't add trailing slash to:
    // 1. Root path (already has /)
    // 2. Paths with file extensions
    // 3. Paths with query parameters (preserve as-is)
    if (
      urlObj.pathname === '/' ||
      /\.[a-zA-Z0-9]+$/.test(urlObj.pathname) ||
      urlObj.search
    ) {
      return url
    }
    
    // Add trailing slash if not present
    if (!urlObj.pathname.endsWith('/')) {
      urlObj.pathname += '/'
    }
    
    // Return relative URL if input was relative
    if (!url.startsWith('http')) {
      return urlObj.pathname + urlObj.search + urlObj.hash
    }
    
    return urlObj.toString()
  } catch (error) {
    // If URL parsing fails, return original
    return url
  }
}

/**
 * Removes trailing slash from URL (except root path)
 * @param url - The URL to normalize
 * @returns The URL with trailing slash removed if present
 */
export function removeTrailingSlash(url: string): string {
  try {
    const urlObj = new URL(url, 'http://localhost')
    
    // Don't remove trailing slash from root path
    if (urlObj.pathname === '/') {
      return url
    }
    
    // Remove trailing slash if present
    if (urlObj.pathname.endsWith('/')) {
      urlObj.pathname = urlObj.pathname.slice(0, -1)
    }
    
    // Return relative URL if input was relative
    if (!url.startsWith('http')) {
      return urlObj.pathname + urlObj.search + urlObj.hash
    }
    
    return urlObj.toString()
  } catch (error) {
    // If URL parsing fails, return original
    return url
  }
}

/**
 * Normalizes URL according to the application's trailing slash policy
 * @param url - The URL to normalize
 * @param addTrailingSlash - Whether to add (true) or remove (false) trailing slash
 * @returns The normalized URL
 */
export function normalizeUrl(url: string, addTrailingSlash: boolean = true): string {
  return addTrailingSlash ? ensureTrailingSlash(url) : removeTrailingSlash(url)
}

/**
 * Checks if a URL has a trailing slash
 * @param url - The URL to check
 * @returns True if URL has trailing slash, false otherwise
 */
export function hasTrailingSlash(url: string): boolean {
  try {
    const urlObj = new URL(url, 'http://localhost')
    return urlObj.pathname.endsWith('/')
  } catch (error) {
    return url.endsWith('/')
  }
}

/**
 * Builds a URL with consistent trailing slash handling
 * @param base - Base URL or path
 * @param segments - Path segments to append
 * @param addTrailingSlash - Whether to ensure trailing slash
 * @returns The built URL
 */
export function buildUrl(base: string, segments: string[] = [], addTrailingSlash: boolean = true): string {
  let url = base
  
  // Add segments
  for (const segment of segments) {
    const cleanSegment = segment.replace(/^\/+|\/+$/g, '') // Remove leading/trailing slashes
    if (cleanSegment) {
      url = url.replace(/\/+$/, '') + '/' + cleanSegment
    }
  }
  
  return normalizeUrl(url, addTrailingSlash)
}

/**
 * Validates if a URL is properly formatted according to trailing slash policy
 * @param url - The URL to validate
 * @param requireTrailingSlash - Whether trailing slash is required
 * @returns True if URL follows the policy, false otherwise
 */
export function isValidUrl(url: string, requireTrailingSlash: boolean = true): boolean {
  try {
    const urlObj = new URL(url, 'http://localhost')
    
    // Root path is always valid
    if (urlObj.pathname === '/') {
      return true
    }
    
    // Files don't need trailing slash
    if (/\.[a-zA-Z0-9]+$/.test(urlObj.pathname)) {
      return !urlObj.pathname.endsWith('/')
    }
    
    // Check trailing slash requirement
    const hasSlash = urlObj.pathname.endsWith('/')
    return requireTrailingSlash ? hasSlash : !hasSlash
  } catch (error) {
    return false
  }
}

/**
 * Gets the canonical URL for a given path
 * @param path - The path to canonicalize
 * @param baseUrl - The base URL (optional)
 * @returns The canonical URL
 */
export function getCanonicalUrl(path: string, baseUrl?: string): string {
  const normalizedPath = ensureTrailingSlash(path)
  
  if (baseUrl) {
    return new URL(normalizedPath, baseUrl).toString()
  }
  
  return normalizedPath
}