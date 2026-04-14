module.exports = {
  apps: [
    {
      name: 'reely',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/ReelCraft',
      instances: 'max',
      exec_mode: 'cluster',
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=800',
      env: {
        NODE_ENV: 'production',
        PORT: 3010,
      },
    },
  ],
}
