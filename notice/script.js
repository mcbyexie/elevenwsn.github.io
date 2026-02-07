// 配置
const JSON_FOLDER = '/notice/json-files/';
const NOTICES_CONTAINER = document.getElementById('notices-container');
const CURRENT_DATE_ELEMENT = document.getElementById('current-date');

// 获取所有JSON文件列表
async function getNoticeFiles() {
    try {
        // 使用索引文件方法
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

// 获取单个公告内容
async function getNoticeContent(filename) {
    try {
        const response = await fetch(`${JSON_FOLDER}${filename}`);
        if (!response.ok) {
            throw new Error(`无法获取文件: ${filename}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`加载公告 ${filename} 失败:`, error);
        return null;
    }
}

// 创建公告卡片
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
    
    // 添加多个可复制文本（如果使用新的copyableItems格式）
    if (noticeData.copyableItems && Array.isArray(noticeData.copyableItems) && noticeData.copyableItems.length > 0) {
        noticeData.copyableItems.forEach(item => {
            const copyableDiv = document.createElement('div');
            copyableDiv.className = 'copyable-text';
            
            // 如果有图标则显示图标
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
                
                // 显示复制成功反馈
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
            
            // 显示复制成功反馈
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

// 复制到剪贴板
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

// 加载并显示公告
async function loadNotices() {
    NOTICES_CONTAINER.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>正在加载公告...</p>
        </div>
    `;
    
    try {
        const files = await getNoticeFiles();
        
        if (files.length === 0) {
            NOTICES_CONTAINER.innerHTML = `
                <div class="no-notices">
                    <i class="fas fa-inbox"></i>
                    <p>暂无公告</p>
                </div>
            `;
            return;
        }
        
        // 按日期排序（最新的在前）
        files.sort((a, b) => b.localeCompare(a));
        
        // 加载每个公告
        const notices = [];
        for (const file of files) {
            const notice = await getNoticeContent(file);
            if (notice) {
                notices.push(notice);
            }
        }
        
        // 清空容器
        NOTICES_CONTAINER.innerHTML = '';
        
        // 显示公告
        notices.forEach(notice => {
            const card = createNoticeCard(notice);
            NOTICES_CONTAINER.appendChild(card);
        });
        
        // 初始化筛选功能
        initFilter();
        
    } catch (error) {
        console.error('加载公告失败:', error);
        NOTICES_CONTAINER.innerHTML = `
            <div class="no-notices">
                <i class="fas fa-exclamation-triangle"></i>
                <p>加载公告失败，请稍后重试</p>
            </div>
        `;
    }
}

// 初始化筛选功能
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

// 更新当前日期
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

// 页面加载完成时执行
document.addEventListener('DOMContentLoaded', () => {
    updateCurrentDate();
    loadNotices();
    
    // 每小时更新一次日期
    setInterval(updateCurrentDate, 3600000);
});