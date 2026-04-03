module.exports = {
  apps: [
    {
      name: "lenda-auth",
      cwd: "/home/ubuntu/lenda/services/auth-service",
      script: "dist/index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "400M",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
    },
    {
      name: "lenda-booking",
      cwd: "/home/ubuntu/lenda/services/booking-service",
      script: "dist/index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "400M",
      env: {
        NODE_ENV: "production",
        PORT: 3002,
      },
    },
  ],
};
