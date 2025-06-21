const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 2355;
const STORAGE_FILE = './storage.json';

// 加密配置
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

// 工具函数
function initStorage() {
    try {
        if (!fs.existsSync(STORAGE_FILE)) {
            fs.writeFileSync(STORAGE_FILE, '{}', 'utf8');
        }
    } catch (error) {
        console.error('初始化存储文件失败:', error);
    }
}

function readStorage() {
    try {
        if (!fs.existsSync(STORAGE_FILE)) {
            return {};
        }
        const data = fs.readFileSync(STORAGE_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('读取存储数据失败:', error);
        return {};
    }
}

function writeStorage(data) {
    try {
        fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error('写入存储数据失败:', error);
        throw new Error('保存数据失败');
    }
}

function generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function generateUniqueCode() {
    const storage = readStorage();
    let code;
    let attempts = 0;
    do {
        code = generateCode();
        attempts++;
        if (attempts > 100) {
            throw new Error('无法生成唯一代码');
        }
    } while (storage[code]);
    return code;
}

function encryptText(text, key) {
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
        console.error('加密失败:', error);
        throw new Error('加密失败');
    }
}

function decryptText(encryptedData, key) {
    try {
        const parts = encryptedData.split(':');
        if (parts.length !== 2) {
            throw new Error('加密数据格式错误');
        }
        
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedText = parts[1];
        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        console.error('解密失败:', error);
        return null;
    }
}

function cleanExpiredData() {
    try {
        const storage = readStorage();
        const now = Date.now();
        let hasChanges = false;

        for (const code in storage) {
            if (now - storage[code].timestamp > 24 * 60 * 60 * 1000) {
                delete storage[code];
                hasChanges = true;
            }
        }

        if (hasChanges) {
            writeStorage(storage);
            console.log('已清理过期数据');
        }
    } catch (error) {
        console.error('清理过期数据失败:', error);
    }
}

// 初始化
initStorage();
setInterval(cleanExpiredData, 60 * 60 * 1000);

// 重要：中间件必须按正确顺序配置
console.log('正在配置中间件...');

// 1. 请求日志（最先执行）
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.originalUrl}`);
    next();
});

// 2. JSON解析中间件
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 3. CORS中间件
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// 4. API路由（必须在静态文件之前）
console.log('正在配置API路由...');

app.get('/api/stats', (req, res) => {
    console.log('✅ API /api/stats 被调用');
    
    // 确保返回JSON格式
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    
    try {
        const storage = readStorage();
        const count = Object.keys(storage).length;
        
        const response = { 
            success: true, 
            activeTexts: count 
        };
        
        console.log('📊 统计响应:', response);
        res.status(200).json(response);
        
    } catch (error) {
        console.error('❌ 获取统计信息失败:', error);
        const errorResponse = { 
            success: false, 
            error: '获取统计信息失败' 
        };
        console.log('📊 统计错误响应:', errorResponse);
        res.status(500).json(errorResponse);
    }
});

app.post('/api/send', (req, res) => {
    console.log('✅ API /api/send 被调用');
    
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    
    try {
        const { text } = req.body;
        
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: '文本不能为空' 
            });
        }

        if (text.length > 10000) {
            return res.status(400).json({ 
                success: false, 
                error: '文本长度不能超过10000字符' 
            });
        }

        const code = generateUniqueCode();
        const key = crypto.randomBytes(32).toString('hex');
        const encryptedText = encryptText(text, key);
        
        const storage = readStorage();
        storage[code] = {
            encryptedText,
            key,
            timestamp: Date.now()
        };
        
        writeStorage(storage);
        
        console.log(`✅ 文本已保存，取文本码: ${code}`);
        
        res.status(200).json({ 
            success: true, 
            code,
            message: '文本已加密保存，取文本码：' + code
        });
        
    } catch (error) {
        console.error('❌ 发送错误:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || '服务器内部错误' 
        });
    }
});

app.post('/api/receive', (req, res) => {
    console.log('✅ API /api/receive 被调用');
    
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    
    try {
        const { code } = req.body;
        
        if (!code || typeof code !== 'string' || code.trim().length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: '取文本码不能为空' 
            });
        }

        const storage = readStorage();
        const upperCode = code.trim().toUpperCase();
        
        if (!storage[upperCode]) {
            return res.status(404).json({ 
                success: false, 
                error: '取文本码无效或已过期' 
            });
        }

        const { encryptedText, key } = storage[upperCode];
        const decryptedText = decryptText(encryptedText, key);
        
        if (decryptedText === null) {
            return res.status(500).json({ 
                success: false, 
                error: '解密失败，数据可能已损坏' 
            });
        }

        delete storage[upperCode];
        writeStorage(storage);
        
        console.log(`✅ 文本已获取，取文本码 ${upperCode} 已失效`);
        
        res.status(200).json({ 
            success: true, 
            text: decryptedText,
            message: '文本已获取，此取文本码已失效'
        });
        
    } catch (error) {
        console.error('❌ 接收错误:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || '服务器内部错误' 
        });
    }
});

// API路由结束标记
console.log('API路由配置完成');

// 5. 专门的API 404处理（在静态文件之前）
app.use('/api/*', (req, res) => {
    console.log('❌ API路由未找到:', req.originalUrl);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(404).json({ 
        success: false, 
        error: 'API接口不存在：' + req.originalUrl
    });
});

// 6. 静态文件服务（在API路由之后）
console.log('正在配置静态文件服务...');
app.use(express.static('public', {
    index: false, // 禁用自动index.html
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

// 7. 页面路由
app.get('/', (req, res) => {
    console.log('📄 访问首页');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/send', (req, res) => {
    console.log('📄 访问发送页面');
    res.sendFile(path.join(__dirname, 'public', 'send.html'));
});

app.get('/receive', (req, res) => {
    console.log('📄 访问接收页面');
    res.sendFile(path.join(__dirname, 'public', 'receive.html'));
});

// 8. 通用404处理
app.use('*', (req, res) => {
    console.log('❌ 页面未找到:', req.originalUrl);
    res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 9. 错误处理中间件（最后）
app.use((err, req, res, next) => {
    console.error('❌ 服务器错误:', err);
    
    if (req.originalUrl.startsWith('/api/')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.status(500).json({ 
            success: false, 
            error: '服务器内部错误' 
        });
    } else {
        res.status(500).send('服务器内部错误');
    }
});

// 启动服务器
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(60));
    console.log('🚀 加密文本分享服务启动成功！');
    console.log(`📡 本地访问: http://localhost:${PORT}`);
    console.log(`📡 网络访问: http://0.0.0.0:${PORT}`);
    console.log(`🔒 端口: ${PORT}/tcp`);
    console.log(`⏰ 启动时间: ${new Date().toLocaleString()}`);
    console.log('📁 静态文件目录: ./public');
    console.log('💾 存储文件: ./storage.json');
    console.log('🛠️  API接口列表:');
    console.log('   GET  /api/stats   - 获取统计信息 ✅');
    console.log('   POST /api/send    - 发送文本 ✅');
    console.log('   POST /api/receive - 接收文本 ✅');
    console.log('📄 页面路由:');
    console.log('   GET  /           - 首页');
    console.log('   GET  /send       - 发送页面');
    console.log('   GET  /receive    - 接收页面');
    console.log('='.repeat(60));
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n📴 正在关闭服务器...');
    server.close(() => {
        cleanExpiredData();
        console.log('✅ 服务器已安全关闭');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n📴 正在关闭服务器...');
    server.close(() => {
        cleanExpiredData();
        console.log('✅ 服务器已安全关闭');
        process.exit(0);
    });
});