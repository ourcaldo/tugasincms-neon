import { generateAllSitemaps } from '../lib/sitemap'

const INTERVAL = 60 * 60 * 1000 // 60 minutes in milliseconds

async function regenerateSitemaps() {
  try {
    console.log(`[${new Date().toISOString()}] Regenerating sitemaps...`)
    await generateAllSitemaps()
    console.log(`[${new Date().toISOString()}] Sitemaps regenerated successfully`)
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error regenerating sitemaps:`, error)
  }
}

async function startCronJob() {
  console.log(`[${new Date().toISOString()}] Sitemap cron job started - regenerating every 60 minutes`)
  
  await regenerateSitemaps()
  
  setInterval(async () => {
    await regenerateSitemaps()
  }, INTERVAL)
}

startCronJob()
