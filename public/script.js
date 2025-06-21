// 工具函数
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    // 移除现有错误消息
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // 添加新错误消息
    const form = document.querySelector('.form-container');
    if (form) {
        form.appendChild(errorDiv);
        
        // 5秒后自动移除
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }
}

function setLoading(button, loading) {
    if (loading) {
        button.disabled = true;
        button.innerHTML = '<span class="loading"></span> 处理中...';
    } else {
        button.disabled = false;
        // 恢复原始文本根据按钮ID
        if (button.id === 'sendBtn') {
            button.innerHTML = '🔒 加密并生成取文本码';
        } else if (button.id === 'receiveBtn') {
            button.innerHTML = '🔓 获取加密文本';
        }
    }
}

async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // 备用方法
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textArea);
            return success;
        }
    } catch (err) {
        console.error('复制失败:', err);
        return false;
    }
}

function showCopySuccess(button) {
    const originalText = button.innerHTML;
    button.innerHTML = '✅ 已复制';
    button.style.background = '#28a745';
    
    setTimeout(() => {
        button.innerHTML = originalText;
        button.style.background = '';
    }, 2000);
}

// 处理API响应
async function handleApiResponse(response) {
    let data;
    try {
        const text = await response.text();
        if (!text) {
            throw new Error('服务器返回空响应');
        }
        data = JSON.parse(text);
    } catch (error) {
        console.error('解析响应失败:', error);
        throw new Error('服务器响应格式错误');
    }
    
    if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return data;
}

// 首页功能
if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
    // 加载统计信息
    async function loadStats() {
        try {
            const response = await fetch('/api/stats');
            const data = await handleApiResponse(response);
            
            if (data.success) {
                document.getElementById('activeCount').textContent = data.activeTexts;
            } else {
                document.getElementById('activeCount').textContent = '获取失败';
            }
        } catch (error) {
            console.error('加载统计失败:', error);
            document.getElementById('activeCount').textContent = '获取失败';
        }
    }
    
    // 页面加载时获取统计信息
    loadStats();
    
    // 每30秒更新一次统计信息
    setInterval(loadStats, 30000);
}

// 发送页面功能
if (window.location.pathname === '/send' || window.location.pathname === '/send.html') {
    const textInput = document.getElementById('textInput');
    const charCount = document.getElementById('charCount');
    const sendForm = document.getElementById('sendForm');
    const sendBtn = document.getElementById('sendBtn');
    const resultDiv = document.getElementById('result');
    
    // 字符计数
    textInput.addEventListener('input', function() {
        const count = this.value.length;
        charCount.textContent = count;
        
        if (count > 10000) {
            charCount.style.color = '#dc3545';
        } else if (count > 8000) {
            charCount.style.color = '#ffc107';
        } else {
            charCount.style.color = '#6c757d';
        }
    });
    
    // 发送表单处理
    sendForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const text = textInput.value.trim();
        if (!text) {
            showError('请输入要分享的文本内容');
            return;
        }
        
        if (text.length > 10000) {
            showError('文本长度不能超过10000字符');
            return;
        }
        
        setLoading(sendBtn, true);
        
        try {
            const response = await fetch('/api/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text })
            });
            
            const data = await handleApiResponse(response);
            
            if (data.success) {
                // 显示结果
                document.getElementById('generatedCode').textContent = data.code;
                sendForm.style.display = 'none';
                resultDiv.style.display = 'block';
                
                // 复制按钮功能
                document.getElementById('copyCodeBtn').addEventListener('click', async function() {
                    const success = await copyToClipboard(data.code);
                    if (success) {
                        showCopySuccess(this);
                    } else {
                        showError('复制失败，请手动复制');
                    }
                });
                
                // 发送另一个文本按钮
                document.getElementById('sendAnotherBtn').addEventListener('click', function() {
                    sendForm.style.display = 'block';
                    resultDiv.style.display = 'none';
                    textInput.value = '';
                    charCount.textContent = '0';
                    charCount.style.color = '#6c757d';
                });
                
            } else {
                showError(data.error || '发送失败，请重试');
            }
        } catch (error) {
            console.error('发送错误:', error);
            showError(error.message || '网络错误，请检查连接后重试');
        } finally {
            setLoading(sendBtn, false);
        }
    });
}

// 接收页面功能
if (window.location.pathname === '/receive' || window.location.pathname === '/receive.html') {
    const codeInput = document.getElementById('codeInput');
    const receiveForm = document.getElementById('receiveForm');
    const receiveBtn = document.getElementById('receiveBtn');
    const resultDiv = document.getElementById('result');
    
    // 输入框格式化
    codeInput.addEventListener('input', function() {
        // 转换为大写并移除非字母数字字符
        this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });
    
    // 接收表单处理
    receiveForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const code = codeInput.value.trim();
        if (!code) {
            showError('请输入6位取文本码');
            return;
        }
        
        if (code.length !== 6) {
            showError('取文本码必须是6位字符');
            return;
        }
        
        setLoading(receiveBtn, true);
        
        try {
            const response = await fetch('/api/receive', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code })
            });
            
            const data = await handleApiResponse(response);
            
            if (data.success) {
                // 显示结果
                document.getElementById('decryptedText').textContent = data.text;
                receiveForm.style.display = 'none';
                resultDiv.style.display = 'block';
                
                // 复制按钮功能
                document.getElementById('copyTextBtn').addEventListener('click', async function() {
                    const success = await copyToClipboard(data.text);
                    if (success) {
                        showCopySuccess(this);
                    } else {
                        showError('复制失败，请手动复制');
                    }
                });
                
                // 接收另一个文本按钮
                document.getElementById('receiveAnotherBtn').addEventListener('click', function() {
                    receiveForm.style.display = 'block';
                    resultDiv.style.display = 'none';
                    codeInput.value = '';
                });
                
            } else {
                showError(data.error || '获取失败，请检查取文本码是否正确');
            }
        } catch (error) {
            console.error('接收错误:', error);
            showError(error.message || '网络错误，请检查连接后重试');
        } finally {
            setLoading(receiveBtn, false);
        }
    });
}

// 全局错误处理
window.addEventListener('error', function(e) {
    console.error('JavaScript错误:', e.error);
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('未处理的Promise拒绝:', e.reason);
});