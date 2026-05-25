// PM2 ecosystem for E-Press backend on the production server.
//   pm2 startOrReload deploy/ecosystem.config.js --env production
//   pm2 logs epress-backend
module.exports = {
    apps: [
        {
            name:       'epress-backend',
            cwd:        '/var/www/epress/backend',
            script:     'server.js',
            instances:  1,                  // single instance; the codebase has in-memory sockets that don't cluster cleanly today
            exec_mode:  'fork',
            autorestart: true,
            watch:      false,              // do not let pm2 hot-reload on file changes in prod
            max_memory_restart: '512M',
            min_uptime: '20s',              // anything that crashes inside 20s is treated as failed
            max_restarts: 10,
            restart_delay: 4000,
            kill_timeout: 5000,
            env_production: {
                NODE_ENV: 'production',
                // Per-host secrets (DB_PASSWORD, JWT_SECRET, etc.) come from
                // /var/www/epress/backend/.env which dotenv loads at boot.
            },
            error_file: '/var/log/pm2/epress-backend.err.log',
            out_file:   '/var/log/pm2/epress-backend.out.log',
            time:       true,               // prefix log lines with ISO timestamp
        },
    ],
};
