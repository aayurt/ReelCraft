module.exports = {
  apps: [
    {
      name: 'reely',
      script: 'npm', // 🟢 Use npm as the runner
      args: 'start', // 🟢 Pass 'start' as the script argument
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
