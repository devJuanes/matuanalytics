module.exports = {
  apps: [
    {
      name: 'matuanalytics-api',
      cwd: '/root/apps/matuanalytics/server',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: '/var/log/pm2/matuanalytics-api-error.log',
      out_file: '/var/log/pm2/matuanalytics-api-out.log',
      merge_logs: true,
      time: true,
    },
  ],
}
