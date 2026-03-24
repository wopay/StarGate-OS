// =====================================================================
// 🌟 黑灯工厂全局富媒体 Markdown 渲染引擎 (极致手势降维版)
// =====================================================================

// --- 1. 动态注入全局全能查看器 (媒体影院 + 手势灯箱) ---
if (!document.getElementById('global-lightbox')) {
    document.body.insertAdjacentHTML('beforeend', `
        <div id="global-lightbox" style="display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.95); z-index:9999; justify-content:center; align-items:center; flex-direction:column; backdrop-filter: blur(10px); touch-action: none;">
            
            <div style="position:absolute; top:0; left:0; width:100%; padding:20px; display:flex; justify-content:space-between; align-items:center; z-index: 10000; background: linear-gradient(rgba(0,0,0,0.8), transparent); box-sizing: border-box;">
                <div id="lightbox-info" style="color:var(--accent-cyan, #20c997); font-weight:bold; font-size:0.9rem; text-shadow: 0 2px 4px rgba(0,0,0,0.8);">媒体检阅模式</div>
                <div style="display:flex; gap:15px;">
                    <a id="lightbox-download" href="" download style="color:#000; text-decoration:none; background:var(--accent-cyan, #20c997); padding:8px 16px; border-radius:6px; font-weight:bold; font-size: 0.85rem; box-shadow: 0 0 15px rgba(32,201,151,0.4);">💾 保存</a>
                    <button onclick="window.closeLightbox()" style="background:var(--accent-red, #ff5f56); color:#000; border:none; padding:8px 16px; border-radius:6px; font-weight:bold; font-size: 0.85rem; cursor:pointer; box-shadow: 0 0 15px rgba(255,95,86,0.4);">✖ 关闭</button>
                </div>
            </div>

            <div id="lightbox-content-wrapper" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; overflow:visible;">
                </div>
            
            <div id="lightbox-tip" style="position:absolute; bottom:20px; color:#aaa; font-size:0.75rem; z-index:10000; pointer-events:none;">
                双指缩放 | 单指拖拽 | 双击复原
            </div>
        </div>
    `);
}

// --- 🌟 手势核心状态机 ---
let lbState = { scale: 1, x: 0, y: 0, startX: 0, startY: 0, initialDistance: 0, initialScale: 1, isDragging: false };
let lastTapTime = 0;

// 计算双指距离
function getDistance(touches) {
    return Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
}

// 应用矩阵变换
function updateTransform(el) {
    el.style.transform = `translate(${lbState.x}px, ${lbState.y}px) scale(${lbState.scale})`;
}

// 绑定手势监听器
function bindGestures(mediaEl) {
    const wrapper = document.getElementById('lightbox-content-wrapper');
    // 只有图片才允许缩放拖拽，视频和音频需要点击原生控件
    if(mediaEl.tagName !== 'IMG') {
        lbState.scale = 1; lbState.x = 0; lbState.y = 0; updateTransform(mediaEl);
        document.getElementById('lightbox-tip').style.display = 'none';
        return;
    }
    
    document.getElementById('lightbox-tip').style.display = 'block';

    // 触控事件
    wrapper.ontouchstart = (e) => {
        if (e.touches.length === 2) {
            lbState.initialDistance = getDistance(e.touches);
            lbState.initialScale = lbState.scale;
        } else if (e.touches.length === 1) {
            lbState.isDragging = true;
            lbState.startX = e.touches[0].pageX - lbState.x;
            lbState.startY = e.touches[0].pageY - lbState.y;

            // 双击复原检测
            const now = Date.now();
            if (now - lastTapTime < 300) {
                lbState.scale = lbState.scale > 1 ? 1 : 2.5; // 双击放大2.5倍或复原
                lbState.x = 0; lbState.y = 0;
                mediaEl.style.transition = 'transform 0.3s ease';
                updateTransform(mediaEl);
                setTimeout(() => mediaEl.style.transition = 'none', 300); // 恢复无缝拖拽
            }
            lastTapTime = now;
        }
    };

    wrapper.ontouchmove = (e) => {
        e.preventDefault(); // 阻断页面本身滚动
        if (e.touches.length === 2) {
            // 双指缩放
            const currentDistance = getDistance(e.touches);
            let newScale = lbState.initialScale * (currentDistance / lbState.initialDistance);
            lbState.scale = Math.min(Math.max(0.5, newScale), 5); // 限制缩放 0.5x - 5x
            updateTransform(mediaEl);
        } else if (e.touches.length === 1 && lbState.isDragging && lbState.scale > 1) {
            // 单指拖动 (仅在放大状态下生效)
            lbState.x = e.touches[0].pageX - lbState.startX;
            lbState.y = e.touches[0].pageY - lbState.startY;
            updateTransform(mediaEl);
        }
    };

    wrapper.ontouchend = () => {
        lbState.isDragging = false;
        // 如果缩放小于1，松手时自动弹回原尺寸
        if (lbState.scale < 1) {
            lbState.scale = 1; lbState.x = 0; lbState.y = 0;
            mediaEl.style.transition = 'transform 0.3s ease';
            updateTransform(mediaEl);
            setTimeout(() => mediaEl.style.transition = 'none', 300);
        }
    };

    // 桌面端鼠标滚轮缩放
    wrapper.onwheel = (e) => {
        e.preventDefault();
        const zoomRate = 0.1;
        if (e.deltaY < 0) lbState.scale = Math.min(lbState.scale + zoomRate, 5);
        else lbState.scale = Math.max(lbState.scale - zoomRate, 0.5);
        
        mediaEl.style.transition = 'transform 0.1s';
        updateTransform(mediaEl);
        setTimeout(() => mediaEl.style.transition = 'none', 100);
    };
}


// --- 2. 媒体调度器 (根据类型挂载 DOM) ---
window.openLightbox = function(src, type, name) {
    const lightbox = document.getElementById('global-lightbox');
    const wrapper = document.getElementById('lightbox-content-wrapper');
    const dl = document.getElementById('lightbox-download');
    const info = document.getElementById('lightbox-info');
    
    // 初始化状态
    lbState = { scale: 1, x: 0, y: 0, startX: 0, startY: 0, initialDistance: 0, initialScale: 1, isDragging: false };
    wrapper.innerHTML = ''; 
    wrapper.ontouchstart = null; wrapper.ontouchmove = null; wrapper.ontouchend = null; wrapper.onwheel = null;

    dl.href = src;
    dl.download = name || src.split('/').pop() || 'downloaded_asset';
    info.innerText = `[${type.toUpperCase()}] ${name || '全屏沉浸模式'}`;

    let mediaEl;
    if (type === 'image') {
        mediaEl = document.createElement('img');
        mediaEl.src = src;
        mediaEl.style.cssText = 'max-width:95vw; max-height:85vh; border-radius:8px; box-shadow:0 0 50px rgba(0,0,0,0.8); object-fit:contain; transform-origin: center center; cursor: grab;';
    } else if (type === 'video') {
        mediaEl = document.createElement('video');
        mediaEl.src = src;
        mediaEl.controls = true;
        mediaEl.autoplay = true;
        mediaEl.style.cssText = 'max-width:95vw; max-height:85vh; border-radius:8px; box-shadow:0 0 50px rgba(0,0,0,0.8); background:#000;';
    } else if (type === 'audio') {
        mediaEl = document.createElement('audio');
        mediaEl.src = src;
        mediaEl.controls = true;
        mediaEl.autoplay = true;
        mediaEl.style.cssText = 'width: 80vw; max-width: 500px; transform: scale(1.2);';
    }

    wrapper.appendChild(mediaEl);
    bindGestures(mediaEl);
    lightbox.style.display = 'flex';
};

window.closeLightbox = function() {
    document.getElementById('global-lightbox').style.display = 'none';
    document.getElementById('lightbox-content-wrapper').innerHTML = ''; // 清空以停止音视频播放
};

window.copyMediaLink = function(url, btnElem) {
    // 调用您的全局兼容复制函数
    if(window.copyTextToClipboard) {
        window.copyTextToClipboard(url, btnElem);
    } else {
        navigator.clipboard.writeText(url);
        btnElem.innerText = "✅ 已复制";
    }
};


// --- 3. 配置 Marked.js 渲染器 (降维打击排版) ---
const renderer = new marked.Renderer();

renderer.image = function(href, title, text) {
    const filename = href.split('/').pop();

    // 🎬 视频识别
    if (text && text.startsWith('VIDEO:')) {
        const vidName = text.replace('VIDEO:', '');
        return `<div style='margin-top:15px; margin-bottom:15px; background:rgba(0,0,0,0.4); border:1px solid #333; border-radius:8px; padding:12px;'>
                    <div style='font-size:0.75rem; color:var(--accent-cyan, #20c997); margin-bottom:8px; display:flex; align-items:center; gap:5px;'>
                        <span>🎬 视频媒体:</span> <span style="color:#fff; font-weight:bold;">${vidName}</span>
                    </div>
                    <video src='${href}' controls preload="metadata" style='max-width:100%; width:100%; border-radius:6px; box-shadow:0 4px 15px rgba(0,0,0,0.6); background:#000;'></video>
                    <div style="margin-top:10px; display:flex; justify-content:flex-end; gap:10px;">
                        <button onclick="window.openLightbox('${href}', 'video', '${vidName}')" style="background:var(--accent-cyan, #20c997); color:#000; border:none; padding:6px 12px; border-radius:4px; font-weight:bold; font-size:0.75rem; cursor:pointer;">📺 沉浸影院</button>
                        <button onclick="window.copyMediaLink('${href}', this)" style="background:transparent; border:1px solid #444; color:#aaa; padding:6px 12px; border-radius:4px; font-size:0.75rem; cursor:pointer;">📋 复制链接</button>
                    </div>
                </div>`;
    }
    // 🎵 音频识别
    if (text && text.startsWith('AUDIO:')) {
        const audName = text.replace('AUDIO:', '');
        return `<div style='margin-top:15px; margin-bottom:15px; background:rgba(0,0,0,0.4); border:1px solid #333; border-radius:8px; padding:12px;'>
                    <div style='font-size:0.75rem; color:var(--accent-gold, #ffb74d); margin-bottom:8px; display:flex; align-items:center; gap:5px;'>
                        <span>🎵 音频资产:</span> <span style="color:#fff;">${audName}</span>
                    </div>
                    <audio src='${href}' controls style='width:100%; outline:none;'></audio>
                    <div style="margin-top:10px; display:flex; justify-content:flex-end;">
                         <button onclick="window.openLightbox('${href}', 'audio', '${audName}')" style="background:transparent; border:1px solid #444; color:#aaa; padding:6px 12px; border-radius:4px; font-size:0.75rem; cursor:pointer;">💽 全屏挂载</button>
                    </div>
                </div>`;
    }
    
    // 🖼️ 普通图片渲染 
    const imgName = text || filename;
    return `<div style='margin-top:15px; margin-bottom:15px; text-align:center;'>
                <img src='${href}' alt='${imgName}' style='max-width:100%; max-height:350px; border-radius:8px; box-shadow:0 4px 15px rgba(0,0,0,0.4); cursor:zoom-in; transition: transform 0.2s;' onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'" onclick="window.openLightbox('${href}', 'image', '${imgName}')" title='点击唤起手势灯箱'>
                <div style="font-size:0.7rem; color:#666; margin-top:8px;">[🔍 点击图片展开高维手势控制] ${imgName}</div>
            </div>`;
};

renderer.link = function(href, title, text) {
    const isImageUrl = href.match(/\.(jpeg|jpg|gif|png|webp)$/i) || href.includes('images.unsplash.com') || href.includes('image');
    if (isImageUrl) return renderer.image(href, title, text); 

    if (href.startsWith('/storage/')) {
        return `<div style="margin-top:15px; margin-bottom:15px; padding:12px 15px; background:rgba(32, 201, 151, 0.08); border:1px dashed var(--accent-cyan, #20c997); border-radius:8px; display:flex; justify-content:space-between; align-items:center; transition: background 0.3s;" onmouseover="this.style.background='rgba(32, 201, 151, 0.15)'" onmouseout="this.style.background='rgba(32, 201, 151, 0.08)'">
                    <div style="display:flex; align-items:center; gap:12px; color:var(--accent-cyan, #20c997); overflow: hidden;">
                        <span style="font-size:1.8rem; flex-shrink: 0;">📦</span>
                        <div style="overflow: hidden;">
                            <div style="font-weight:bold; font-size:0.9rem; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;" title="${text}">${text}</div>
                            <div style="font-size:0.75rem; color:#aaa; margin-top: 2px;">物理资产已成功引渡</div>
                        </div>
                    </div>
                    <a href="${href}" target="_blank" style="background:var(--accent-cyan, #20c997); color:#000; text-decoration:none; padding:8px 16px; border-radius:6px; font-weight:bold; font-size: 0.8rem; flex-shrink: 0; box-shadow: 0 2px 8px rgba(32, 201, 151, 0.3); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">检阅 / 下载</a>
                </div>`;
    }
    
    return `<a href="${href}" target="_blank" style="color:var(--accent-cyan, #20c997); text-decoration:none; border-bottom: 1px dashed var(--accent-cyan, #20c997); padding-bottom:1px; transition: color 0.2s;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='var(--accent-cyan, #20c997)'">🔗 ${text}</a>`;
};

marked.setOptions({
    renderer: renderer,
    highlight: function(code, lang) {
        if (typeof hljs !== 'undefined') {
            if (lang && hljs.getLanguage(lang)) { return hljs.highlight(code, { language: lang }).value; }
            return hljs.highlightAuto(code).value;
        }
        return code;
    }, 
    breaks: true
});