// [webroot/app_chat.js] - 消息收发、对话记录与并发锁 (V12.0 三位一体智能路由升级)

function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return String(unsafe);
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function safeJsString(str) {
    if (!str) return "";
    return String(str)
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/"/g, "&quot;")
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r");
}

// 👇👇👇 厂长新增：Google Gemini 脑核可视探测器(V21) 👇👇👇
function buildGeminiThoughtsHtml(thoughts) {
    if (!thoughts || !Array.isArray(thoughts) || thoughts.length === 0) return '';

    let html = `<details class="gemini-thoughts-container">`;
    html += `
        <summary class="gemini-thoughts-summary">
            <div class="gemini-thoughts-summary-label"><span>Thinking</span></div>
            <div class="gemini-thoughts-summary-timer">
                <span>${thoughts.length} steps</span>
                <span class="gemini-thoughts-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"></path></svg>
                </span>
            </div>
        </summary>
        <div class="gemini-thoughts-content">
    `;

    thoughts.forEach((step, index) => {
        const stepNum = index + 1;
        let subject = 'System Thought';
        let desc = '';
        
        // 兼容后端的 thoughts: ["<str>"] 纯字符串数组格式，或对象格式
        if (typeof step === 'string') {
            subject = step.length > 20 ? step.substring(0, 20) + '...' : step;
            desc = step;
        } else if (typeof step === 'object') {
            subject = step.subject || 'System Thought';
            desc = step.description || JSON.stringify(step);
        }

        html += `
            <div class="gemini-thought-step">
                <div class="gemini-step-number">${stepNum}</div>
                <div class="gemini-step-detail">
                    <div class="gemini-step-title">${escapeHtml(subject)}</div>
                    <div class="gemini-step-timestamp">${escapeHtml(desc)}</div>
                </div>
            </div>
        `;
    });

    html += `</div></details>`;
    return html;
}
// 👆👆👆 挂载结束 👆👆👆

function parseMessageContent(text, node_id = null, explicitThoughts = null) {
    if (typeof text !== 'string') return String(text);

    let cleanText = text;
    let geminiThoughtsHtml = "";
    let extractedThoughts = explicitThoughts;
    
    // 🧠 修复黑洞一：精准括号配对提取，拒绝贪婪陷阱
    try {
        const startIdx = cleanText.indexOf('{');
        if (startIdx !== -1 && !extractedThoughts) {
            let stack = 0;
            let endIdx = -1;
            // 遍历寻找真正的闭合括号，而不是粗暴的 lastIndexOf
            for (let i = startIdx; i < cleanText.length; i++) {
                if (cleanText[i] === '{') stack++;
                else if (cleanText[i] === '}') {
                    stack--;
                    if (stack === 0) { endIdx = i; break; }
                }
            }
            
            if (endIdx !== -1) {
                const possibleJson = cleanText.substring(startIdx, endIdx + 1);
                const parsed = JSON.parse(possibleJson);
                
                // 提取思想流
                if (parsed.thoughts && Array.isArray(parsed.thoughts) && parsed.thoughts.length > 0) {
                    extractedThoughts = parsed.thoughts;
                }
                
                // 提取正文，丢弃冗余的 JSON 结构
                if (parsed.safe_markdown) {
                    cleanText = cleanText.replace(possibleJson, parsed.safe_markdown);
                } else if (!parsed.action && parsed.thoughts) {
                    cleanText = cleanText.replace(possibleJson, "");
                }
            }
        }
    } catch(e) {}

    // 如果成功提取到了思考（无论是传进来的，还是解析出来的），渲染面板
    if (extractedThoughts && Array.isArray(extractedThoughts) && extractedThoughts.length > 0) {
        geminiThoughtsHtml = buildGeminiThoughtsHtml(extractedThoughts);
    }
    // ==========================================
    
    // ==========================================
    // 🛡️ V20.1 视觉防线：强制切削违规 Markdown
    // ==========================================
    // 双重拦截：匹配特定 ID，或当前正在运行“视觉”类节点
    if (node_id === "visual_engine_id" || (window._currentExecutingNodeTitle && window._currentExecutingNodeTitle.includes("视觉"))) {
        // 强制切断所有 Markdown 标题 (###) 和列表 (* )，只保留纯文本数据流
        cleanText = cleanText.replace(/#{1,6}\s+.*?\n/g, "").replace(/\*\s+/g, "").trim();
    }
    
    const stopWords = ['【🚨 架构师致命红线', '【最高工作流锻造法则】', '【管家最高调度铁律】'];
    for (let word of stopWords) {
        if (cleanText.includes(word)) {
            cleanText = cleanText.split(word)[0].trim();
        }
    }

    // ==========================================
    // 💡 V19.2 视觉防泄漏与资产卡片渲染引擎 (含双重断头台)
    // ==========================================
    // 1. 物理拦截（闭合态）：强行隐藏完整 forge_entity 里的代码
    cleanText = cleanText.replace(/<forge_entity>[\s\S]*?<\/forge_entity>/gi, 
        '<div style="background:rgba(0,0,0,0.4); color:#20c997; padding:6px 12px; border-radius:6px; font-size:0.75rem; margin:10px 0; border:1px solid #20c997; display:inline-block;">✅ [物理机床]：实体代码已落盘，系统视觉屏蔽生效。</div>'
    );

    // 2. 物理拦截（断头台）：处理未闭合的标签（防止历史记录或中断的任务溢出）
    const staticForgeIdx = cleanText.toLowerCase().indexOf('<forge_entity>');
    if (staticForgeIdx !== -1) {
        cleanText = cleanText.substring(0, staticForgeIdx) + 
            '\n\n<div style="background:rgba(0,0,0,0.4); color:#ffb74d; padding:6px 12px; border-radius:6px; font-size:0.75rem; margin:10px 0; border:1px dashed #ffb74d; display:inline-block;">⚠️ [机床作业中断]：代码流未闭合，为防页面崩塌，残段视觉已强制熔断。</div>';
    }

    // 3. 资产信标转换：将 [[ASSET:/app/workspace/xxx.html]] 变成精美的可交互卡片
    cleanText = cleanText.replace(/\[\[ASSET:(.+?)\]\]/g, (match, filepath) => {
        const filename = filepath.split('/').pop();
        const ext = filename.split('.').pop().toLowerCase();
        
        // 路径映射：将后端的绝对路径转换为前端可访问的网络 URL
        const webUrl = filepath.includes('/app/workspace') ? filepath.replace('/app/workspace', '/workspace') : `/storage/${filename}`;

        let previewBtn = '';
        // 💡 联动呼叫 app_core.js 中自带的侧滑全息视界 API
        if (ext === 'html' || ext === 'pdf') {
            previewBtn = `<button onclick="window.openHtmlPreview('${webUrl}', '${filename}')" style="background:linear-gradient(135deg, #a8c7fa 0%, #d8b4fe 100%); color:#000; border:none; padding:6px 16px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:0.85rem; box-shadow: 0 4px 10px rgba(168,199,250,0.2);">👁️ 侧滑全息预览</button>`;
        }

        return `
        <div class="asset-card" style="margin-top: 15px; background: rgba(168,199,250,0.05); border: 1px solid var(--accent-color); border-radius: 8px; padding: 15px; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 2.2rem;">${ext === 'html' ? '🌐' : '📄'}</span>
                <div>
                    <div style="font-weight: bold; color: #eee; margin-bottom: 4px; font-size:1.05rem;">${filename}</div>
                    <div style="font-size: 0.75rem; color: #888;">实体文件已落盘就绪</div>
                </div>
            </div>
            <div style="display: flex; gap: 10px;">
                ${previewBtn}
                <a href="${webUrl}" download="${filename}" target="_blank" style="background: rgba(255,255,255,0.08); color: #fff; text-decoration: none; border: 1px solid #555; padding: 6px 16px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; transition: 0.2s;">💾 直接下载</a>
            </div>
        </div>`;
    });

    if (cleanText.includes('【标准输出】') || cleanText.includes('【错误日志】') || cleanText.includes('【系统错误日志】')) {
        const logContent = cleanText.replace('【工具执行结果】:', '').trim();
        return `
            <div style="background:#0c0c0c; border:1px solid #333; border-radius:8px; overflow:hidden; font-family:'Courier New', monospace; margin-top:8px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                <div style="background:#222; padding:4px 10px; font-size:0.7rem; color:#888; display:flex; gap:6px; align-items:center;">
                    <span style="color:#ff5f56; font-size:1.2rem; line-height:0.5;">●</span>
                    <span style="color:#ffbd2e; font-size:1.2rem; line-height:0.5;">●</span>
                    <span style="color:#27c93f; font-size:1.2rem; line-height:0.5;">●</span>
                    <span style="margin-left:10px; color:#fff;">管家后台处理日志</span>
                </div>
                <div style="padding:10px; font-size:0.8rem; color:#0f0; white-space:pre-wrap; max-height:350px; overflow-y:auto; line-height:1.4;">${escapeHtml(logContent).replace(/【错误日志】:/g, '\n<span style="color:#ff6b6b; font-weight:bold;">[运行警告]</span>').replace(/【系统错误日志】:/g, '\n<span style="color:#ff6b6b; font-weight:bold;">[系统提示]</span>')}</div>
            </div>
        `;
    }

    let injectedCards = [];
    const uiMode = localStorage.getItem('butler_ui_mode') || 'simple';

    function extractAndProcess(actionPattern, callback) {
        const regexMD = new RegExp(`\`\`\`(?:json)?\\s*(\\{[\\s\\S]*?"${actionPattern}"[\\s\\S]*?\\})\\s*\`\`\``, 'i');
        const regexRaw = new RegExp(`(\\{\\s*"action"\\s*:\\s*"${actionPattern}"[\\s\\S]*?\\})`, 'i');
        
        let match = cleanText.match(regexMD) || cleanText.match(regexRaw);
        if (match) {
            try {
                const data = JSON.parse(match[1]);
                const uiHtml = callback(data);
                if (uiHtml) injectedCards.push(uiHtml);
                cleanText = cleanText.replace(match[0], ''); 
            } catch(e) {
                console.error(`解析 Action JSON 失败 [${actionPattern}]:`, e);
            }
        }
    }

    // [行动 1] 建立新频道
    extractAndProcess("create_channel", (data) => {
        const safeUserReq = safeJsString(window._lastSentText || "新建通用任务");
        return `
        <div class="ai-interaction-card" style="border-color:#a8c7fa; background:rgba(168,199,250,0.05);">
            <div class="card-tag" style="color:#a8c7fa;">📡 发现新业务领域</div>
            <div class="card-body">厂长，系统建议开辟 <b>[${data.name}]</b> 专属频道进行隔离作业。</div>
            <div class="card-btns">
                <button class="card-btn primary" onclick="window.createNewDomainFromAI('${data.name}', '${safeUserReq}')">✅ 批准：开荒并进入</button>
            </div>
        </div>`;
    });

    // [行动 2] 切换旧频道
    extractAndProcess("switch_channel", (data) => {
        const safeUserReq = safeJsString(window._lastSentText || "");
        const domainName = (window.domainList || []).find(d => d.id === data.target_id)?.name || data.target_id;
        return `
        <div class="ai-interaction-card" style="border-color:#20c997; background:rgba(32,201,151,0.05);">
            <div class="card-tag" style="color:#20c997;">🔀 领域聚合建议</div>
            <div class="card-body">该需求属于 <b>[${domainName}]</b> 大类的事务，管家建议直接跃迁至该频道进行聚合处理。</div>
            <div class="card-btns">
                <button class="card-btn primary" style="background:#20c997; color:#111;" onclick="window.switchDomain('${data.target_id}'); setTimeout(()=>window.handleSend('${safeUserReq}'), 800);">✅ 同意：跃迁并处理</button>
                <button class="card-btn secondary" onclick="this.closest('.ai-interaction-card').remove()">❌ 忽略，就在当前频道</button>
            </div>
        </div>`;
    });

    // [行动 3] 挂载现有工作流
    extractAndProcess("mount", (data) => {
        if (uiMode === 'simple') {
            const wfName = (window._cachedWorkflows && window._cachedWorkflows[data.workflow_id]) ? window._cachedWorkflows[data.workflow_id].name : data.workflow_id;
            return `
            <div class="ai-interaction-card" style="border-color:#4caf50; background:rgba(76, 175, 80, 0.05);">
                <div class="card-tag" style="color:#4caf50;">⚡ 极简模式：全自动接驳</div>
                <div class="card-body" style="font-size:0.85rem; color:#ccc;">已为您自动挂载底层流水线 <b>[${wfName}]</b>。<br>🚀 任务已物理移交至黑灯工厂后台推演...</div>
            </div>`;
        } else {
            let wfOptionsHtml = '';
            let isTargetFound = false;
            
            if (window._cachedWorkflows) {
                const currentEnv = window.currentDomain || 'factory_dev';
                for (const [id, w] of Object.entries(window._cachedWorkflows)) {
                    const wDomain = w.domain_id || (w.data && w.data.domain_id) || 'factory_dev';
                    if (wDomain === currentEnv) {
                        const isSelected = (id === data.workflow_id) ? 'selected' : '';
                        if (isSelected) isTargetFound = true;
                        wfOptionsHtml += `<option value="${id}" ${isSelected}>📄 ${w.name}</option>`;
                    }
                }
            }
            
            if (!isTargetFound) {
                wfOptionsHtml = `<option value="" disabled selected style="color:#ff6b6b">⚠️ 匹配流 [${data.workflow_id}] 失效或跨域，请手动选择</option>` + wfOptionsHtml;
            }

            const safeUserReq = safeJsString(window._lastSentText || "");
            
            return `
            <div class="ai-interaction-card" style="border-color:#ffb74d; background: rgba(255, 183, 77, 0.05);">
                <div class="card-tag" style="color: #ffb74d;">🤖 授权请求：深入底层系统</div>
                <div class="card-body">
                    管家为您匹配了以下研发流（可手动调整）：<br>
                    <select class="mount-wf-select" style="width:100%; margin-top:6px; background:#111; border:1px solid #555; color:#fff; padding:8px; border-radius:6px; outline:none; font-family:inherit;">
                        ${wfOptionsHtml}
                    </select>
                </div>
                <div class="card-btns">
                    <button class="card-btn primary" onclick="window.confirmAutoMountAction(this)">✅ 确认放行</button>
                    <button class="card-btn" onclick="window.triggerArchitectGen(this, '${safeUserReq}')" style="background: linear-gradient(135deg, #a8c7fa 0%, #d8b4fe 100%); color: #111;">✨ 创建新流</button>
                    <button class="card-btn secondary" onclick="window.cancelAutoMountAction(this)">❌ 暂不</button>
                </div>
            </div>`;
        }
    });
    
    // [行动 4] 呼叫架构师编写全新工作流
    extractAndProcess("create_workflow_draft", (data) => {
        const safeUserReq = safeJsString(window._lastSentText || "复杂需求分析");
        return `
        <div class="ai-interaction-card" style="border-color:#d8b4fe; background:rgba(216,180,254,0.05);">
            <div class="card-tag" style="color: #d8b4fe;">✨ 移交总厂管家 (呼叫架构师)</div>
            <div class="card-body">接待员判定此需求需要底层作业。是否立即唤醒【总厂管家】为您编排专属工作流？</div>
            <div class="card-btns">
                <button class="card-btn primary" style="background: linear-gradient(135deg, #a8c7fa 0%, #d8b4fe 100%); color:#111;" 
                        onclick="document.getElementById('iq-mode-selector').value='ai_1772784456575'; window.triggerArchitectGen(this, '${safeUserReq}')">
                    ✅ 移交管家建流
                </button>
                <button class="card-btn secondary" onclick="this.closest('.ai-interaction-card').remove()">❌ 暂不，就随便聊聊</button>
            </div>
        </div>`;
    });

    const draftMatch = cleanText.match(/```json\s*(\{[\s\S]*?"nodes"[\s\S]*?\})\s*```/);
    if (draftMatch) {
        try {
            const draftJsonStr = draftMatch[1].trim();
            const parsed = JSON.parse(draftJsonStr);
            if (parsed.nodes) {
                const safeB64Json = btoa(unescape(encodeURIComponent(draftJsonStr)));
                const safeUserReq = safeJsString(window._lastSentText || "请根据草案配置开始执行任务");
                
                const approvalCard = `
                <div class='workflow-approval-card' style='background: rgba(168, 199, 250, 0.05); border: 1px solid var(--accent-color); border-radius: 12px; padding: 16px; margin: 16px 0;'>
                    <h4 style='margin-top:0; margin-bottom:10px; color: var(--accent-color); display:flex; align-items:center; gap:8px;'>
                        <span>📝</span> 待审批：系统工作流草案
                    </h4>
                    <p style='font-size: 0.85rem; color: #aaa; margin-bottom: 12px;'>AI 架构师已生成工作流规则代码，请厂长审核是否放行：</p>
                    <pre style='background: #000; padding: 12px; border-radius: 8px; font-size: 0.75rem; max-height: 250px; overflow-y: auto; border: 1px solid #333;'>${escapeHtml(draftJsonStr)}</pre>
                    <div style='display: flex; gap: 12px; margin-top: 16px;'>
                        <button onclick='window.approveAndMountWorkflow("${safeB64Json}", "${safeUserReq}")' style='flex: 1; background: linear-gradient(135deg, #a8c7fa 0%, #d8b4fe 100%); color: #000; border: none; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 15px rgba(168,199,250,0.2);'>
                            ✅ 同意挂载并移交黑灯工厂
                        </button>
                        <button onclick='window.rejectWorkflow(this)' style='flex: 1; background: rgba(255, 107, 107, 0.1); color: #ff6b6b; border: 1px solid #ff6b6b; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s;'>
                            ❌ 驳回要求重写
                        </button>
                    </div>
                </div>`;
                injectedCards.push(approvalCard);
                cleanText = cleanText.replace(draftMatch[0], ''); 
            }
        } catch(e) {
            console.error("工作流草案卡片解析失败", e);
        }
    }
	
	let finalParsedHtml = "";
    if (cleanText.trim()) {
        try {
            if (typeof marked !== 'undefined') {
                finalParsedHtml = marked.parse(cleanText.trim());
            } else {
                finalParsedHtml = escapeHtml(cleanText.trim()).replace(/\n/g, '<br>');
            }
        } catch (e) {
            finalParsedHtml = escapeHtml(cleanText.trim()).replace(/\n/g, '<br>');
        }
    }
    
    if (injectedCards.length > 0) {
        finalParsedHtml += injectedCards.join('');
    }

    // 💡 拼接最终 HTML：将幽蓝色思考折叠区置于正文顶部！
    return geminiThoughtsHtml + finalParsedHtml;
}

window.copyTextToClipboard = function(textToCopy, btnElem) {
    const successFeedback = () => {
        if (!btnElem) return;
        const originalHtml = btnElem.innerHTML;
        if(originalHtml.includes('svg')) {
            btnElem.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#4caf50" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        } else {
            btnElem.innerText = "已复制!";
        }
        setTimeout(() => { btnElem.innerHTML = originalHtml; }, 2000);
    };

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textToCopy).then(successFeedback).catch(err => {
            console.error('复制失败', err);
            alert('复制失败，请手动选取');
        });
    } else {
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try { document.execCommand('copy'); successFeedback(); } catch (err) { alert('当前浏览器环境不支持一键复制'); }
        textArea.remove();
    }
};

window.copyElementToClipboard = function(elementId, btnElem) {
    const el = document.getElementById(elementId);
    if (!el) return;
    let textToCopy = el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' ? el.value : el.innerText;
    window.copyTextToClipboard(textToCopy, btnElem);
};

// 🟢 替换方案 (接入流式音频队列管理器 + 微软发声引擎)
window.copyCode = function(btn) {
    const pre = btn.parentElement;
    const codeElem = pre.querySelector('code');
    const codeText = codeElem ? codeElem.innerText : pre.innerText.replace('Copy', '').trim();
    window.copyTextToClipboard(codeText, btn);
};

// ==========================================
// 💡 V21.0 流式音频队列管理器 (Edge-TTS)
// ==========================================
window._ttsQueue = [];
window._isTtsPlaying = false;
window._currentEdgeAudio = null;
window._currentSpeakingId = null;

// 强行刹车，清空所有声音
window.stopAllTts = function() {
    window._ttsQueue = [];
    if (window._currentEdgeAudio) {
        window._currentEdgeAudio.pause();
        window._currentEdgeAudio = null;
    }
    window._isTtsPlaying = false;
    window._currentSpeakingId = null;
    document.querySelectorAll('.tts-play-btn.playing').forEach(btn => {
        btn.innerHTML = "🔊 朗读";
        btn.classList.remove('playing');
        btn.style.color = ""; btn.style.borderColor = "transparent"; btn.style.background = "transparent";
    });
};

// 播放列车的下一节车厢
window.playNextTts = function() {
    if (window._ttsQueue.length === 0) {
        window._isTtsPlaying = false;
        return;
    }
    window._isTtsPlaying = true;
    const url = window._ttsQueue.shift();
    window._currentEdgeAudio = new Audio(url);
    window._currentEdgeAudio.onended = () => window.playNextTts(); 
    window._currentEdgeAudio.onerror = () => window.playNextTts(); 
    window._currentEdgeAudio.play().catch(e => window.playNextTts());
};

// 塞入新的文本车厢 (专供流式打字机调用)
window.enqueueStreamTTS = async function(text) {
    if (!text.trim()) return;
    const cleanText = text.replace(/```[\s\S]*?```/g, '').replace(/<[^>]+>/g, '').replace(/[*_#`~]/g, '').trim();
    if (!cleanText) return;
    
    // 👇 动态读取【管家控制台】里的设置参数
    const voiceSelect = document.getElementById('tts-voice-select');
    const rateSlider = document.getElementById('tts-rate-slider');
    const pitchSlider = document.getElementById('tts-pitch-slider');
    
    const voice = voiceSelect ? voiceSelect.value : "zh-CN-YunxiNeural";
    const rate = rateSlider ? (rateSlider.value >= 0 ? '+'+rateSlider.value+'%' : rateSlider.value+'%') : "+0%";
    const pitch = pitchSlider ? (pitchSlider.value >= 0 ? '+'+pitchSlider.value+'Hz' : pitchSlider.value+'Hz') : "+0Hz";

    try {
        const res = await fetch('/api/tts/generate', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: cleanText, voice: voice, rate: rate, pitch: pitch })
        });
        const data = await res.json();
        if (data.status === 'success' && data.url) {
            window._ttsQueue.push(data.url);
            if (!window._isTtsPlaying) window.playNextTts();
        }
    } catch(e) {}
};

// 手动点击任意消息下方的喇叭
window.toggleMessageTTS = async function(textId, btnElem) {
    if (window._currentEdgeAudio && window._currentSpeakingId === textId) {
        window.stopAllTts();
        return;
    }
    window.stopAllTts(); 

    const el = document.getElementById(textId);
    if (!el) return;
    let rawText = el.value || el.innerText;
    let textToSpeak = rawText.replace(/```[\s\S]*?```/g, '【代码已省略】').replace(/\[.*?\]\(.*?\)/g, '【链接】').replace(/<[^>]+>/g, '').replace(/[*_#`~]/g, '');
    if (!textToSpeak.trim()) return;

    if (btnElem) { btnElem.innerHTML = "⏳ 压制中..."; btnElem.disabled = true; }

    // 👇 动态读取【管家控制台】里的设置参数
    const voiceSelect = document.getElementById('tts-voice-select');
    const rateSlider = document.getElementById('tts-rate-slider');
    const pitchSlider = document.getElementById('tts-pitch-slider');
    
    const voice = voiceSelect ? voiceSelect.value : "zh-CN-YunxiNeural";
    const rate = rateSlider ? (rateSlider.value >= 0 ? '+'+rateSlider.value+'%' : rateSlider.value+'%') : "+0%";
    const pitch = pitchSlider ? (pitchSlider.value >= 0 ? '+'+pitchSlider.value+'Hz' : pitchSlider.value+'Hz') : "+0Hz";

    try {
        const res = await fetch('/api/tts/generate', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: textToSpeak, voice: voice, rate: rate, pitch: pitch })
        });
        const data = await res.json();
        
        if (data.status === 'success' && data.url) {
            if (btnElem) {
                btnElem.innerHTML = "⏹️ 停止"; btnElem.classList.add('playing'); btnElem.disabled = false;
                btnElem.style.color = "#20c997"; btnElem.style.borderColor = "#20c997"; btnElem.style.background = "rgba(32,201,151,0.1)";
            }
            window._currentSpeakingId = textId;
            window._currentEdgeAudio = new Audio(data.url);
            window._currentEdgeAudio.play();
            window._currentEdgeAudio.onended = () => window.stopAllTts();
        }
    } catch (e) {
        if (btnElem) { btnElem.innerHTML = "❌ 失败"; setTimeout(() => { btnElem.innerHTML = "🔊 朗读"; btnElem.disabled = false; }, 2000); }
    }
};

window.exportChatAsHtml = function(messageContent) {
    try {
        const parsedHtml = parseMessageContent(messageContent);
        const template = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>管家推演报告</title>
    <style>
        body { background-color: #1e1f20; color: #eee; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; padding: 40px 20px; margin: 0; }
        .container { max-width: 800px; margin: 0 auto; background-color: #2a2b2d; padding: 30px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 1px solid #444; }
        h1, h2, h3 { color: #d8b4fe; }
        pre { background-color: #111; padding: 15px; border-radius: 8px; overflow-x: auto; border: 1px solid #333; }
        code { font-family: 'Courier New', monospace; color: #e3e3e3; }
        img { max-width: 100%; border-radius: 8px; margin: 10px 0; box-shadow: 0 4px 15px rgba(0,0,0,0.3); display: block; }
        a { color: #a8c7fa; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .header { border-bottom: 1px dashed #444; padding-bottom: 15px; margin-bottom: 20px; color: #888; font-size: 0.9rem; display: flex; justify-content: space-between;}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <span>🤖 AI 智能管家推演归档</span>
            <span>📅 ${new Date().toLocaleString()}</span>
        </div>
        <div class="content">${parsedHtml}</div>
    </div>
</body>
</html>`;
        
        const blob = new Blob([template], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", url);
        downloadAnchorNode.setAttribute("download", "AI管家报告_" + Date.now() + ".html");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        URL.revokeObjectURL(url);
    } catch(e) { alert('导出失败'); }
};

window.showThinkingAnimation = function(text = '管家正在后台推演...') {
    window.hideThinkingAnimation(); // 确保不重复渲染
    const chatBox = document.getElementById('chat-box');
    if (!chatBox) return;
    
    const row = document.createElement('div');
    row.id = 'global-thinking-row';
    row.className = 'message-row row-ai';
    row.innerHTML = `
        <div class="avatar ai-avatar" style="animation: pulse-cruise 2s infinite;">🤖</div>
        <div class="message-content" style="width: 100%;">
            <div style="background:rgba(168,199,250,0.05); border:1px solid var(--accent-color); padding:12px; border-radius:8px; box-shadow: 0 0 15px rgba(168,199,250,0.1);">
                <span style="color:var(--accent-color); font-weight:bold; font-size:1.05rem;">⏳ <span class="blink">${text}</span></span>
                <div style="font-size:0.85rem; color:#ffb74d; margin-top:8px; border-top: 1px dashed #444; padding-top: 8px;">
                    ⚠️ <b>底层切削中，请勿刷新或关闭本页面</b>，以免链路熔断！
                </div>
            </div>
        </div>
    `;
    chatBox.appendChild(row);
    if (typeof window.scrollToBottom === 'function') window.scrollToBottom();
};

window.hideThinkingAnimation = function() {
    const row = document.getElementById('global-thinking-row');
    if (row) row.remove();
};

function initInteractions() {
    const chatInput = document.getElementById('chat-input');
    const chatBox = document.getElementById('chat-box');
    if(!chatInput || !chatBox) return;
    
    chatInput.addEventListener('input', function() { this.style.height = 'auto'; this.style.height = (this.scrollHeight) + 'px'; });

    const closeSidebars = () => {
        document.getElementById('sidebar-left').classList.remove('open');
        document.getElementById('sidebar-right').classList.remove('open');
        document.getElementById('overlay').classList.remove('active');
    };
    
    document.getElementById('btn-toggle-left')?.addEventListener('click', () => { document.getElementById('sidebar-left').classList.add('open'); document.getElementById('overlay').classList.add('active'); });
    document.getElementById('btn-toggle-right')?.addEventListener('click', () => { document.getElementById('sidebar-right').classList.add('open'); document.getElementById('overlay').classList.add('active'); });
    document.getElementById('overlay')?.addEventListener('click', closeSidebars);

    document.getElementById('btn-new-chat')?.addEventListener('click', () => { window.initNewChatUI(false); if(window.innerWidth <= 900) closeSidebars(); });
    document.getElementById('btn-temp-chat')?.addEventListener('click', () => { window.initNewChatUI(true); if(window.innerWidth <= 900) closeSidebars(); });

    window.scrollToBottom = () => { if(chatBox) chatBox.scrollTo({top: chatBox.scrollHeight, behavior: 'smooth'}); };
    
    // 🧠 修复黑洞二：在参数末尾新增 explicitThoughts 接口
    window.appendMessage = (role, text, isThinking = false, isHistory = false, timestamp = null, explicitThoughts = null) => {
        const row = document.createElement('div');
        row.className = `message-row ${role === 'user' ? 'row-user' : 'row-ai'}`;
        
        // 将后端的 thoughts 原封不动传给解析器
        let parsedHtml = parseMessageContent(text, null, explicitThoughts);
        let rawTextSafe = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");

        let timeStr = "";
        if (timestamp) {
            const d = new Date(timestamp);
            timeStr = isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
        } else {
            timeStr = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
        }

        let messageBody = `<div class="message-content" style="position:relative; width: 100%;">${parsedHtml}${isThinking ? '<span class="cursor-blink">▋</span>' : ''}`;
        
        if (role === 'user') {
            messageBody += `<div style="font-size:0.65rem; color:#666; text-align:right; margin-top:6px; font-family:monospace;">${timeStr}</div>`;
        }
        
        if (role === 'ai' && !isThinking && !parsedHtml.includes('class="ai-interaction-card"')) {
            const tempId = `msg-raw-${Date.now()}-${Math.floor(Math.random()*1000)}`;
            messageBody += `
                <textarea id="${tempId}" style="display:none;">${rawTextSafe}</textarea>
                <div class="message-actions" style="display:flex; align-items:center; justify-content:flex-end; gap:8px; margin-top:8px; opacity:0.6; transition:opacity 0.2s;">
                    <span style="font-size:0.7rem; color:#666; font-family:monospace; margin-right:auto;">🕒 ${timeStr}</span>
                    <button class="g-icon-btn tts-play-btn" onclick="window.toggleMessageTTS('${tempId}', this)" title="调用微软 Edge-TTS 朗读此消息" style="width:auto; height:28px; padding:0 10px; border-radius:6px; font-size:0.75rem; font-weight:bold; border:1px solid transparent; transition:all 0.2s; white-space:nowrap;">
                        🔊 朗读
                    </button>
                    <button class="g-icon-btn" onclick="window.copyElementToClipboard('${tempId}', this)" title="复制全部文本" style="width:28px; height:28px;">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                    <button class="g-icon-btn" onclick="window.exportChatAsHtml(document.getElementById('${tempId}').value)" title="导出为极客网页版" style="width:28px; height:28px;">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    </button>
                </div>
            `;

            if (!isHistory) {
                const ttsToggle = document.getElementById('tts-toggle');
                if (ttsToggle && ttsToggle.checked) {
                    setTimeout(() => { const btn = row.querySelector('.tts-play-btn'); window.toggleMessageTTS(tempId, btn); }, 500);
                }
            }
        }
        
        messageBody += `</div>`;
        const roleIcon = (typeof icons !== 'undefined' && icons[role]) ? icons[role] : (role === 'user' ? '🧑' : '🤖');
        
        if (role === 'ai') {
            // ... (AI 的逻辑保持你现在的不变) ...
            row.innerHTML = `<div class="avatar ai-avatar" style="cursor:pointer; transition: 0.2s;" onclick="document.getElementById('mode-modal').style.display='flex'" title="打开管家控制台">${roleIcon}</div>${messageBody}`;
            row.addEventListener('mouseenter', () => { const actions = row.querySelector('.message-actions'); if (actions) actions.style.opacity = '1'; });
            row.addEventListener('mouseleave', () => { const actions = row.querySelector('.message-actions'); if (actions) actions.style.opacity = '0.3'; });
        } else {
            // ✅ 修复 2：使用现成的 rawTextSafe 结合 safeJsString，彻底杜绝单双引号和括号引发的 HTML 截断崩溃
            const finalSafeText = safeJsString(rawTextSafe);
            
            // ✅ 修复 1：将 messageBody 放在前面，由于 row-reverse 的作用，这样气泡才会靠最右，菜单在气泡左侧
            row.innerHTML = `
                ${messageBody}
                <div class="user-msg-actions" onclick="this.classList.toggle('show-mobile')">
                    <button class="user-action-btn" onclick="window.editUserMessage('${finalSafeText}')" title="修改并放回输入框">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="user-action-btn" onclick="window.copyTextToClipboard('${finalSafeText}', this)" title="复制这段文字">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                </div>
            `;
        }

        chatBox.appendChild(row);
        if(!isHistory) window.scrollToBottom(); 
        return row; 
    };

// 🟢 新增代码 (全局函数注册)
window.editUserMessage = function(rawText) {
    // 阻止事件冒泡导致气泡的各种其他点击事件被误触
    if (event) event.stopPropagation();
    
    // 寻找输入框 (按照你的代码，ID 应为 chat-input)
    const inputArea = document.getElementById('chat-input');
    
    if (inputArea) {
        // 回填文字 (将之前转义的换行符还原回来)
        inputArea.value = rawText.replace(/\\n/g, '\n');
        
        // 自动获得光标焦点
        inputArea.focus();
        
        // 触发自适应高度调整 (调用现有的逻辑)
        inputArea.style.height = 'auto';
        inputArea.style.height = (inputArea.scrollHeight) + 'px';
        
        // 可选：将视窗平滑滚动到输入框位置
        if (typeof window.scrollToBottom === 'function') {
            window.scrollToBottom();
        }
    } else {
        console.error("未找到 ID 为 chat-input 的输入节点");
    }
};


    const btnUpload = document.getElementById('btn-upload');
    if (btnUpload) {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.multiple = true; 
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);

        btnUpload.addEventListener('click', () => { fileInput.click(); });

        fileInput.addEventListener('change', async (e) => {
            const files = e.target.files;
            if (!files.length) return;

            if (!window.currentChatId) {
                const domName = document.getElementById('sidebar-logo-text') ? document.getElementById('sidebar-logo-text').innerText : "默认频道";
                const res = await fetch('/api/chats', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        first_message: '上传资料集合', 
                        is_temp: window.isTempMode,
                        domain_id: window.currentDomain,
                        domain_name: domName
                    })
                });
                const json = await res.json();
                window.currentChatId = String(json.data.id);
                if (!window.isTempMode) await fetchAndRenderChats();
            }

            const originalIcon = btnUpload.innerHTML;
            btnUpload.innerHTML = '<span style="font-size: 0.8rem; color: #aaa;">⏳...</span>';
            
            for(let i=0; i<files.length; i++) {
                const formData = new FormData();
                formData.append('file', files[i]);
                try {
                    const res = await fetch(`/api/chats/${window.currentChatId}/upload`, { method: 'POST', body: formData });
                    if (res.ok) {
                        const data = await res.json();
                        window.stagedImages.push(data.url); 
                        if (typeof updateStagingArea === 'function') updateStagingArea();         
                    }
                } catch (err) { console.error("资料上传失败", err); }
            }
            btnUpload.innerHTML = originalIcon;
            fileInput.value = ''; 
        });
    }

    chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); window.handleSend(); } });
    document.getElementById('btn-send')?.addEventListener('click', () => window.handleSend());

    document.getElementById('history-list')?.addEventListener('click', async (e) => {
        const moreBtn = e.target.closest('.more-btn');
        if (moreBtn) {
            e.stopPropagation();
            document.querySelectorAll('.item-menu.show').forEach(menu => { if (menu !== moreBtn.nextElementSibling) menu.classList.remove('show'); });
            moreBtn.nextElementSibling.classList.toggle('show');
            return;
        }
        const historyItem = e.target.closest('.history-item');
        if (historyItem && !e.target.closest('.item-menu')) {
            const targetId = historyItem.dataset.id;
            if (String(window.currentChatId) !== String(targetId)) await loadChatMessages(targetId);
            if(window.innerWidth <= 900) closeSidebars();
        }
    });

    document.addEventListener('click', () => { document.querySelectorAll('.item-menu.show').forEach(m => m.classList.remove('show')); });
}

window._abortController = null;

class TypingIndicator {
    constructor(container) {
        this.container = container;
        this.interval = null;
    }
    start() {
        // 💡 V21.0 Gemini 风格静默加载动画
        this.container.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px; color:#c4c7c5; font-size:0.85rem; padding: 4px 0; margin-bottom: 8px;">
                <span style="font-size:1.1rem; animation: pulse-cruise 1.5s infinite;">✨</span>
                <span style="background: linear-gradient(90deg, #c4c7c5 0%, #fff 50%, #c4c7c5 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: pulse-queue 2s infinite;">正在唤醒...</span>
            </div>
        `;
    }
    stop() {
        if (this.interval) clearInterval(this.interval);
        this.container.innerHTML = '';
    }
}

window.handleSend = async (autoText = null, autoImages = null, isSystemInit = false) => {
    if (window._isSending) return; 

    // 💡 厂长开始发新消息了，立刻让上一条语音闭嘴，切断排队列车！
    if (typeof window.stopAllTts === 'function') window.stopAllTts();

    const chatInput = document.getElementById('chat-input');
    const chatBox = document.getElementById('chat-box');
    const sendBtn = document.getElementById('btn-send');
    
    let text = autoText !== null ? autoText : chatInput.value.trim();
    
    if (window.workflowContext && window.workflowContext.length > 1500) {
        window.workflowContext = "【前置历史已折叠】...\n" + window.workflowContext.slice(-1500);
    }
    // ==========================================

    const currentInputImages = autoImages !== null ? autoImages : [...window.stagedImages];
    
    if (!text && currentInputImages.length === 0 && (!window.activeWorkflow || window.pendingNodes.length === 0)) return;

    if (autoText === null && text === window._lastSentText && currentInputImages.length === 0) {
        chatInput.value = ''; 
        chatInput.style.height = 'auto';
        return; 
    }

    let safeSystemContextPrefix = "";
    if (window.currentDomain) {
        safeSystemContextPrefix = `【系统底层广播：您当前正处于专属作业频道 [${window.currentDomain}]，严禁重复推荐开辟频道】\n`;
    }

    window._isSending = true; 
    if (autoText === null && !isSystemInit) window._lastSentText = text; 
    
    if (autoText === null) {
        chatInput.value = '';
        chatInput.style.height = 'auto';
    }

    if (sendBtn) {
        sendBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" style="color:#ff6b6b; width:18px; height:18px;"><rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect></svg>`;
        sendBtn.onclick = () => {
            if (window._abortController) {
                window._abortController.abort();
                window._abortController = null;
            }
        };
    }

    try {
        if (!window.currentChatId) {
            const domName = document.getElementById('sidebar-logo-text') ? document.getElementById('sidebar-logo-text').innerText : "默认频道";
            const res = await fetch('/api/chats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    first_message: text || "开启系统交流", 
                    is_temp: window.isTempMode,
                    domain_id: window.currentDomain,
                    domain_name: domName
                })
            });
            const json = await res.json();
            window.currentChatId = String(json.data.id);
            localStorage.setItem('last_valid_chat_id', window.currentChatId);
            await fetchAndRenderChats();
        }
        
        if (autoText === null && autoImages === null && !isSystemInit) {
            if (text || currentInputImages.length > 0) {
                let msgHtml = text ? text : '';
                if (currentInputImages.length > 0) {
                    msgHtml += `<div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:8px;">${currentInputImages.map(url => `<img src="${url}" style="height:100px; border-radius:6px; object-fit:cover;">`).join('')}</div>`;
                }
                window.appendMessage('user', msgHtml);
                await fetch(`/api/chats/${window.currentChatId}/messages`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'user', text: msgHtml })
                });
            }
        } else if (isSystemInit) {
            let sysHtml = `
                <div style="background:rgba(255,183,77,0.05); border-left:3px solid #ffb74d; padding:12px; border-radius:6px; color:#ccc; font-size:0.85rem; font-family:monospace; margin-bottom:10px;">
                    <b style="color:#ffb74d; font-size:0.9rem;">[📡 系统底层引渡协议已触发]</b><br><br>
                    ${escapeHtml(autoText).replace(/\n/g, '<br>')}
                </div>`;
            window.appendMessage('user', sysHtml);
            await fetch(`/api/chats/${window.currentChatId}/messages`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'user', text: sysHtml })
            });
        }

        const allImagesForAI = [...window.contextImages, ...currentInputImages];
        if (autoImages === null) {
            window.stagedImages = [];
            if(typeof updateStagingArea === 'function') updateStagingArea();
        }

        // 💡 核心改动：获取当前激活的大脑 (接待员 or 管家)
        const iqModeSelector = document.getElementById('iq-mode-selector');
        const currentIqMode = iqModeSelector ? iqModeSelector.value : 'ai_receptionist'; 
        const uiMode = localStorage.getItem('butler_ui_mode') || 'simple';

        if (!window.activeWorkflow) {
            
            try {
                const wfRes = await fetch('/api/config/workflows');
                const workflows = await wfRes.json();
                
                // V12.0 强制指派选中模型，不再走旧的 default 逻辑
                let targetModelId = currentIqMode; 
                let selectedVendors = targetModelId ? [targetModelId] : [];

                // 🛡️ 核心补丁 2：控制系统级变量膨胀，防止长期运行拖慢首包响应
                const wfNames = Object.entries(workflows)
                    .filter(([id, wf]) => wf.domain_id === window.currentDomain)
                    .slice(0, 5) // 🚨 物理截断：只给大模型提供最多 5 个最相关的流水线
                    .map(([id, wf]) => `ID: "${id}", 研发流名称: "${wf.name}"`)
                    .join("\n");
                
                const existingDomainsStr = (window.domainList || [])
                    .slice(0, 5) // 🚨 物理截断：只提供最近的 5 个频道，避免套娃
                    .map(d => `- ID: ${d.id}, 领域名称: ${d.name}`)
                    .join("\n");

                // 💡 动态拼装 Router Prompt
                // 如果当前是【接待员】，她的职责是寒暄 + 分配频道 + 推荐挂载/建流
                let dynamicVariables = `
【系统运行时变量注入 (供底层 SOP 读取)】
CURRENT_DOMAIN: [${window.currentDomain || '无'}]
EXISTING_DOMAINS:
${existingDomainsStr || '暂无其他频道'}
AVAILABLE_WORKFLOWS:
${wfNames || '暂无可用流水线'}
`.trim();

                if (window.workflowContext && window.workflowContext.length > 3000) {
                    console.warn("⚠️ 监测到前置上下文过载，触发物理截断。");
                    window.workflowContext = "【历史决策过长，已物理截断】...\n" + window.workflowContext.slice(-3000);
                }

                let userInputStr = text;
                if (!userInputStr && currentInputImages.length > 0) {
                    userInputStr = "【用户上传了图片/截图】请查收。";
                }

                // 🔪 补丁 2：发送前强制洗屏：剔除用户不可见的 forge_entity 原码，斩断幽灵 Token
                userInputStr = userInputStr.replace(/<forge_entity>[\s\S]*?<\/forge_entity>/gi, "\n[⚙️ 实体代码已落盘，为防止 Token 爆炸，系统已在此自动截断]\n");
                
                const baseInput = safeSystemContextPrefix + userInputStr;
                const enhanced_input = window.workflowContext ? `【前置上下文】:\n${window.workflowContext}\n\n【厂长最新指令】:\n${baseInput}` : baseInput;

                // 🛡️ 核心补丁 3：Token 哨兵 (超长指令拦截)
                const payloadSize = (enhanced_input || "").length + (dynamicVariables || "").length;
                if (payloadSize > 5000) {
                    if (!confirm(`🚀 指令过长（约 ${payloadSize} 字），可能导致 Token 爆炸。\n\n确定继续？(建议取消并精简需求)`)) {
                        window._isSending = false;
                        window._abortController = null;
                        if (sendBtn) {
                            sendBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
                            sendBtn.onclick = () => window.handleSend();
                        }
                        if (chatInput) chatInput.disabled = false;
                        return; // 物理阻断发送
                    }
                }

                const nodePayload = {
                    chat_id: window.currentChatId,
                    step_title: "管家交流",
                    instruction: dynamicVariables, 
                    user_input: enhanced_input || "请分析。",
                    vendors: selectedVendors, 
                    deliver_type: "text_comm",
                    images: allImagesForAI,
                    domain_id: window.currentDomain || "factory_dev" 
                };

                window._abortController = new AbortController();
                
                const streamRow = document.createElement('div');
                streamRow.className = `message-row row-ai`;
                // 💡 动态获取图标：精准剥离 [💻 CLI] 前缀引擎装甲，提取纯净的 Emoji 心智核心
                let aiIcon = '🤖';
                if (iqModeSelector && iqModeSelector.options[iqModeSelector.selectedIndex]) {
                    const optionText = iqModeSelector.options[iqModeSelector.selectedIndex].text;
                    const parts = optionText.split(']'); // 寻找右括号切分
                    if (parts.length > 1) {
                        // 如果有括号，取括号后面的那一部分，干掉开头空格，再取第一个字符
                        aiIcon = parts[1].trim().split(' ')[0]; 
                    } else {
                        // 如果是没装甲的旧版名字，直接取
                        aiIcon = optionText.split(' ')[0]; 
                    }
                }

                streamRow.innerHTML = `
                    <div class="avatar ai-avatar">${aiIcon}</div>
                    <div class="message-content" style="width: 100%;">
                         <div id="typing-indicator" style="margin-bottom: 5px;"></div>
                         <div id="content-payload"></div>
                    </div>
                `;
                chatBox.appendChild(streamRow);
                window.scrollToBottom();
                
                const indicatorDiv = streamRow.querySelector('#typing-indicator');
                const contentDiv = streamRow.querySelector('#content-payload');
                
                const typer = new TypingIndicator(indicatorDiv);
                typer.start(); 

                const response = await fetch('/api/workflow/stream', {
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify(nodePayload),
                    signal: window._abortController.signal
                });
                
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                const reader = response.body.getReader();
                const decoder = new TextDecoder('utf-8');
                let fullAnswer = "";
                let buffer = "";
                let hasReceivedFirstChunk = false;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    buffer += decoder.decode(value, { stream: true });
                    let boundary = buffer.indexOf('\n\n');
                    while (boundary !== -1) {
                        const line = buffer.slice(0, boundary).trim();
                        buffer = buffer.slice(boundary + 2);
                        boundary = buffer.indexOf('\n\n');
                        
                        // 💡 这里就是被不小心删掉的解析逻辑，现在全部补齐了！
                        if (line.startsWith('data: ')) {
                            const dataStr = line.slice(6);
                            if (dataStr === '[DONE]') break;
                            try {
                                const parsed = JSON.parse(dataStr);
                                if (parsed.chunk) {
                                    // 🛡️ Ouroboros 流式物理防线：拦截故障协议，禁止渲染到对话框
                                    if (parsed.chunk.startsWith("Ouroboros::") || fullAnswer.startsWith("Ouroboros::")) {
                                        fullAnswer += parsed.chunk; 
                                        // 只要积攒的文本确认是以 Ouroboros 开头，则保持静默，不触发打字机
                                        continue; 
                                    }

                                    if (!hasReceivedFirstChunk) {
                                        typer.stop(); 
                                        hasReceivedFirstChunk = true;
                                        window._ttsBuffer = ""; // 💡 初始化流式语音缓冲池
                                    }
                                    fullAnswer += parsed.chunk;

                                    // 👇 核心：流式 TTS 标点切割器 (如果右上角 TTS 开关开启)
                                    const ttsToggle = document.getElementById('tts-toggle');
                                    if (ttsToggle && ttsToggle.checked) {
                                        window._ttsBuffer += parsed.chunk;
                                        // 侦测句号、感叹号、问号、分号或回车
                                        const sentenceMatch = window._ttsBuffer.match(/(.*?[。！？；!?; \n]+(?:\n+)?)/);
                                        if (sentenceMatch) {
                                            const sentence = sentenceMatch[1];
                                            window._ttsBuffer = window._ttsBuffer.substring(sentence.length); 
                                            window.enqueueStreamTTS(sentence); // 扔进发声工厂
                                        }
                                    }

                                    // 👇 V19.2 流式动态断头台：拦截正在打字过程中的裸露 HTML
                                    let safeDisplayAnswer = fullAnswer;
                                    
                                    // 1. 处理已经闭合的标签
                                    safeDisplayAnswer = safeDisplayAnswer.replace(/<forge_entity>[\s\S]*?<\/forge_entity>/gi, 
                                        '<div style="background:rgba(0,0,0,0.4); color:#20c997; padding:6px 12px; border-radius:6px; font-size:0.75rem; margin:10px 0; border:1px solid #20c997; display:inline-block;">✅ [物理机床]：实体代码已落盘，系统视觉屏蔽生效。</div>'
                                    );
                                    
                                    // 2. 致命拦截：处理正在流式输出、还没闭合的标签
                                    const fIdx = safeDisplayAnswer.toLowerCase().indexOf('<forge_entity>');
                                    if (fIdx !== -1) {
                                        safeDisplayAnswer = safeDisplayAnswer.substring(0, fIdx) + 
                                            '\n\n<div style="background:rgba(0,0,0,0.4); color:#ffb74d; padding:6px 12px; border-radius:6px; font-size:0.75rem; margin:10px 0; border:1px dashed #ffb74d; display:inline-block; animation: pulse-queue 1.5s infinite;">⚙️ [机床高压作业中]：正在源源不断灌入 HTML 源码，为防页面崩塌，视觉已强行熔断...</div>';
                                    }

                                    // 👇 V21.1 修复版：流式双向感知（确保不吃掉第一个字）
                                    if (!hasReceivedFirstChunk && safeDisplayAnswer.trim().length > 0) {
                                        typer.stop(); // 只要有任何实质字符输出，立刻杀掉 Initializing 动画
                                        hasReceivedFirstChunk = true;
                                    }

                                    let textToRender = safeDisplayAnswer;
                                    const firstBrace = textToRender.indexOf('{');
                                    const lastBrace = textToRender.lastIndexOf('}');
                                    
                                    // 检查是否正在输出结构化思考 JSON
                                    let isJsonStreaming = false;
                                    if (firstBrace !== -1) {
                                        // 如果只有左括号，或者最后的括号还没赶上开始的括号
                                        if (lastBrace <= firstBrace) {
                                            isJsonStreaming = true;
                                        } else {
                                            // 即使有了一对括号，如果解析失败，也说明 JSON 还没吐完
                                            try {
                                                JSON.parse(textToRender.substring(firstBrace, lastBrace + 1));
                                                isJsonStreaming = false; // 解析成功，塌缩引擎可以接管了
                                            } catch(e) {
                                                isJsonStreaming = true;
                                            }
                                        }
                                    }
                                    
                                    if (isJsonStreaming) {
                                        // 💡 关键：保留 JSON 之前的正文，仅遮蔽正在生成的代码块
                                        const preJsonText = textToRender.substring(0, firstBrace);
                                        textToRender = preJsonText + 
                                            `<div style="background:rgba(255,255,255,0.03); border:1px solid #333; border-radius:10px; padding:12px; margin:10px 0; display:flex; align-items:center; gap:12px; color:#c4c7c5; font-size:0.85rem;">
                                                <span style="font-size:1.2rem; animation: pulse-cruise 1.5s infinite;">🧠</span> 
                                                <div style="flex:1;">
                                                    <div style="font-weight:bold; color:#fff; margin-bottom:2px;">Thinking...</div>
                                                    <div style="font-size:0.75rem; opacity:0.6; font-family:monospace; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                                                        ${escapeHtml(textToRender.substring(firstBrace))}
                                                    </div>
                                                </div>
                                             </div>`;
                                    }

                                    // 使用修正后的逻辑进行渲染
                                    contentDiv.innerHTML = parseMessageContent(textToRender) + '<span class="cursor-blink" style="color:var(--accent-color);">▋</span>';
                                    window.scrollToBottom();
                                }
                            } catch(e) {}
                        }
                    }
                }
                
                typer.stop();

                // 👇 【新增】：触发 Ouroboros 弹舱 👇
                if (fullAnswer.startsWith("Ouroboros::")) {
                    try {
                        // 🛡️ 补丁 4：Ouroboros 死循环防线 (最大连续重试3次)
                        window._ouroborosRetryCount = (window._ouroborosRetryCount || 0) + 1;
                        if (window._ouroborosRetryCount > 3) {
                            alert("💥 致命中断：该节点已连续报错超 3 次，底层逻辑已死锁！\n系统已强行切断自动重试，请厂长人工排查问题。");
                            window._ouroborosRetryCount = 0;
                            window._isSending = false;
                            window._abortController = null;
                            if (sendBtn) {
                                sendBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
                                sendBtn.onclick = () => window.handleSend();
                            }
                            streamRow.remove();
                            return; // 强行中断
                        }

                        const errorData = JSON.parse(fullAnswer.replace("Ouroboros::", ""));
                        console.error("🚨 侦测到机床逃逸，触发自检协议！", errorData);
                        
                        // 移除那个正在打字的假消息行，不让它污染对话框
                        streamRow.remove();
                        
                        // 触发全局弹舱
                        if (typeof triggerOuroborosProtocol === "function") {
                            triggerOuroborosProtocol(window.activeWorkflowId || "未知工作流", errorData);
                        }
                        
                        // 物理阻断，不把报错存入数据库
                        window._isSending = false;
                        window._abortController = null;
                        if (sendBtn) {
                            sendBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
                            sendBtn.onclick = () => window.handleSend();
                        }
                        return; // 直接中止函数执行
                    } catch(e) {
                        console.error("解析 Ouroboros 协议失败:", e);
                    }
                }
                // 👆 【新增结束】 👆

                // 💡 冲刷最后残余的句子 (流结束时，把没说完的半句话发去朗读)
                const ttsToggle = document.getElementById('tts-toggle');
                if (ttsToggle && ttsToggle.checked && window._ttsBuffer && window._ttsBuffer.trim()) {
                    window.enqueueStreamTTS(window._ttsBuffer);
                }
                
                if (fullAnswer.includes("<hr")) fullAnswer = fullAnswer.split(/<hr[^>]*>/).pop().trim();
                
                window._ouroborosRetryCount = 0; // ✅ 成功响应，重置容错计数器

                streamRow.querySelector('.message-content').innerHTML = parseMessageContent(fullAnswer);

                await fetch(`/api/chats/${window.currentChatId}/messages`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'ai', text: fullAnswer })
                });

                window.workflowContext = ""; 
                window.contextImages = [];
                
                if (typeof window.extractAssets === 'function') window.extractAssets(); 
                if (typeof window.extractMemory === 'function') window.extractMemory(); 
                window.scrollToBottom();

                if (uiMode === 'simple') {
                    const mountMatch = fullAnswer.match(/```json\s*(\{[\s\S]*?action[\s\S]*?mount[\s\S]*?workflow_id[\s\S]*?\})\s*```/);
                    if (mountMatch) {
                        try {
                            const actionObj = JSON.parse(mountMatch[1]);
                            const targetWfId = actionObj.workflow_id;
                            window._pendingAutoMountData = { wfId: targetWfId, text: text, images: currentInputImages };

                            if (targetWfId && window._cachedWorkflows && window._cachedWorkflows[targetWfId]) {
                                const targetWf = window._cachedWorkflows[targetWfId];
                                await window.selectAndLockWorkflow(targetWfId, targetWf);
                                
                                setTimeout(async () => {
                                    const startReq = {
                                        chat_id: window.currentChatId,
                                        workflow_id: targetWfId,
                                        start_nodes: window.pendingNodes,
                                        user_input: text || "极简模式全自动授权触发",
                                        image_urls: allImagesForAI
                                    };
                                    try {
                                        await fetch('/api/workflow/start_background', {
                                            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(startReq)
                                        });
                                        
                                        const safeUserReq = safeJsString(window._lastSentText || "");
                                        const offlineMsg = `<div style="background:rgba(76, 175, 80, 0.05); border-left:3px solid #4caf50; padding:12px; border-radius:6px; color:#ccc; font-size:0.85rem; font-family:monospace; margin-top:10px;">
                                            <b style="color:#4caf50; font-size:0.9rem;">✅ 厂长，任务已移交黑灯工厂！</b><br><br>
                                            您可以放心离开屏幕，管家会在后台独立完成【${safeUserReq}】的推进。
                                        </div>`;
                                        window.appendMessage('ai', offlineMsg);
                                        await fetch(`/api/chats/${window.currentChatId}/messages`, {
                                            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'ai', text: offlineMsg })
                                        });

                                        let eta = null;
                                        if (typeof window.getWorkflowETA === 'function') {
                                            eta = window.getWorkflowETA(targetWfId, window.pendingNodes.length);
                                        }
                                        if(typeof window.startWorkflowPolling === 'function') window.startWorkflowPolling(eta); 
                                    } catch(e) {}
                                }, 500);
                            }
                        } catch(e) {}
                    }
                } else {
                    const mountMatchForDev = fullAnswer.match(/```json\s*(\{[\s\S]*?action[\s\S]*?mount[\s\S]*?workflow_id[\s\S]*?\})\s*```/);
                    if (mountMatchForDev) {
                        try {
                            const actionObj = JSON.parse(mountMatchForDev[1]);
                            window._pendingAutoMountData = { wfId: actionObj.workflow_id, text: text, images: currentInputImages };
                        } catch (e) {}
                    }
                }

            } catch (e) {
                if (e.name === 'AbortError') {
                    window.appendMessage('ai', "<span style='color:#ffb74d'>【用户阻断】：厂长已强行切断大模型脑波。</span>");
                } else {
                    console.error("请求大模型崩溃：", e);
                    window.appendMessage('ai', "<span style='color:#ff6b6b'>【系统提示】：管家与算力节点失联，请检查网络。</span>");
                }
            } finally {
                window._abortController = null;
            }

        } else {
            // ==========================================
            // 💡 厂长已挂载工作流：强行拦截对话，直接移交黑灯工厂！
            // ==========================================
            
            // 👇 1. 物理阻断当前所有的流式渲染与输入框
            if (window._abortController) window._abortController.abort();
            chatInput.disabled = true;
            
            // 👇 2. 部署极具军工科技感的全息舱，并打上专属 ID
            const gRow = document.createElement('div');
            gRow.id = 'global-thinking-row';
            gRow.className = 'message-row row-ai';
            gRow.innerHTML = `
                <div class="avatar ai-avatar" style="animation: pulse-cruise 2s infinite;">🤖</div>
                <div class="message-content" style="width: 100%; background: rgba(168,199,250,0.05); border: 1px solid rgba(168,199,250,0.2); border-radius: 8px; padding: 12px; box-shadow: 0 0 15px rgba(168,199,250,0.1);">
                    <span style="color:#a8c7fa; font-size:1.05rem; font-weight:bold;">🚀 正在将厂长指令推入黑灯工厂底层链路...</span>
                </div>
            `;
            chatBox.appendChild(gRow);
            window.scrollToBottom();

            // 👇 3. 如果之前的图纸已经跑到尽头，则重置游标，准备循环执行
            if (window.pendingNodes.length === 0 && window.completedNodes.length > 0) {
                window.completedNodes = [];
                const edges = window.activeWorkflow.data.edges || [];
                const allTargets = new Set(edges.map(e => e.target));
                window.pendingNodes = window.activeWorkflow.data.nodes.filter(n => !allTargets.has(n.id)).map(n => n.id);
                
                if(typeof window.renderWorkflowProgress === 'function') window.renderWorkflowProgress(); 
                
                // 悄悄通知后端重置状态
                await fetch(`/api/chats/${window.currentChatId}/workflow`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ workflow_id: window.activeWorkflowId, completed_nodes: [], pending_nodes: window.pendingNodes, system_status: 'IDLE' })
                });
            }

            const nodesToExecute = window.activeWorkflow.data.nodes.filter(n => window.pendingNodes.includes(n.id));
            if (nodesToExecute.length === 0) return;

            // 👇 4. 组装发送给黑灯工厂后台的“绝密包裹”
            const startReq = {
                chat_id: window.currentChatId,
                workflow_id: window.activeWorkflowId,
                start_nodes: nodesToExecute.map(n => n.id),
                user_input: text || window.workflowContext || "厂长下达继续切削指令",
                image_urls: allImagesForAI
            };

            try {
                // 👇 5. 点火！发送给后台隔离容器
                const startRes = await fetch('/api/workflow/start_background', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(startReq)
                });
                
                if (!startRes.ok) throw new Error("引擎点火失败");

                // 👇 6. 点火成功，立刻启动前端的“状态机雷达探头”
                let eta = null;
                if (typeof window.getWorkflowETA === 'function') {
                    eta = window.getWorkflowETA(window.activeWorkflowId, nodesToExecute.length);
                }
                if (typeof window.startWorkflowPolling === 'function') {
                    window.startWorkflowPolling(eta); 
                }

                // 🛡️ 图片上下文清理：任务点火成功后，立即释放历史图片引用，防止下一轮 Token 爆炸
                window.contextImages = [];
                window.stagedImages = [];
                if(typeof updateStagingArea === 'function') updateStagingArea();
                
            } catch (e) {
                console.error("后台引擎启动失败:", e);
                window.appendMessage('ai', `<span style="color:#ff6b6b">❌ 物理链路断开：黑灯工厂底层引擎启动失败，系统无法进入脱机作业状态。</span>`, false);
                const badRow = document.getElementById('global-thinking-row');
                if(badRow) badRow.remove();
            } finally {
                chatInput.disabled = false;
                chatInput.focus();
            }
        }
    } finally {
        window._isSending = false;
        if (sendBtn) {
            sendBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
            sendBtn.onclick = () => window.handleSend();
        }
    }
};

async function fetchAndRenderChats() {
    try {
        const res = await fetch('/api/chats');
        const json = await res.json();
        const chats = json.data;
        const listUl = document.getElementById('history-list');
        if (!listUl) return; 
        listUl.innerHTML = '';
        if (chats && chats.length > 0) {
            chats.forEach(chat => {
                const li = document.createElement('li');
                li.className = `history-item ${String(chat.id) === String(window.currentChatId) ? 'active' : ''}`;
                li.dataset.id = chat.id;
                li.innerHTML = `
                    <span class="item-text">${chat.title}</span>
                    <button class="more-btn"><svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></button>
                    <div class="item-menu">
                        <div class="menu-action" onclick="window.triggerRename('${chat.id}')">修改名称</div>
                        <div class="menu-action delete" onclick="window.triggerDelete('${chat.id}')">彻底删除</div>
                    </div>
                `;
                listUl.appendChild(li);
            });
            if (!window.currentChatId && !window.isTempMode) await loadChatMessages(chats[chats.length - 1].id);
        }
    } catch (e) {}
}

async function loadChatMessages(id) {
    if(typeof window.stopWorkflowPolling === 'function') window.stopWorkflowPolling(false);
    window.currentChatId = String(id);
    window.isTempMode = window.currentChatId.startsWith('temp_');
    localStorage.setItem('last_valid_chat_id', window.currentChatId); 
    if(typeof clearStaging === 'function') clearStaging(); 
    
    document.querySelectorAll('.history-item').forEach(li => { li.classList.toggle('active', li.dataset.id === window.currentChatId); });
    const chatBox = document.getElementById('chat-box');
    chatBox.innerHTML = '';
    
    try {
        const res = await fetch(`/api/chats/${id}`);
        const json = await res.json();
        const chatData = json.data; 
        
        if (chatData.domain_id) {
            if (window.domainList && !window.domainList.find(d => d.id === chatData.domain_id)) {
                const recoveredName = chatData.domain_name || "恢复频道_" + chatData.domain_id.slice(-4);
                window.domainList.push({ id: chatData.domain_id, name: recoveredName });
                if (typeof window.saveDomainsToStorage === 'function') window.saveDomainsToStorage();
                if (typeof window.renderDomainSelector === 'function') window.renderDomainSelector();
            }

            if (chatData.domain_id !== window.currentDomain) {
                if (typeof window.switchDomain === 'function') {
                    window.switchDomain(chatData.domain_id, true); 
                    const sel = document.getElementById('domain-selector');
                    if (sel) sel.value = chatData.domain_id;
                }
            }
        }
        
        // 🧠 修复黑洞三：遍历历史消息时，把 msg.thoughts 传递给前端渲染器
        chatData.messages.forEach(msg => window.appendMessage(msg.role, msg.text, false, true, msg.timestamp, msg.thoughts));
        window.lastMessageCount = chatData.messages.length; 
        
        chatBox.scrollTop = chatBox.scrollHeight;
        if(typeof window.syncWorkflowUI === 'function') await window.syncWorkflowUI(chatData);
        if (typeof window.extractAssets === 'function') window.extractAssets(); 
        if (typeof window.extractMemory === 'function') window.extractMemory(); 
        
        if (chatData.system_status === 'RUNNING' && typeof window.startWorkflowPolling === 'function') {
            if (typeof window.showThinkingAnimation === 'function') {
                window.showThinkingAnimation('管家正在后台推演...');
            }
            window.startWorkflowPolling(); 
        }
    } catch (e) {}
}

window.initNewChatUI = function(isTemp) {
    if(typeof window.stopWorkflowPolling === 'function') window.stopWorkflowPolling(false);
    window.currentChatId = null;
    window.isTempMode = isTemp;
    window.activeWorkflowId = null;
    window.activeWorkflow = null;
    window.completedNodes = [];
    window.pendingNodes = [];
    localStorage.removeItem('last_valid_chat_id'); 
    
    document.getElementById('chat-box').innerHTML = '';
    document.querySelectorAll('.history-item').forEach(li => li.classList.remove('active'));
    
    if(typeof clearStaging === 'function') clearStaging();
    if(typeof window.syncWorkflowUI === 'function') window.syncWorkflowUI({ attached_workflow: null, completed_nodes: [], pending_nodes: [] });
    
    const modeText = isTemp ? "无痕沙盒模式" : "全新记忆沉淀";
    window.appendMessage('ai', `🔄 已为您开启 **${modeText}**，管家随时听候差遣。`);
};

window.triggerRename = async function(id) {
    const newName = prompt("请输入新的项目名称：");
    if (newName && newName.trim() !== "") {
        await fetch(`/api/chats/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ first_message: newName.trim() })
        });
        await fetchAndRenderChats();
    }
};

window.triggerDelete = async function(id) {
    if (confirm("提示：将彻底清空该项目记录及底层关联代码文件！不可恢复！")) {
        await fetch(`/api/chats/${id}`, { method: 'DELETE' });
        if (String(window.currentChatId) === String(id)) {
             window.currentChatId = null; 
             localStorage.removeItem('last_valid_chat_id');
        }
        await fetchAndRenderChats();
    }
};

// ==========================================
// 👇👇👇 厂长手动缝合区：底层雷达刹车引擎 👇👇👇
// ==========================================
window.abortGeneration = async function(isKill = false) {
    if (!window.currentChatId) return;
    
    // 默认走精确点刹 (stop)，如果传参 isKill=true 则走物理斩杀 (kill)
    const action = isKill ? 'kill' : 'stop';
    const actionName = isKill ? '物理斩杀' : '精确点刹';
    
    if (isKill && !confirm(`⚠️ 紧急制动警告：\n系统将向沙盒发送高维物理斩杀指令 (SIGKILL)！\n该任务的本次推演记忆将被全部焚毁！确定切断？`)) return;
    
    try {
        // 兼容雷达直连与 Nginx 代理，完美对接底层 8999 端口
        const radarHost = window.location.hostname;
        const stopUrl = window.location.protocol === 'https:' 
            ? `/api/radar/${action}?task=${window.currentChatId}` 
            : `http://${radarHost}:8999/${action}?task=${window.currentChatId}`;
        
        // 发送物理截断指令 (静默捕获异常防止前端报错)
        fetch(stopUrl).catch(e => console.warn("雷达指令发送状态:", e));
        
        // 渲染黑板视觉反馈
        if (typeof window.appendMessage === 'function') {
            window.appendMessage('system', `🛑 [系统强制介入]：已向底层沙盒投掷 **${actionName}** 指令。星门连接已阻断。`);
        }
        
        // 强行恢复输入框与发送按钮的物理状态
        window._isSending = false;
        const sendBtn = document.getElementById('send-btn');
        const stopBtn = document.getElementById('stop-btn'); // 适配您的停止按钮 ID
        
        if (sendBtn) { 
            sendBtn.disabled = false; 
            sendBtn.innerHTML = '发送指令 <kbd>Enter</kbd>'; 
        }
        if (stopBtn) { 
            stopBtn.style.display = 'none'; 
        }
    } catch(e) {
        console.error(`发送 ${actionName} 指令失败:`, e);
    }
};

// 💡 兜底防线：确保回车键发送指令的监听器在页面最后成功挂载
document.addEventListener('DOMContentLoaded', () => {
    const inputEl = document.getElementById('chat-input');
    if(inputEl) {
        inputEl.addEventListener('keypress', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (typeof window.handleSend === 'function') {
                    window.handleSend();
                }
            }
        });
    }
});