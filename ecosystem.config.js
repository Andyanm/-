module.exports = {
  apps: [{
    name: 'secure-text-share',           // 应用名称
    script: './server.js',               // 启动文件
    instances: 1,                        // 实例数量
    autorestart: true,                   // 自动重启
    watch: false,                        // 不监听文件变化（生产环境）
    max_memory_restart: '1G',            // 内存超过1G自动重启
    env: {                               // 环境变量
      NODE_ENV: 'production',
      PORT: 3355
    },
    error_file: './logs/err.log',        // 错误日志
    out_file: './logs/out.log',          // 输出日志
    log_file: './logs/combined.log',     // 合并日志
    time: true,                          // 日志时间戳
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};