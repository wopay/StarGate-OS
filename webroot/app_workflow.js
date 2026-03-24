// [webroot/app_workflow.js] - 工作流调度、状态机轮询、后台异步引渡管理 (V20.0 PRO全域贯通满功率版)

// ==========================================
// 💡 V6.7 核心升级 1：时空沙漏 (诚实预估引擎)
// ==========================================
window.getWorkflowETA = function(wfId, nodesCount) {
    try {
        let stats = JSON.parse(localStorage.getItem('wf_time_stats') || '{}');
        if (stats[wfId]) return stats[wfId];
    } catch(e){}
    return null; 
};

window.saveWorkflowTime = function(wfId, seconds) {
    if (!wfId || seconds < 3) return; 
    try {
        let stats = JSON.parse(localStorage.getItem('wf_time_stats') || '{}');
        stats[wfId] = stats[wfId] ? Math.round((stats[wfId] + seconds) / 2) : seconds;
        localStorage.setItem('wf_time_stats', JSON.stringify(stats));
    } catch(e){}
};

// ==========================================
// 💡 V6.7 核心升级 2：全息动态 HUD 监视器 (Gemini 星芒重铸版)
// ==========================================
window._wfCountdown = 0;
window._wfInterval = null;
window._workflowStartTime = null;
window._currentExecutingNodeTitle = "环境初始化";

window.startWorkflowCountdown = function(eta) {
    window._wfCountdown = eta;
    window._workflowStartTime = Date.now();
    if (window._wfInterval) clearInterval(window._wfInterval);

    // 🔥 注入 Gemini 专属星芒动画样式 (防重复注入)
    if (!document.getElementById('gemini-thinking-style')) {
        const style = document.createElement('style');
        style.id = 'gemini-thinking-style';
        style.innerHTML = `
            @keyframes geminiStarSpin {
                0% { transform: rotate(0deg) scale(0.85); filter: drop-shadow(0 0 2px rgba(168,199,250,0.4)); }
                50% { transform: rotate(90deg) scale(1.15); filter: drop-shadow(0 0 8px rgba(216,180,254,0.9)); }
                100% { transform: rotate(180deg) scale(0.85); filter: drop-shadow(0 0 2px rgba(168,199,250,0.4)); }
            }
            .gemini-star-icon {
                animation: geminiStarSpin 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .gemini-thinking-text {
                background: linear-gradient(90deg, #a8c7fa, #d8b4fe);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                font-weight: 600;
                font-size: 1.1rem;
                letter-spacing: 0.5px;
            }
            .gemini-step-track {
                margin-left: 11px; 
                padding-left: 20px; 
                border-left: 2px solid rgba(168, 199, 250, 0.2);
                margin-top: 8px;
            }
        `;
        document.head.appendChild(style);
    }

    // 统一的 HUD 渲染函数
    const renderHUD = (displayTimeStr) => {
        const badgeText = document.getElementById('queue-text');
        if (badgeText) {
            badgeText.innerHTML = `✅ 已引渡至黑灯工厂底层 | 剩余时间 <span style="color:#ffb74d; font-family:'Consolas',monospace;">${displayTimeStr}</span>`;
        }
        
        const thinkingRow = document.getElementById('global-thinking-row');
        if (thinkingRow) {
            const msgContent = thinkingRow.querySelector('.message-content');
            if (msgContent) {
                msgContent.innerHTML = `
                    <div style="display: flex; flex-direction: column;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div class="gemini-star-icon">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 0C12 6.627 17.373 12 24 12C17.373 12 12 17.373 12 24C12 17.373 6.627 12 0 12C6.627 12 12 6.627 12 0Z" fill="url(#gemini-gradient)"/>
                                    <defs>
                                        <linearGradient id="gemini-gradient" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                                            <stop stop-color="#a8c7fa" />
                                            <stop offset="1" stop-color="#d8b4fe" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                            </div>
                            <span class="gemini-thinking-text">黑灯工厂运行中放心离开...</span>
                        </div>
                        
                        <div class="gemini-step-track">
                            <div style="color: #e3e3e3; font-size: 0.9rem; margin-bottom: 5px;">
                                正在切削节点: <span style="color:#d8b4fe; font-weight:bold; background:rgba(216,180,254,0.15); padding:2px 6px; border-radius:4px;">${window._currentExecutingNodeTitle}</span>
                            </div>
                            <div style="color: #888; font-size: 0.8rem;">
                                剩余时间: <span style="color:#ffb74d; font-family: 'Consolas', monospace;">${displayTimeStr}</span> <span class="cursor-blink">▋</span>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
    };

    if (eta === null) {
        renderHUD('首次生产测算中');
        window._wfInterval = setInterval(() => renderHUD('首次生产测算中'), 1000);
        return;
    }

    window._wfInterval = setInterval(() => {
        if (window._wfCountdown > 0) window._wfCountdown--;
        let m = Math.floor(window._wfCountdown / 60).toString().padStart(2, '0');
        let s = (window._wfCountdown % 60).toString().padStart(2, '0');
        let displayTime = window._wfCountdown > 0 ? `${m}:${s}` : '产出收尾中...';
        renderHUD(displayTime);
    }, 1000);
};

window.stopWorkflowCountdown = function() {
    if (window._wfInterval) {
        clearInterval(window._wfInterval);
        window._wfInterval = null;
    }
};

window.startWorkflowPolling = function(eta = null) {
    if (window.workflowPollInterval) clearInterval(window.workflowPollInterval);
    const msgs = document.querySelectorAll('.message-row');
    window.lastMessageCount = msgs.length; 
    window.workflowPollInterval = setInterval(window.pollWorkflowStatus, 2000);
    
    const badge = document.getElementById('queue-badge');
    if (badge) badge.style.display = 'flex';

    window.startWorkflowCountdown(eta);
};

window.stopWorkflowPolling = function(isFinished = false) {
    if (window.workflowPollInterval) {
        clearInterval(window.workflowPollInterval);
        window.workflowPollInterval = null;
    }
    
    window.stopWorkflowCountdown();
    const badge = document.getElementById('queue-badge');
    if (badge) badge.style.display = 'none';

    if (isFinished && window.activeWorkflowId && window._workflowStartTime) {
        let duration = Math.round((Date.now() - window._workflowStartTime) / 1000);
        window.saveWorkflowTime(window.activeWorkflowId, duration);
        window._workflowStartTime = null;
    }
};

window.pollWorkflowStatus = async function() {
    if (!window.currentChatId) return window.stopWorkflowPolling(false);
    try {
        const res = await fetch(`/api/chats/${window.currentChatId}`);
        if (!res.ok) return;
        const json = await res.json();
        const chatData = json.data;

        const messages = chatData.messages || [];
        
        // 🚨 【V23.5 游标自愈防线：彻底粉碎二次调用死锁】
        // 如果前端 DOM 游标（含临时骨架）超前于后端真实数据库，强行降维回滚对齐！
        if (window.lastMessageCount > messages.length) {
            window.lastMessageCount = messages.length;
        }

        if (messages.length > window.lastMessageCount) {
            for (let i = window.lastMessageCount; i < messages.length; i++) {
                if(typeof window.appendMessage === 'function') window.appendMessage(messages[i].role, messages[i].text, false, true, messages[i].timestamp);
            }
            window.lastMessageCount = messages.length;
            if(typeof window.scrollToBottom === 'function') window.scrollToBottom();
            if(typeof window.extractAssets === 'function') window.extractAssets();
            if(typeof window.extractMemory === 'function') window.extractMemory();
        }

        window.completedNodes = chatData.completed_nodes || [];
        window.pendingNodes = chatData.pending_nodes || [];
        
        if (window.activeWorkflow && window.pendingNodes.length > 0) {
            const activeNodeId = window.pendingNodes[0];
            const nObj = window.activeWorkflow.data.nodes.find(n => n.id === activeNodeId);
            if (nObj) window._currentExecutingNodeTitle = nObj.title;
        }

        window.renderWorkflowProgress();

        const status = chatData.system_status || 'IDLE';

        if (status === 'RUNNING') {
            console.log("🛠️ [静默模式] 二厂后台切削中...");
        } else if (status === 'IDLE' || status === 'WAITING_USER' || status === 'STANDBY') {
            if (typeof window.hideThinkingAnimation === 'function') window.hideThinkingAnimation();
        }

        if (status === 'WAITING_USER') {
            window.stopWorkflowPolling(false);
        } else if (status === 'STANDBY') {
            window.stopWorkflowPolling(true);
        } else if (status === 'IDLE') {
            // 🔥 【PRO 装甲 1：粉碎 IDLE 闪退悖论】
            if (window.pendingNodes && window.pendingNodes.length > 0) {
                console.log("🛡️ [系统护卫]：图纸未完工，机床待命中，绝对拦截 UI 闪退抹除指令！");
            } else {
                window.stopWorkflowPolling(true);
                window.activeWorkflowId = null;
                window.activeWorkflow = null;
                window.syncWorkflowUI({ attached_workflow: null });
            }
        }
    } catch(e) {}
};

window.syncWorkflowUI = async function(chatData) {
    const selectionArea = document.getElementById('workflow-selection-area');
    const activeArea = document.getElementById('workflow-active-area');
    if (!selectionArea || !activeArea) return;

    if (chatData.attached_workflow) {
        const res = await fetch('/api/config/workflows');
        const templates = await res.json();
        const wf = templates[chatData.attached_workflow];
        if (wf) {
            window.activeWorkflowId = chatData.attached_workflow; 
            window.activeWorkflow = wf;
            window.completedNodes = chatData.completed_nodes || [];
            window.pendingNodes = chatData.pending_nodes || [];
            selectionArea.style.display = 'none';
            activeArea.style.display = 'block';
            document.getElementById('active-wf-name').innerText = wf.name;
            window.renderWorkflowProgress(); 
            if(typeof window.updateActionBarStatus === 'function') window.updateActionBarStatus();
            return;
        }
    }
    window.activeWorkflow = null;
    selectionArea.style.display = 'block';
    activeArea.style.display = 'none';
    if(typeof window.updateActionBarStatus === 'function') window.updateActionBarStatus();
};

window.initWorkflowSelector = async function() {
    const containerCurrent = document.getElementById('workflow-cards-current');
    const containerAll = document.getElementById('workflow-cards-all');
    const badge = document.getElementById('domain-filter-badge');
    const badgeName = document.getElementById('active-domain-name-display');

    if (!containerCurrent || !containerAll) return;

    try {
        const res = await fetch('/api/config/workflows');
        const templates = await res.json();
        window._cachedWorkflows = templates;

        containerCurrent.innerHTML = '';
        containerAll.innerHTML = '';

        const currentEnv = window.currentDomain || 'factory_dev';

        if (badge) {
            badge.style.display = window.currentDomain ? 'block' : 'none';
            if (badgeName) badgeName.innerText = window.currentDomain || '未接入';
        }

        let hasCurrent = false;
        let hasAll = false;

        Object.entries(templates).forEach(([id, wf]) => {
            const wfDomain = wf.domain_id || (wf.data && wf.data.domain_id) || 'factory_dev';
            
            const card = document.createElement('div');
            card.className = 'wf-select-card';
            card.onclick = () => window.selectAndLockWorkflow(id, wf);
            card.innerHTML = `<span class="name">${wf.name}</span><span class="icon"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></span>`;

            if (wfDomain === currentEnv) {
                containerCurrent.appendChild(card);
                hasCurrent = true;
            } else {
                card.style.opacity = '0.6';
                card.style.borderColor = '#222';
                const originDomain = document.createElement('div');
                originDomain.style.cssText = "position:absolute; bottom:2px; right:6px; font-size:0.5rem; color:#666;";
                originDomain.innerText = `[域]: ${wfDomain}`;
                card.appendChild(originDomain);
                containerAll.appendChild(card);
                hasAll = true;
            }
        });

        if (!hasCurrent) {
            containerCurrent.innerHTML = `<div style="padding:15px; text-align:center; color:#666; font-size:0.75rem; border:1px dashed #333; border-radius:10px;">当前频道无专属流，请吩咐总厂管家创建</div>`;
        }
        if (!hasAll) {
            containerAll.innerHTML = `<div style="padding:10px; text-align:center; color:#444; font-size:0.7rem;">全域暂无其他流</div>`;
        }

    } catch (e) {
        console.error("逻辑流加载失败:", e);
    }
};

window.selectAndLockWorkflow = async function(wfId, template = null) {
    if (!window.currentChatId) { alert("请先发送消息开启对话再调度任务"); return; }
    
    let targetWf = template;
    if (!targetWf) {
        const res = await fetch('/api/config/workflows');
        const templates = await res.json();
        targetWf = templates[wfId];
    }
    
    if (!targetWf) return alert("逻辑流丢失或已被删除！");

    const actualData = targetWf.data || targetWf;
    let edges = actualData.edges || [];
    let nodes = actualData.nodes || []; 
    
    if (edges.length === 0) {
        nodes.forEach(n => {
            if (n.parentId) edges.push({source: n.parentId, target: n.id, type: 'major'});
        });
    }
    const allTargets = new Set(edges.map(e => e.target));
    
    // 🔥 【PRO 装甲 2：数据绝对净化，免疫后端 422 报错拦截】
    const safeWfId = String(wfId || "");
    const startingNodes = nodes.filter(n => n && n.id != null && !allTargets.has(n.id)).map(n => String(n.id));

    await fetch(`/api/chats/${window.currentChatId}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow_id: safeWfId, completed_nodes: [], pending_nodes: startingNodes, system_status: 'IDLE' })
    });
    
    window.syncWorkflowUI({ attached_workflow: safeWfId, completed_nodes: [], pending_nodes: startingNodes });
    
    if (window._pendingAutoMountData || template === null) {
         if(typeof window.handleSend === 'function') {
             setTimeout(() => { window.handleSend("系统环境初始化完成，指令已下达，请开始执行。"); }, 800);
         }
    }
};

window.stopWorkflow = async function() {
    if (!confirm("⚠️ 警告：物理中断将强制切断当前流片。\n\n确定执行吗？")) return;
    
    // 1. 切断前端轮询查岗
    window.stopWorkflowPolling(false);
    window._isSending = false;
    
    try {
        // 2. 软刹车：通知主控解绑工作流
        fetch(`/api/chats/${window.currentChatId}/workflow`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workflow_id: null, completed_nodes: [], pending_nodes: [], system_status: 'IDLE' })
        }).catch(e=>{});

        // 3. 💥 硬刹车：直插沙盒雷达，物理级拔管斩杀！
        const radarHost = window.location.hostname;
        const killUrl = window.location.protocol === 'https:' 
            ? `/api/radar/kill?task=${window.currentChatId}` 
            : `http://${radarHost}:8999/kill?task=${window.currentChatId}`;
        
        await fetch(killUrl);
        console.log(`🛑 工作流 [${window.currentChatId}] 已被物理切断`);
        
        if(typeof window.appendMessage === 'function') {
            window.appendMessage('ai', `<span style="color:#ff6b6b; font-weight:bold;">🛑 【系统物理阻断】：工作流已被紧急终止，机床已强制断电。</span>`);
        }
        
    } catch(e) {
        console.warn("切断指令发送异常:", e);
    } finally {
        // 恢复 UI 状态
        window.activeWorkflowId = null;
        window.activeWorkflow = null;
        window.syncWorkflowUI({ attached_workflow: null, completed_nodes: [], pending_nodes: [] });
        
        const chatInput = document.getElementById('chat-input');
        if (chatInput) chatInput.disabled = false;
    }
};

window.renderWorkflowProgress = function() {
    const container = document.getElementById('workflow-progress-list');
    if (!container || !window.activeWorkflow) return;
    const actualData = window.activeWorkflow.data || window.activeWorkflow;
    const nodes = actualData.nodes || [];
    
    container.innerHTML = `
        <div style="font-size:0.75rem; color:#ffb74d; margin:10px 0 5px 0; font-weight:bold;">▶ 底层切削中...</div>
        <div id="wf-list-pending"></div>
        <div style="font-size:0.75rem; color:#4caf50; margin:15px 0 5px 0; font-weight:bold;">▶ 完工件</div>
        <div id="wf-list-completed"></div>
        <div style="font-size:0.75rem; color:#666; margin:15px 0 5px 0; font-weight:bold;">▶ 待料区</div>
        <div id="wf-list-unreachable"></div>
    `;

    const pendingDiv = document.getElementById('wf-list-pending');
    const completedDiv = document.getElementById('wf-list-completed');
    const unreachableDiv = document.getElementById('wf-list-unreachable');
    
    nodes.forEach(node => {
        const isDone = window.completedNodes.includes(node.id);
        const isPending = window.pendingNodes.includes(node.id);
        
        const item = document.createElement('div');
        item.className = 'workflow-step-item';
        
        let borderColor = '#333';
        let bgColor = 'var(--bg-dark)';
        let statusIcon = '⚪️';
        let opacity = 1;

        if (isDone) {
            borderColor = '#4caf50'; bgColor = 'rgba(76, 175, 80, 0.05)'; statusIcon = '✅'; opacity = 0.5;
        } else if (isPending) {
            borderColor = 'var(--accent-color)'; bgColor = 'rgba(168, 199, 250, 0.05)'; statusIcon = '⏳';
        } else {
            opacity = 0.3; 
        }

        let dynamicallyAssignedBadge = '';
        if (node.selectedAIs && node.selectedAIs.length > 0) {
            dynamicallyAssignedBadge = `<span style="background:rgba(216, 180, 254, 0.2); color:#d8b4fe; padding:2px 4px; border-radius:4px; font-size:0.6rem;">${node.selectedAIs[0]}</span>`;
        }

        item.style = `
            padding: 10px; border-radius: 8px; border: 1px solid ${borderColor};
            background: ${bgColor}; opacity: ${opacity}; margin-bottom:6px; transition: 0.3s;
        `;
        item.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.8rem; font-weight:bold; color:${isPending?'var(--accent-color)':'#aaa'}">
                    ${statusIcon} ${node.title} ${dynamicallyAssignedBadge}
                </span>
                <span style="font-size:0.6rem; color:#666; text-transform:uppercase;">${node.deliverType}</span>
            </div>
            ${isPending ? `<div style="font-size:0.7rem; color:#888; margin-top:5px; border-top:1px dashed #444; padding-top:5px;">黑灯沙盒正在静默执行中...</div>` : ''}
        `;
        
        if (isDone) completedDiv.appendChild(item);
        else if (isPending) pendingDiv.appendChild(item);
        else unreachableDiv.appendChild(item);
    });
};

function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return String(unsafe);
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

window.inspectNodeData = async function(nodeId, nodeTitle) {
    if(!window.currentChatId) return alert("当前无正在运行中的会话容器。");
    
    try {
        const res = await fetch(`/api/chats/${window.currentChatId}`);
        const data = await res.json();
        
        const messages = data.messages || [];
        let aiMsg = messages.slice().reverse().find(m => m.type === 'ai' && m.node_id === nodeId);
        if (!aiMsg) {
            aiMsg = messages.slice().reverse().find(m => m.type === 'ai'); 
        }
        
        if (!aiMsg) return alert("❌ 未能截获该机床在执行时的有效物理残留。");

        let thoughtsHtml = '';
        if (aiMsg.thoughts && aiMsg.thoughts.length > 0) {
            thoughtsHtml = aiMsg.thoughts.map(t => `
                <div style="margin-bottom:8px; padding:8px; background:#111; border-left:3px solid #a8c7fa;">
                    <b style="color:#a8c7fa; font-size:0.8rem;">[${t.subject}]</b><br>
                    <span style="color:#888; font-size:0.75rem; line-height:1.4;">${t.description}</span>
                </div>
            `).join('');
        } else {
            thoughtsHtml = '<div style="color:#555; font-size:0.75rem;">机床本次执行未留下深层逻辑思考轨迹。</div>';
        }

        let outputText = '';
        if (Array.isArray(aiMsg.content)) {
            outputText = aiMsg.content.map(c => c.text || '').join('\n');
        } else {
            outputText = String(aiMsg.content);
        }

        const safeOutput = escapeHtml(outputText);

        const modalHtml = `
            <div id="node-inspect-modal" style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.85); z-index:99999; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(5px);" onclick="if(event.target===this) this.remove()">
                <div style="background:#141518; border:1px solid #20c997; border-radius:12px; width:90%; max-width:800px; height:85vh; display:flex; flex-direction:column; box-shadow:0 0 30px rgba(32,201,151,0.2);">
                    
                    <div style="padding:15px 20px; border-bottom:1px solid #333; display:flex; justify-content:space-between; align-items:center; background:linear-gradient(to right, rgba(32,201,151,0.1), transparent);">
                        <h3 style="margin:0; color:#20c997; font-size:1.1rem; display:flex; align-items:center; gap:8px;">
                            👁️ 黑匣子解析：${nodeTitle}
                        </h3>
                        <button onclick="document.getElementById('node-inspect-modal').remove()" style="background:transparent; border:none; color:#aaa; cursor:pointer; font-size:1.2rem;">✖</button>
                    </div>

                    <div style="flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:20px;">
                        <div>
                            <div style="font-size:0.8rem; color:#d8b4fe; margin-bottom:10px; font-weight:bold; display:flex; align-items:center; gap:6px;">
                                🧠 算力心智流 (Thoughts)
                            </div>
                            <div style="background:#0a0a0c; border:1px inset #222; border-radius:8px; padding:12px;">
                                ${thoughtsHtml}
                            </div>
                        </div>

                        <div>
                            <div style="font-size:0.8rem; color:#4caf50; margin-bottom:10px; font-weight:bold; display:flex; align-items:center; gap:6px;">
                                📦 具象化物理落盘 (Output)
                            </div>
                            <div style="background:#0a0a0c; border:1px inset #222; border-radius:8px; padding:15px; font-family:monospace; font-size:0.85rem; color:#eee; white-space:pre-wrap; line-height:1.6; max-height:400px; overflow-y:auto;">${safeOutput}</div>
                        </div>
                    </div>

                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
    } catch(e) {
        alert("⚠️ 追溯底层数据流失败：" + e.message);
    }
};

window.confirmAutoMountAction = async function(btnEl) {
    const container = btnEl.closest('.message-content');
    const selectEl = container ? container.querySelector('.mount-wf-select') : null;
    
    // 物理强挖 ID
    const fallbackWfId = selectEl ? selectEl.value : null;
    const data = window._pendingAutoMountData || { wfId: fallbackWfId, text: window._lastSentText || "补发启动指令", images: [] };
    
    // 🔥 【PRO 装甲 3：彻底粉碎双重点火并发死锁】
    // 提早清空挂载变量，阻断 selectAndLockWorkflow 里的 handleSend，将点火权独占！
    window._pendingAutoMountData = null; 

    const finalWfId = selectEl && selectEl.value ? selectEl.value : data.wfId;

    if (!finalWfId) {
        alert("请选择一个有效的工作流进行挂载。");
        return;
    }

    if (container) {
        container.innerHTML = `<span style="color:#4caf50; font-weight:bold; font-size: 0.9rem;">✅ 权限移交成功！已将图纸发往底层车间...</span>`;
    }
    
    try {
        const workflows = await (await fetch('/api/config/workflows')).json();
        const wf = workflows[finalWfId]; 
        if (!wf) return alert("任务模板不存在或已被删除！");
        
        await window.selectAndLockWorkflow(finalWfId, wf);
        setTimeout(() => { if(typeof window.handleSend === 'function') window.handleSend(data.text, data.images); }, 800);
    } catch(e) {
        console.error("任务调度失败", e);
    }
};

window.cancelAutoMountAction = function(btnEl) {
    const container = btnEl.closest('.message-content');
    if(container) container.innerHTML = `<span style="color:#888; font-size: 0.85rem;">已取消挂载，继续纯文本交流。</span>`;
    window._pendingAutoMountData = null;
};

window.triggerArchitectGen = async function(btnElem, userRequirement) {
    const container = btnElem.closest('.ai-interaction-card') || btnElem.closest('.message-content');
    if (container) {
        container.innerHTML = `<span style="color:#d8b4fe; font-weight:bold; font-size: 0.85rem;">✨ 已唤醒总厂管家接棒，正在编排底层研发流并注入基因...</span>`;
    }

    const systemPromptElem = document.getElementById('ai-gen-system-prompt');
    const systemPrompt = systemPromptElem ? systemPromptElem.value.trim() : "请生成工作流";

    try {
        // 1. 抓取算力池花名册
        let flatVendors = [];
        const configRes = await fetch('/api/config/ai');
        const aiConfig = await configRes.json();
        
        if (aiConfig.categories) {
            aiConfig.categories.forEach(cat => cat.nodes.forEach(n => { if (n.enabled !== false) flatVendors.push(n); }));
        } else if (aiConfig.vendors) {
            flatVendors = aiConfig.vendors;
        }

        let fallbackId = "ai_1772830837817";
        const availableModelsStr = flatVendors.map(v => 
            // 💡 精准透传引擎身份，指导架构师更合理的分配任务
            `- 模型ID: "${v.id}" (名称: ${v.name}, 架构: ${v.exec_mode === 'cli' ? '💻 物理机床(无网/硬核执行)' : '🌐 云端API(联网/高阶推理)'}, 技能: ${v.remark || '通用'})`
        ).join('\n');

        // 2. 抓取全域基因库(DNA)花名册
        let availableDnasStr = "暂无可用基因配置";
        try {
            const dnaRes = await fetch('/api/config/dna');
            if (dnaRes.ok) {
                const dnaVault = await dnaRes.json();
                if (dnaVault && dnaVault.vault && dnaVault.vault.length > 0) {
                    availableDnasStr = dnaVault.vault.map(d => 
                        `- 基因ID: "${d.id}" (名称: ${d.name}, 类型: ${d.type})`
                    ).join('\n');
                }
            }
        } catch(e) { console.warn("基因库提取失败", e); }

        // 3. 构造超级 Prompt (严格分离 SOP 与红线，去除多余 Emoji，采用严格分行编号)
        const finalMessage = `【内部接力协议：管家接管需求并自动编排流转网络】
${systemPrompt}

【全域可用 AI 算力池花名册】（必须从这里挑选底层 ID）：
${availableModelsStr || "无可用模型"}

【全域可用 思想钢印(DNA/基因) 花名册】（必须从这里挑选基因 ID）：
${availableDnasStr}

【厂长的原始硬核需求】：
${userRequirement}

【标准作业程序 (SOP)】：
1. 分析厂长需求，规划合理的节点流转顺序。
2. 为每个节点分配合适的 AI 模型，写入 \`selectedAIs\` 数组。如果不确定分配给谁，统一填写默认机床 ID：["${fallbackId}"]。
3. 根据节点的业务属性，从【思想钢印花名册】中挑选匹配的基因，写入 \`injected_dna\` 数组。如果该节点不需要特殊基因，输出空数组 \`[]\`。

【绝对红线 (Rules)】：
1. JSON 结构必须绝对严谨，不可包含任何 Markdown 格式以外的多余回复。
2. \`selectedAIs\` 中的 ID 必须严格来源于【AI 算力池花名册】，绝对禁止捏造不存在的模型 ID。
3. \`injected_dna\` 中的 ID 必须严格来源于【思想钢印花名册】，绝对禁止捏造不存在的基因 ID。`;

        if (typeof window.handleSend === 'function') {
            window.handleSend(finalMessage);
        } else {
            console.error("未找到 window.handleSend，系统调度失败。");
        }
    } catch (e) {
        console.error("加载资源池失败", e);
        if (typeof window.handleSend === 'function') window.handleSend("系统报错：无法读取算力或基因池配置，无法编排工作流。");
    }
};

window.rejectArchitectGen = function(btnElem) {
    const container = btnElem.closest('.ai-interaction-card') || btnElem.closest('.message-content');
    if (container) {
        container.innerHTML = `<span style="color:#888; font-size: 0.85rem;">已婉拒，让我们继续在当前模式下沟通。</span>`;
    }
    const rejectMsg = "【厂长最高指令：驳回该草案】不同意此工作流设定。请重新评估我的需求，修复逻辑缺陷，并严格按照 JSON 骨架规范重新输出！";
    if(typeof window.handleSend === 'function') window.handleSend(rejectMsg);
};

window.pinToSessionSteelMark = async function(btnElem) {
    if (!window.currentChatId) return;
    
    const card = btnElem.closest('.ai-scheme-card');
    const payloadDiv = card.querySelector('.scheme-payload');
    if (!payloadDiv) return;
    
    const coreText = payloadDiv.innerText || payloadDiv.textContent;
    const distilledSummary = `厂长确认的核心结论:\n${coreText.substring(0, 1000)}`; 

    btnElem.innerHTML = "⏳ 正在刻入底层...";
    btnElem.disabled = true;

    try {
        const res = await fetch(`/api/chats/${window.currentChatId}/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                updates: { user_corrections: distilledSummary } 
            })
        });

        if (res.ok) {
            btnElem.innerHTML = "✅ 钢印已刻入，系统将遵照执行！";
            btnElem.style.borderColor = "#4caf50";
            btnElem.style.color = "#4caf50";
            if (typeof window.extractMemory === 'function') window.extractMemory();
        } else {
            btnElem.innerHTML = "❌ 刻入失败";
        }
    } catch (e) {
        console.error("钢印刻入异常", e);
        btnElem.innerHTML = "❌ 网络错误";
    }
};

window.selectWinner = function(btn, type) {
    const card = btn.closest('.ai-scheme-card');
    const container = card.closest('.ai-schemes-container');
    const payloadDiv = card.querySelector('.scheme-payload');
    
    if (type === 'condition') {
        const rawDecisionEl = card.querySelector('.raw-decision');
        if (rawDecisionEl) {
            window.workflowContext = `[上一步的决策]:\n${rawDecisionEl.innerText || rawDecisionEl.textContent}`; 
            window._lastDecisionKeyword = (rawDecisionEl.innerText || rawDecisionEl.textContent).trim();
        }
    } else {
        if (payloadDiv) {
            if (type === 'image') {
                const img = payloadDiv.querySelector('img');
                if (img) window.contextImages = [img.src]; 
            } else {
                window.workflowContext = `[前置步骤选定的方案]:\n${payloadDiv.innerText || payloadDiv.textContent}`; 
            }
        }
    }

    const allCards = container.querySelectorAll('.ai-scheme-card');
    allCards.forEach(c => {
        if (c !== card) {
            c.style.opacity = '0.3';
            c.style.transform = 'scale(0.95)';
            c.style.pointerEvents = 'none'; 
            const otherBtn = c.querySelector('button');
            if(otherBtn) otherBtn.style.display = 'none';
        }
    });

    card.style.borderColor = type === 'condition' ? '#ffb74d' : '#d8b4fe';
    card.style.boxShadow = `0 0 20px rgba(${type==='condition'?'255,183,77':'216,180,254'}, 0.2)`;
    card.style.borderRadius = '12px'; // 保持卡片圆润
    btn.innerHTML = '✨ 方案已确认采纳';
    btn.style.background = type === 'condition' ? '#ffb74d' : 'linear-gradient(135deg, #a8c7fa 0%, #d8b4fe 100%)';
    btn.style.color = '#111';
    btn.style.borderRadius = '8px'; // 保持按钮圆润
    btn.style.pointerEvents = 'none';

    const reviewBox = container.closest('.message-content').querySelector('.review-box');
    if (reviewBox) {
        const confirmBtn = reviewBox.querySelector('button.confirm-flow-btn');
        if (confirmBtn) setTimeout(() => window.confirmNodeReview(confirmBtn, type), 600);
    }
};

window.confirmNodeReview = async function(btn, type = 'normal') {
    if (!window.currentChatId || !window.activeWorkflow) return;
    
    const box = btn.closest('.review-box');
    const nodeId = box.getAttribute('data-node-id');
    if (!nodeId) return;

    if (box) box.innerHTML = `<span style="color:#4caf50; font-size:0.85rem; font-weight:bold;">✅ ${type==='condition'?'条件已满足，切换分支中...':'审核通过，机床继续切削...'}</span>`;
    
    if (!window.completedNodes.includes(nodeId)) {
        window.completedNodes.push(nodeId);
    }
    window.pendingNodes = window.pendingNodes.filter(id => id !== nodeId);

    const actualData = window.activeWorkflow.data || window.activeWorkflow;
    const edges = actualData.edges || [];
    const connectedEdges = edges.filter(e => e.source === nodeId);
    let nextNodesToActivate = [];

    let forceTargetAI = null;
    let skipNodes = [];
    
    const currentMessageRow = box.closest('.message-row');
    if (currentMessageRow) {
        const dispatchDataEl = currentMessageRow.querySelector('.dynamic-dispatch-data');
        if (dispatchDataEl) {
            try {
                const dispatchCmd = JSON.parse(dispatchDataEl.innerText);
                if (dispatchCmd.target_ai) forceTargetAI = dispatchCmd.target_ai;
                if (dispatchCmd.skip_nodes && Array.isArray(dispatchCmd.skip_nodes)) {
                    skipNodes = dispatchCmd.skip_nodes;
                }
            } catch(e) { console.error("解析动态路由失败", e); }
        }
    }

    if (type === 'condition' && window._lastDecisionKeyword) {
        connectedEdges.forEach(e => {
            const targetNode = actualData.nodes.find(n => n.id === e.target);
            if (targetNode && targetNode.title.includes(window._lastDecisionKeyword)) {
                nextNodesToActivate.push(e.target);
            }
        });
        window._lastDecisionKeyword = null; 
    } else {
        connectedEdges.forEach(e => {
            nextNodesToActivate.push(e.target);
        });
    }

    let newlyActivatedCount = 0;
    nextNodesToActivate.forEach(targetId => {
        if (skipNodes.includes(targetId)) {
            if (!window.completedNodes.includes(targetId)) window.completedNodes.push(targetId);
            return; 
        }

        const incomingEdges = edges.filter(e => e.target === targetId);
        const allPreReqsMet = incomingEdges.every(e => window.completedNodes.includes(e.source));
        
        if (allPreReqsMet && !window.completedNodes.includes(targetId) && !window.pendingNodes.includes(targetId)) {
            if (forceTargetAI) {
                const nodeRef = actualData.nodes.find(n => n.id === targetId);
                if (nodeRef) nodeRef.selectedAIs = [forceTargetAI];
            }
            window.pendingNodes.push(targetId);
            newlyActivatedCount++;
        }
    });
    
    const justCompletedNodeObj = actualData.nodes.find(n => n.id === nodeId);
    let willLoop = false;
    
    if (newlyActivatedCount === 0 && justCompletedNodeObj && justCompletedNodeObj.is_loop_trigger) {
        const allTargets = new Set(edges.map(e => e.target));
        const startingNodes = actualData.nodes.filter(n => !allTargets.has(n.id)).map(n => n.id);
        window.pendingNodes = startingNodes; 
        window.completedNodes = [];          
        willLoop = true;
    }

    window.renderWorkflowProgress();
    
    if (newlyActivatedCount > 0 || willLoop) {
        let rawContext = window.workflowContext || "厂长已放行，请继续生产";
        let armoredInput = `【🛡️ 厂长原始需求 / 前置节点文稿 (仅供参考)】:\n${rawContext}\n\n【🚨 节点防污染最高强制钢印】:\n以上内容仅供背景查阅！作为黑灯工厂的物理节点，你**绝对禁止**越权执行全局目标！\n你必须、且只能被系统刚刚注入的【底层思想钢印】所绝对支配，并严格按字面意思执行属于你的【本节点专属指令】！`;
        
        const startReq = {
            chat_id: window.currentChatId,
            workflow_id: window.activeWorkflowId,
            start_nodes: window.pendingNodes,
            user_input: armoredInput,
            image_urls: []
        };
        try {
            await fetch('/api/workflow/start_background', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(startReq)
            });
            
            let eta = null;
            if (typeof window.getWorkflowETA === 'function') {
                eta = window.getWorkflowETA(window.activeWorkflowId, window.pendingNodes.length);
            }
            if(typeof window.startWorkflowPolling === 'function') window.startWorkflowPolling(eta); 
            
        } catch (e) { console.error("重启后台引擎失败", e); }
    } else {
        window.activeWorkflowId = null;
        window.activeWorkflow = null;
        await fetch(`/api/chats/${window.currentChatId}/workflow`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workflow_id: null, completed_nodes: [], pending_nodes: [], system_status: 'IDLE' })
        });
        if(typeof window.appendMessage === 'function') window.appendMessage('ai', `🏁 <b>本轮物理生产线交付完毕！</b><br><span style="font-size:0.85rem; color:#aaa;">所有工序均已完成，机床断电休眠。</span>`);
    }

    if(typeof window.scrollToBottom === 'function') window.scrollToBottom();
    if (typeof window.extractAssets === 'function') window.extractAssets();
};

window.approveAndMountWorkflow = async function(b64Data, userReq) { 
    try {
        const rawJson = decodeURIComponent(escape(atob(b64Data)));
        const wfData = JSON.parse(rawJson);

        const domainSelector = document.getElementById('domain-selector');
        const activeDomain = window.currentDomain || (domainSelector ? domainSelector.value : 'factory_dev');
        wfData.domain_id = activeDomain; 

        const finalPayload = {
            name: wfData.name || "底层自动切削流水线",
            data: wfData
        };

        const res = await fetch('/api/workflow/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workflow_data: finalPayload })
        });

        if (res.ok) {
            const data = await res.json();
            const successHtml = `
                <div class="ai-interaction-card" style="background: rgba(168, 199, 250, 0.05); border: 1px solid rgba(216,180,254,0.3); padding: 16px; border-radius: 12px; margin-top: 10px; box-shadow: 0 4px 15px rgba(216,180,254,0.1);">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                        <b style="background:-webkit-linear-gradient(0deg, #a8c7fa, #d8b4fe); -webkit-background-clip:text; -webkit-text-fill-color:transparent; font-size:1.1rem;">✨ 审批通过，物理生产网已搭建！</b>
                    </div>
                    <span style="font-size: 0.85rem; color: #ccc;">工作流 <b>[${data.name}]</b> 已落盘至频道 <b>[${activeDomain}]</b>。<br>ID: ${data.workflow_id}</span><br>
                    <a href="/work.html" target="_blank" style="display:inline-block; margin-top:12px; background:linear-gradient(135deg, #a8c7fa 0%, #d8b4fe 100%); color:#111; padding:6px 12px; border-radius:6px; font-size:0.85rem; text-decoration:none; font-weight:bold; box-shadow: 0 2px 8px rgba(168,199,250,0.3);">✨ 打开【调度中心】可观察节点状态</a>
                    <div style="margin-top:12px; font-size:0.8rem; color:#888; border-top: 1px dashed rgba(216,180,254,0.2); padding-top: 8px;">✨ 管家正在通过星门唤醒二厂底层机床...</div>
                </div>
            `;
            
            const chatBox = document.getElementById('chat-box');
            const lastApprovalCard = chatBox ? chatBox.querySelector('.workflow-approval-card:last-of-type') : null;
            if (lastApprovalCard) {
                 lastApprovalCard.style.display = 'none'; 
            } 
            
            if(typeof window.appendMessage === 'function') window.appendMessage('ai', successHtml);
            await fetch(`/api/chats/${window.currentChatId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: 'ai', text: successHtml })
            });
            
            if (typeof window.scrollToBottom === 'function') window.scrollToBottom();
            
            if (typeof window.initWorkflowSelector === 'function') {
                await window.initWorkflowSelector();
            }
            if (typeof window.fetchAndRenderWorkflows === 'function') {
                await window.fetchAndRenderWorkflows(); 
            }

            const fetchWfRes = await fetch('/api/config/workflows');
            const allWfTemplates = await fetchWfRes.json();
            const freshWfTemplate = allWfTemplates[data.workflow_id];

            if (freshWfTemplate) {
                await window.selectAndLockWorkflow(data.workflow_id, freshWfTemplate);
                
                if(typeof window.handleSend === 'function') {
                    setTimeout(() => { 
                        window.handleSend(userReq || "✅ 图纸审批通过，请系统立刻按计划启动切削。"); 
                    }, 800);
                }
            }

        } else {
            alert("❌ 落盘失败，请检查 NAS 后端权限。");
        }
    } catch (e) {
        console.error("JSON 解析崩溃:", e);
        alert("❌ 图纸存在语法错误，请点击卡片上的【驳回重写】。");
    }
};

window.addEventListener('beforeunload', function (e) {
    if (window._isSending && !window.workflowPollInterval) {
        e.preventDefault();
        e.returnValue = '系统正在高压解析数据中，此刻刷新将导致链路熔断，确定要强制退出吗？';
    }
});

window.rejectWorkflow = function(btnElement) {
    btnElement.innerText = "⛔ 已驳回，请下达修改指令";
    btnElement.style.background = "rgba(255, 255, 255, 0.1)";
    btnElement.style.color = "#888";
    btnElement.style.borderColor = "#555";
    btnElement.disabled = true;
    
    let approveBtn = btnElement.previousElementSibling;
    if(approveBtn) {
        approveBtn.disabled = true;
        approveBtn.style.opacity = "0.3";
        approveBtn.style.cursor = "not-allowed";
    }

    let inputField = document.getElementById('chat-input') || document.querySelector('textarea'); 
    
    if(inputField) {
        inputField.value = "❌ 我驳回该工作流草案，请按以下要求重新调整：\n1. ";
        inputField.focus(); 
        inputField.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
        alert("草案已驳回！请直接在对话框中告诉管家需要修改哪里。");
    }
};
