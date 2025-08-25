// PM2 process configuration for running a TypeScript server via ts-node.
// Adjust ENTRYPOINT if your entry file differs (default server.ts).
module.exports = {
  apps: [
    {
      name: process.env.PM2_APP_NAME || "job-seeker-dev",
      cwd: process.env.APP_DIR || __dirname,
      script: "npx",
      args: `ts-node ${process.env.ENTRYPOINT || "server.ts"}`,
      interpreter: "none",
      env: {
        NODE_ENV: process.env.NODE_ENV || "production",
        PORT: process.env.PORT || "443",
        // Any other ENV vars will be injected from .env via restart.sh + --update-env
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      watch: false,
      time: true,
      error_file: "logs/err.log",
      out_file: "logs/out.log",
      merge_logs: true,
    },
  ],
};