module.exports = {
  apps: [
    {
      name: 'tugasincms',
      script: 'npm',
      args: 'start',
      cwd: '/root/tugasincms-neon',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },

      // Restart settings
      max_restarts: 10,
      restart_delay: 4000,
      max_memory_restart: '1G',

      // Logging
      log_file: '/root/.pm2/logs/tugasincms.log',
      out_file: '/root/.pm2/logs/tugasincms-out.log',
      error_file: '/root/.pm2/logs/tugasincms-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Health monitoring
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
    },
    {
      name: 'tugasincms-sitemap-cron',
      script: 'npm',
      args: 'run sitemap:cron',
      cwd: '/root/tugasincms-neon',
      cron_restart: '0 */6 * * *', // Every 6 hours
      autorestart: false,
      watch: false,
      env: {
        NODE_ENV: 'production',
      },

      // Logging
      log_file: '/root/.pm2/logs/tugasincms-sitemap.log',
      out_file: '/root/.pm2/logs/tugasincms-sitemap-out.log',
      error_file: '/root/.pm2/logs/tugasincms-sitemap-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
