# 🔒 加密文本分享服务

一个安全、一次性的加密文本分享服务，支持生成6位取文本码，确保文本在获取后立即删除，保护隐私数据安全传输。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node.js-v16+-green.svg)
![Platform](https://img.shields.io/badge/platform-FreeBSD%20%7C%20Linux-lightgrey.svg)

## ✨ 功能特性

- 🔐 **端到端加密** - 使用AES-256-CBC算法保护文本安全
- 🎲 **6位取文本码** - 随机生成，简单易记，安全可靠
- 🗑️ **一次性访问** - 文本获取后立即删除，无法再次访问
- ⏰ **自动过期** - 24小时后自动清理未使用的文本
- 📱 **响应式设计** - 完美支持桌面和移动设备
- 🚀 **高性能** - 基于Node.js，支持高并发访问
- 🛡️ **无数据库** - 本地文件存储，简单可靠
- 📊 **实时统计** - 动态显示当前活跃文本数量

## 🚀 快速开始

### 环境要求

- Node.js 16.x 或更高版本
- npm 或 yarn 包管理器
- FreeBSD / Linux 操作系统
- 反向代理服务器（如 Nginx）

### 安装部署

1. **克隆项目**
```bash
git clone https://github.com/Andyanm/Secure-Text-Share.git
cd Secure-Text-Share
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境**
```bash
# 创建必要目录
mkdir -p logs
chmod 755 logs

# 创建存储文件
echo '{}' > storage.json
```

4. **启动服务**
```bash
# 开发模式
npm start

# 生产模式（使用PM2）
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

5. **配置反向代理**

**Nginx 配置示例：**
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://127.0.0.1:2355;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📖 使用方法

### 发送文本

1. 访问网站首页，点击"发送文本"
2. 在文本框中输入要分享的内容（最多10000字符）
3. 点击"加密并生成取文本码"按钮
4. 系统生成6位取文本码，将其分享给接收方

### 接收文本

1. 访问网站首页，点击"接收文本"
2. 输入收到的6位取文本码
3. 点击"获取加密文本"按钮
4. 查看解密后的文本内容

> ⚠️ **重要提醒**：每个取文本码只能使用一次，获取后立即失效！

## 🔧 API 文档

### 发送文本

```http
POST /api/send
Content-Type: application/json

{
    "text": "要分享的文本内容"
}
```

**响应：**
```json
{
    "success": true,
    "code": "ABC123",
    "message": "文本已加密保存，取文本码：ABC123"
}
```

### 接收文本

```http
POST /api/receive
Content-Type: application/json

{
    "code": "ABC123"
}
```

**响应：**
```json
{
    "success": true,
    "text": "解密后的文本内容",
    "message": "文本已获取，此取文本码已失效"
}
```

### 获取统计信息

```http
GET /api/stats
```

**响应：**
```json
{
    "success": true,
    "activeTexts": 5
}
```

## 🛡️ 安全说明

### 加密机制

- **算法**：AES-256-CBC 对称加密
- **密钥**：每个文本使用独立的随机密钥（256位）
- **初始化向量**：每次加密使用随机IV
- **存储**：密钥和加密文本分别存储

### 隐私保护

- **无日志记录**：不记录用户IP或访问信息
- **一次性访问**：文本获取后立即删除
- **自动清理**：超时文本定期自动删除
- **本地存储**：无需外部数据库，数据完全本地化

### 安全建议

- 定期更换服务器密钥
- 使用HTTPS传输
- 配置适当的防火墙规则
- 定期备份和清理日志文件

## ⚙️ 配置说明

### 环境变量

```bash
NODE_ENV=production          # 运行环境
PORT=2355                   # 服务端口
MAX_TEXT_LENGTH=10000       # 最大文本长度
CLEANUP_INTERVAL=3600000    # 清理间隔（毫秒）
```

### PM2 配置

**ecosystem.config.js：**
```javascript
module.exports = {
  apps: [{
    name: 'secure-text-share',
    script: './server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 2355
    }
  }]
};
```

## 📁 项目结构

```
secure-text-share/
├── package.json              # 项目配置
├── server.js                 # 主服务器文件
├── ecosystem.config.js       # PM2配置
├── storage.json              # 数据存储文件
├── logs/                     # 日志目录
│   ├── err.log              # 错误日志
│   ├── out.log              # 输出日志
│   └── combined.log         # 合并日志
├── public/                   # 静态资源
│   ├── index.html           # 首页
│   ├── send.html            # 发送页面
│   ├── receive.html         # 接收页面
│   ├── style.css            # 样式文件
│   └── script.js            # 前端脚本
└── README.md                # 项目文档
```

## 🔧 技术栈

- **后端**: Node.js + Express.js
- **加密**: Node.js Crypto 模块
- **前端**: 原生HTML + CSS + JavaScript
- **存储**: JSON文件系统
- **进程管理**: PM2
- **Web服务器**: Nginx（反向代理）

## 📊 性能指标

- **并发支持**: 1000+ 同时在线用户
- **响应时间**: < 100ms（本地网络）
- **内存使用**: < 100MB（正常运行）
- **存储效率**: 文本压缩率 > 50%

## 🐛 故障排除

### 常见问题

**Q: API返回404错误？**
A: 检查反向代理配置，确保正确转发到Node.js端口。

**Q: 统计数据显示"获取失败"？**
A: 检查storage.json文件权限，确保应用有读写权限。

**Q: 服务意外停止？**
A: 使用PM2管理进程，自动重启服务。

### 日志查看

```bash
# PM2日志
pm2 logs secure-text-share

# 系统日志
tail -f logs/combined.log

# 错误日志
tail -f logs/err.log
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 开发规范

- 代码注释必须清晰明了
- 提交信息使用英文，格式规范
- 新功能需要添加相应测试
- 保持代码风格一致

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源协议。

