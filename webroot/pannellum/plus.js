// [webroot/plus.js] - 厂长专属最高优先级视觉与物理外挂引擎 (V24 纯净稳定版)

// =========================================================================
// 🚀 1. 前端 Blob 强制物理下载引擎
// =========================================================================
window.forceDownloadAsset = async function(url, filename, btnEl) {
    const originalText = btnEl.innerHTML;
    btnEl.innerHTML = "⏳ 提取流中...";
    btnEl.style.pointerEvents = "none";
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("网络层拦截");
        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click(); 
        
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
    } catch (e) {
        console.error("流提取失败:", e);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
    } finally {
        btnEl.innerHTML = originalText;
        btnEl.style.pointerEvents = "auto";
    }
};

// =========================================================================
// 🚀 2. 视觉增强：高斯暗淡与星芒头像 (纯 CSS 注入，零 JS 逻辑，永不报错)
// =========================================================================
(function injectVisualEnhancements() {
    if (document.getElementById('gemini-visual-enhancements')) return;
    
    const style = document.createElement('style');
    style.id = 'gemini-visual-enhancements';
    style.innerHTML = `
        /* --- 气泡高斯暗淡 --- */
        @keyframes geminiUserMsgDim {
            0% { opacity: 1; transform: scale(1); filter: brightness(1); }
            100% { opacity: 0.45; transform: scale(0.98); filter: brightness(0.7); }
        }
        .message-row.user .message-content,
        .message.user .message-content,
        .user-message .message-content,
        [data-role="user"] .message-content {
            animation: geminiUserMsgDim 1.5s cubic-bezier(0.4, 0, 0.2, 1) 5s forwards !important;
            transform-origin: right center !important;
            transition: opacity 0.3s ease, transform 0.3s ease, filter 0.3s ease, box-shadow 0.3s ease !important;
        }
        .message-row.user .message-content:hover,
        .message.user .message-content:hover,
        .user-message .message-content:hover,
        [data-role="user"] .message-content:hover {
            animation: none !important;
            opacity: 1 !important;
            transform: scale(1) !important;
            filter: brightness(1.1) !important;
            box-shadow: 0 4px 15px rgba(168, 199, 250, 0.15) !important;
            z-index: 10;
        }

        /* --- 头像强制星芒化 --- */
        @keyframes avatarStarPulse {
            0% { transform: scale(0.9); filter: drop-shadow(0 0 4px rgba(168,199,250,0.4)); }
            50% { transform: scale(1.15); filter: drop-shadow(0 0 12px rgba(216,180,254,0.9)); }
            100% { transform: scale(0.9); filter: drop-shadow(0 0 4px rgba(168,199,250,0.4)); }
        }
        
        /* 强制隐藏原有头像背景与文字 */
        .message-row.ai .avatar,
        .message-row.ai .message-avatar,
        .message-row.assistant .avatar,
        [data-role="ai"] .avatar {
            color: transparent !important;
            font-size: 0 !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            overflow: visible !important;
            position: relative;
        }
        
        /* 利用 CSS 伪元素直接画图，完全抛弃 Observer 监控！ */
        .message-row.ai .avatar::before,
        .message-row.ai .message-avatar::before,
        .message-row.assistant .avatar::before,
        [data-role="ai"] .avatar::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 24px;
            height: 24px;
            margin-top: -12px;
            margin-left: -12px;
            animation: avatarStarPulse 3s ease-in-out infinite;
            /* 完美的 SVG Data URI */
            background-image: url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12 0C12 6.627 17.373 12 24 12C17.373 12 12 17.373 12 24C12 17.373 6.627 12 0 12C6.627 12 12 6.627 12 0Z' fill='url(%23gemini-avatar-grad)'/%3E%3Cdefs%3E%3ClinearGradient id='gemini-avatar-grad' x1='0' y1='0' x2='24' y2='24' gradientUnits='userSpaceOnUse'%3E%3Cstop stop-color='%23a8c7fa' /%3E%3Cstop offset='1' stop-color='%23d8b4fe' /%3E%3C/linearGradient%3E%3C/defs%3E%3C/svg%3E");
            background-size: cover;
            background-repeat: no-repeat;
            background-position: center;
        }
    `;
    
    // 因为只插入一个 <style> 标签，所以即便在 <head> 最早期执行也绝对不会报错
    if (document.head) {
        document.head.appendChild(style);
    } else {
        document.addEventListener("DOMContentLoaded", () => {
            document.head.appendChild(style);
        });
    }
})();