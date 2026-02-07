// 配置
const JSON_FOLDER = '/notice/json-files/';
const NOTICES_CONTAINER = document.getElementById('notices-container');
const CURRENT_DATE_ELEMENT = document.getElementById('current-date');

// 获取所有JSON文件列表
// 修改loadNotices函数，改进错误处理
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

// 增强getNoticeContent函数
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