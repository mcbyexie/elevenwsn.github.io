// 配置
const JSON_FOLDER = '/notice/json-files/';
const NOTICES_CONTAINER = document.getElementById('notices-container');
const CURRENT_DATE_ELEMENT = document.getElementById('current-date');

// ================ 缺少的函数 ================

// 1. 获取公告文件列表函数（缺少）
async function getNoticeFiles() {
    try {
        const response = await fetch('/notice/json-files/index.json');
        if (!response.ok) {
            throw new Error('无法获取公告列表');
        }
        const fileList = await response.json();
        return fileList.files;
    } catch (error) {
        console.error('获取文件列表失败:', error);
        return [];
    }
}

// 2. 创建公告卡片函数（缺少）
function createNoticeCard(noticeData) {
    const card = document.createElement('div');
    card.className = 'notice-card';
    card.dataset.type = noticeData.type;
    
    // 设置边框颜色
    card.style.borderLeftColor = noticeData.borderColor || '#3498db';
    
    // 创建图标
    const icon = noticeData.icon || 'fa-bullhorn';
    
    // 构建卡片内容
    card.innerHTML = `
        <div class="notice-header">
            <h3 class="notice-title">
                <i class="fas ${icon}"></i>
                ${noticeData.title}
            </h3>
            <div style="display: flex; gap: 10px;">
                <span class="notice-date">${noticeData.date}</span>
                <span class="notice-type type-${noticeData.type}">${noticeData.type}</span>
            </div>
        </div>
        <div class="notice-content">
            ${noticeData.content.replace(/\n/g, '<br>')}
        </div>
    `;
    
    // 处理copyableItems（多个可复制文本）
    if (noticeData.copyableItems && Array.isArray(noticeData.copyableItems) && noticeData.copyableItems.length > 0) {
        noticeData.copyableItems.forEach(item => {
            const copyableDiv = document.createElement('div');
            copyableDiv.className = 'copyable-text';
            
            const iconHtml = item.icon ? `<i class="fas ${item.icon}" style="margin-right: 8px;"></i>` : '';
            
            copyableDiv.innerHTML = `
                <div style="flex: 1;">
                    ${item.label ? `<div style="font-size: 0.9rem; color: #7f8c8d; margin-bottom: 5px;">${iconHtml}${item.label}</div>` : ''}
                    <div style="font-family: 'Courier New', monospace; font-size: 1.1rem; font-weight: 600;">${item.text}</div>
                </div>
                <i class="fas fa-copy copy-icon" title="点击复制"></i>
            `;
            
            copyableDiv.addEventListener('click', () => {
                copyToClipboard(item.text);
                
                const icon = copyableDiv.querySelector('.copy-icon');
                const originalIcon = icon.className;
                icon.className = 'fas fa-check copy-icon';
                icon.style.color = '#2ecc71';
                
                setTimeout(() => {
                    icon.className = originalIcon;
                    icon.style.color = '';
                }, 2000);
            });
            
            card.appendChild(copyableDiv);
        });
    }
    // 向后兼容：处理旧的copyableText字段
    else if (noticeData.copyableText && noticeData.copyableText.trim()) {
        const copyableDiv = document.createElement('div');
        copyableDiv.className = 'copyable-text';
        copyableDiv.innerHTML = `
            ${noticeData.copyableText}
            <i class="fas fa-copy copy-icon" title="点击复制"></i>
        `;
        
        copyableDiv.addEventListener('click', () => {
            copyToClipboard(noticeData.copyableText);
            
            const icon = copyableDiv.querySelector('.copy-icon');
            const originalIcon = icon.className;
            icon.className = 'fas fa-check copy-icon';
            icon.style.color = '#2ecc71';
            
            setTimeout(() => {
                icon.className = originalIcon;
                icon.style.color = '';
            }, 2000);
        });
        
        card.appendChild(copyableDiv);
    }
    
    // 添加链接（如果有）
    if (noticeData.linkText && noticeData.linkUrl) {
        const link = document.createElement('a');
        link.className = 'notice-link';
        link.href = noticeData.linkUrl;
        link.innerHTML = `
            <i class="fas fa-external-link-alt"></i>
            ${noticeData.linkText}
        `;
        card.appendChild(link);
    }
    
    return card;
}

// 3. 复制到剪贴板函数（缺少）
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        console.log('文本已复制到剪贴板');
    }).catch(err => {
        console.error('复制失败:', err);
        // 降级方案
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    });
}

// 4. 初始化筛选功能函数（缺少）
function initFilter() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const noticeCards = document.querySelectorAll('.notice-card');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // 更新按钮状态
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            const filter = button.dataset.filter;
            
            // 筛选公告
            noticeCards.forEach(card => {
                if (filter === 'all' || card.dataset.type === filter) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });
}

// 5. 更新当前日期函数（缺少）
function updateCurrentDate() {
    const now = new Date();
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    };
    const dateString = now.toLocaleDateString('zh-CN', options);
    CURRENT_DATE_ELEMENT.textContent = dateString;
}

// ================ 您已提供的函数 ================

// getNoticeContent函数（您已提供）
async function getNoticeContent(filename) {
    // 添加缓存避免重复加载
    if (window.noticeCache && window.noticeCache[filename]) {
        console.log(`📦 从缓存读取: ${filename}`);
        return window.noticeCache[filename];
    }

    try {
        const response = await fetch(`${JSON_FOLDER}${filename}?t=${Date.now()}`);

        if (!response.ok) {
            console.error(`文件 ${filename} 请求失败: ${response.status} ${response.statusText}`);
            return null;
        }

        const text = await response.text();

        // 检查文件是否为空
        if (!text.trim()) {
            console.error(`文件 ${filename} 为空`);
            return null;
        }

        // 解析前清理可能的BOM字符
        const cleanText = text.replace(/^\uFEFF/, '');

        let data;
        try {
            data = JSON.parse(cleanText);
        } catch (parseError) {
            console.error(`文件 ${filename} JSON解析失败:`, parseError);
            console.error('问题内容:', text.substring(0, 200));
            return null;
        }

        // 验证必需字段
        if (!data.title) {
            console.error(`文件 ${filename} 缺少title字段`);
            return null;
        }
        if (!data.date) {
            console.error(`文件 ${filename} 缺少date字段`);
            return null;
        }
        if (!data.content) {
            console.error(`文件 ${filename} 缺少content字段`);
            return null;
        }

        // 缓存结果
        if (!window.noticeCache) window.noticeCache = {};
        window.noticeCache[filename] = data;

        return data;

    } catch (error) {
        console.error(`加载文件 ${filename} 失败:`, error);
        return null;
    }
}

// loadNotices函数（您已提供）
async function loadNotices() {
    NOTICES_CONTAINER.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>正在加载公告...</p>
        </div>
    `;

    try {
        const files = await getNoticeFiles();
        console.log('📋 文件列表:', files);

        if (!files || files.length === 0) {
            NOTICES_CONTAINER.innerHTML = `
                <div class="no-notices">
                    <i class="fas fa-inbox"></i>
                    <p>暂无公告</p>
                </div>
            `;
            return;
        }

        // 按日期倒序排列（最新的在最前）
        files.sort((a, b) => {
            // 提取数字部分进行比较
            const numA = a.replace(/\D/g, '');
            const numB = b.replace(/\D/g, '');
            return numB.localeCompare(numA);
        });
        console.log('🔄 排序后的文件列表:', files);

        // 使用for循环按顺序加载，而不是并行加载
        const notices = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            console.log(`📥 正在加载第${i+1}个文件: ${file}`);

            try {
                const notice = await getNoticeContent(file);
                if (notice) {
                    notices.push(notice);
                    console.log(`✅ 成功加载: ${notice.title}`);
                } else {
                    console.warn(`⚠️  文件 ${file} 加载失败`);
                }
            } catch (fileError) {
                console.error(`❌ 加载文件 ${file} 时出错:`, fileError);
                // 继续加载其他文件
            }

            // 添加短暂延迟，避免可能的并发问题
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        console.log(`🎉 总共成功加载 ${notices.length}/${files.length} 个公告`);

        if (notices.length === 0) {
            NOTICES_CONTAINER.innerHTML = `
                <div class="no-notices">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>所有公告加载失败</p>
                    <p style="font-size: 0.8rem; margin-top: 10px;">请检查JSON文件格式</p>
                </div>
            `;
            return;
        }

        // 清空容器
        NOTICES_CONTAINER.innerHTML = '';

        // 显示公告
        notices.forEach((notice, index) => {
            console.log(`🖼️  创建公告卡片 ${index+1}: ${notice.title}`);
            const card = createNoticeCard(notice);
            NOTICES_CONTAINER.appendChild(card);
        });

        // 初始化筛选功能
        initFilter();

        console.log('✨ 公告加载完成');

    } catch (error) {
        console.error('💥 加载公告失败:', error);
        NOTICES_CONTAINER.innerHTML = `
            <div class="no-notices">
                <i class="fas fa-exclamation-triangle"></i>
                <p>加载公告失败</p>
                <p style="font-size: 0.8rem; margin-top: 10px;">错误: ${error.message}</p>
                <button onclick="location.reload()" style="margin-top: 15px; padding: 8px 16px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    重新加载
                </button>
            </div>
        `;
    }
}

// ================ 页面初始化 ================

// 页面加载完成时执行
document.addEventListener('DOMContentLoaded', () => {
    updateCurrentDate();
    loadNotices();
    
    // 每小时更新一次日期
    setInterval(updateCurrentDate, 3600000);
});