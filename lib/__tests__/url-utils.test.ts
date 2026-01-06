/**
 * Tests for URL utility functions
 */

import {
  ensureTrailingSlash,
  removeTrailingSlash,
  normalizeUrl,
  hasTrailingSlash,
  buildUrl,
  isValidUrl,
  getCanonicalUrl
} from '../url-utils'

describe('URL Utils', () => {
  describe('ensureTrailingSlash', () => {
    test('adds trailing slash to paths without one', () => {
      expect(ensureTrailingSlash('/about')).toBe('/about/')
      expect(ensureTrailingSlash('/dashboard/jobs')).toBe('/dashboard/jobs/')
    })

    test('preserves trailing slash when already present', () => {
      expect(ensureTrailingSlash('/about/')).toBe('/about/')
      expect(ensureTrailingSlash('/dashboard/jobs/')).toBe('/dashboard/jobs/')
    })

    test('does not add trailing slash to root path', () => {
      expect(ensureTrailingSlash('/')).toBe('/')
    })

    test('does not add trailing slash to files', () => {
      expect(ensureTrailingSlash('/sitemap.xml')).toBe('/sitemap.xml')
      expect(ensureTrailingSlash('/robots.txt')).toBe('/robots.txt')
      expect(ensureTrailingSlash('/image.jpg')).toBe('/image.jpg')
    })

    test('preserves query parameters', () => {
      expect(ensureTrailingSlash('/search?q=test')).toBe('/search?q=test')
      expect(ensureTrailingSlash('/api/jobs?page=1')).toBe('/api/jobs?page=1')
    })

    test('handles full URLs', () => {
      expect(ensureTrailingSlash('https://example.com/about')).toBe('https://example.com/about/')
      expect(ensureTrailingSlash('https://example.com/about/')).toBe('https://example.com/about/')
    })
  })

  describe('removeTrailingSlash', () => {
    test('removes trailing slash from paths', () => {
      expect(removeTrailingSlash('/about/')).toBe('/about')
      expect(removeTrailingSlash('/dashboard/jobs/')).toBe('/dashboard/jobs')
    })

    test('preserves paths without trailing slash', () => {
      expect(removeTrailingSlash('/about')).toBe('/about')
      expect(removeTrailingSlash('/dashboard/jobs')).toBe('/dashboard/jobs')
    })

    test('does not remove trailing slash from root path', () => {
      expect(removeTrailingSlash('/')).toBe('/')
    })

    test('handles full URLs', () => {
      expect(removeTrailingSlash('https://example.com/about/')).toBe('https://example.com/about')
      expect(removeTrailingSlash('https://example.com/about')).toBe('https://example.com/about')
    })
  })

  describe('normalizeUrl', () => {
    test('adds trailing slash by default', () => {
      expect(normalizeUrl('/about')).toBe('/about/')
      expect(normalizeUrl('/about/', true)).toBe('/about/')
    })

    test('removes trailing slash when specified', () => {
      expect(normalizeUrl('/about/', false)).toBe('/about')
      expect(normalizeUrl('/about', false)).toBe('/about')
    })
  })

  describe('hasTrailingSlash', () => {
    test('detects trailing slash presence', () => {
      expect(hasTrailingSlash('/about/')).toBe(true)
      expect(hasTrailingSlash('/about')).toBe(false)
      expect(hasTrailingSlash('/')).toBe(true)
    })

    test('works with full URLs', () => {
      expect(hasTrailingSlash('https://example.com/about/')).toBe(true)
      expect(hasTrailingSlash('https://example.com/about')).toBe(false)
    })
  })

  describe('buildUrl', () => {
    test('builds URL from base and segments', () => {
      expect(buildUrl('/api', ['v1', 'jobs'])).toBe('/api/v1/jobs/')
      expect(buildUrl('/dashboard', ['settings', 'profile'])).toBe('/dashboard/settings/profile/')
    })

    test('handles empty segments', () => {
      expect(buildUrl('/api', [])).toBe('/api/')
      expect(buildUrl('/api', ['', 'v1', ''])).toBe('/api/v1/')
    })

    test('cleans up extra slashes', () => {
      expect(buildUrl('/api/', ['/v1/', '/jobs/'])).toBe('/api/v1/jobs/')
    })

    test('respects trailing slash preference', () => {
      expect(buildUrl('/api', ['v1', 'jobs'], false)).toBe('/api/v1/jobs')
      expect(buildUrl('/api', ['v1', 'jobs'], true)).toBe('/api/v1/jobs/')
    })
  })

  describe('isValidUrl', () => {
    test('validates URLs with trailing slash requirement', () => {
      expect(isValidUrl('/about/', true)).toBe(true)
      expect(isValidUrl('/about', true)).toBe(false)
      expect(isValidUrl('/', true)).toBe(true) // Root is always valid
    })

    test('validates URLs without trailing slash requirement', () => {
      expect(isValidUrl('/about', false)).toBe(true)
      expect(isValidUrl('/about/', false)).toBe(false)
      expect(isValidUrl('/', false)).toBe(true) // Root is always valid
    })

    test('handles files correctly', () => {
      expect(isValidUrl('/sitemap.xml', true)).toBe(true) // Files don't need trailing slash
      expect(isValidUrl('/sitemap.xml/', true)).toBe(false) // Files shouldn't have trailing slash
    })
  })

  describe('getCanonicalUrl', () => {
    test('returns canonical URL with trailing slash', () => {
      expect(getCanonicalUrl('/about')).toBe('/about/')
      expect(getCanonicalUrl('/about/')).toBe('/about/')
    })

    test('builds full canonical URL with base', () => {
      expect(getCanonicalUrl('/about', 'https://example.com')).toBe('https://example.com/about/')
      expect(getCanonicalUrl('/about/', 'https://example.com')).toBe('https://example.com/about/')
    })
  })
})