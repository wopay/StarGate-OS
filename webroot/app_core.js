// [webroot/app_core.js] - 全局变量、系统初始化、核心UI与资产管理 (V12.0 三位一体模型路由版)

const icons = {
    user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    // 💡 换上纯正的 Gemini 蓝紫渐变四芒星！
    ai: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 0 4px rgba(216,180,254,0.4));">
            <path d="M12 0C12 6.627 17.373 12 24 12C17.373 12 12 17.373 12 24C12 17.373 6.627 12 0 12C6.627 12 12 6.627 12 0Z" fill="url(#gemini-avatar-grad)"/>
            <defs>
                <linearGradient id="gemini-avatar-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#a8c7fa" />
                    <stop offset="1" stop-color="#d8b4fe" />
                </linearGradient>
            </defs>
        </svg>`
};

var currentChatId = null;
var isTempMode = false; 
var activeWorkflowId = null; 
var activeWorkflow = null;   

var completedNodes = []; 
var pendingNodes = [];   

var workflowContext = "";        
var contextImages = [];          
var stagedImages = [];           

var queuePollInterval = null;
var _pendingAutoMountData = null;
var _dynamicDispatchCommand = null;

var currentDomain = null; 
var domainList = [];

var workflowPollInterval = null;
var lastMessageCount = 0;
var _isSending = false; 
var _lastSentText = null; 

var _explorerCurrentPath = '/';
var _explorerData = [];

var _systemReady = { sidebarLeft: false, sidebarRight: false, models: false };

async function bootstrapSystem() {
    console.log("🚀 [System] 核心引擎启动，尝试穿透死锁...");
    
    const watchdog = setTimeout(() => {
        if (!_systemReady.sidebarLeft) {
            console.warn("🚨 [Watchdog] 检测到系统初始化死锁，忽略并继续...");
        }
    }, 5000);

    const cacheBuster = Date.now();
    async function loadModule(url, elementId) {
        try {
            const res = await fetch(`${url}?v=${cacheBuster}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const html = await res.text();
            const el = document.getElementById(elementId);
            if (el) {
                el.innerHTML = html;
                return true;
            }
            return false;
        } catch (e) {
            console.error(`❌ [Loader] 模块 ${url} 加载失败:`, e);
            return false;
        }
    }

    const loadResults = await Promise.allSettled([
        loadModule('/zuo.html', 'sidebar-left'),
        loadModule('/you.html', 'sidebar-right')
    ]);

    _systemReady.sidebarLeft = loadResults[0].value === true;
    _systemReady.sidebarRight = loadResults[1].value === true;

    if (_systemReady.sidebarLeft) {
        clearTimeout(watchdog);
        console.log("✅ [System] 侧边栏物理容器就绪，开始注入逻辑流...");
        
        await reconstructDomainsFromBackend();
        
        if (typeof window.initInteractions === 'function') window.initInteractions();
        if (typeof window.initWorkflowSelector === 'function') window.initWorkflowSelector(); 
        
        // 💡 关键点：初始化模型选择器，绑定接待员与管家
        await initModelSelector(); 
        
        if (typeof window.fetchAndRenderChats === 'function') {
            await window.fetchAndRenderChats();
        }
        
        const lastChatId = localStorage.getItem('last_valid_chat_id');
        if (lastChatId) {
            window.currentChatId = lastChatId;
            if (typeof window.loadChatMessages === 'function') {
                await window.loadChatMessages(lastChatId);
            }
        }
        
        console.log("🏁 [System] 全系统闭环加载完毕。");
    }

    window.addEventListener('uiModeChanged', () => {
        initModelSelector(); 
    });

    document.body.addEventListener('change', (e) => {
        if (e.target && e.target.id === 'domain-selector') {
            if (e.target.value === '__manage__') {
                e.target.value = currentDomain || ''; 
                openDomainManager();
                return;
            }
            switchDomain(e.target.value);
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapSystem);
} else {
    bootstrapSystem();
}

async function reconstructDomainsFromBackend() {
    try {
        const res = await fetch('/api/chats');
        const json = await res.json();
        const chats = json.data || [];
        
        let extractedDomains = new Map();
        extractedDomains.set("factory_dev", "总控开发大区");

        chats.forEach(chat => {
            if (chat.domain_id && chat.domain_id !== "factory_dev") {
                // 💡 厂长级优化：直接使用后端智能分配的频道原名，斩断画蛇添足的前缀！
                const dName = chat.domain_name || chat.domain_id;
                extractedDomains.set(chat.domain_id, dName);
            }
        });

        domainList = [];
        extractedDomains.forEach((name, id) => {
            domainList.push({ id: id, name: name });
        });

        const lastActive = localStorage.getItem('factory_last_domain');
        currentDomain = (lastActive && domainList.some(d => d.id === lastActive)) ? lastActive : "factory_dev";
        
        renderDomainSelector();
        if (currentDomain) {
            switchDomain(currentDomain, true); 
        } else {
            triggerNoDomainState();
        }
    } catch (e) {
        console.error("重建频道列表失败:", e);
        domainList = [{id: "factory_dev", name: "总控开发大区"}];
        currentDomain = "factory_dev";
        renderDomainSelector();
        switchDomain(currentDomain, true);
    }
}

function saveDomainsToStorage() {
    if (currentDomain) {
        localStorage.setItem('factory_last_domain', currentDomain);
    }
}

function renderDomainSelector() {
    const sel = document.getElementById('domain-selector');
    if (!sel) return;
    let html = domainList.map(d => `<option value="${d.id}" ${d.id === currentDomain ? 'selected' : ''}>📍 ${d.name}</option>`).join('');
    html += `<optgroup label="── 频道操作 ──"></optgroup><option value="__manage__">⚙️ 管理频道空间...</option>`;
    sel.innerHTML = html;
}

function triggerNoDomainState() {
    const headerIcon = document.getElementById('domain-icon');
    const sidebarIcon = document.getElementById('sidebar-logo-icon');
    const sidebarText = document.getElementById('sidebar-logo-text');
    
    if(headerIcon) headerIcon.innerText = '🌌'; 
    if(sidebarIcon) sidebarIcon.innerText = '🌌';
    if(sidebarText) sidebarText.innerText = '无主域空洞';
    
    if(typeof window.appendMessage === 'function' && !window.currentChatId) {
        window.appendMessage('ai', `⚠️ <b>警告：您尚未接入任何专属物理频道。</b><br><span style="font-size:0.85rem; color:#aaa;">当前处于隔离沙盒内，请直接告诉我您的新需求，我将为您自动开辟专属频道；或点击左上角【管理频道】手动创建。</span>`);
    }
    
    _explorerData = [];
    if (typeof window.renderExplorer === 'function') window.renderExplorer('/');
    if (typeof window.initWorkflowSelector === 'function') window.initWorkflowSelector();
}

window.switchDomain = function(domainId, isInit = false) {
    if (!domainId) return;
    currentDomain = domainId;
    saveDomainsToStorage(); 
    
    const domainObj = domainList.find(d => d.id === domainId);
    const domainName = domainObj ? domainObj.name : domainId;
    
    const headerIcon = document.getElementById('domain-icon');
    const sidebarIcon = document.getElementById('sidebar-logo-icon');
    const sidebarText = document.getElementById('sidebar-logo-text');
    
    if(headerIcon) headerIcon.innerText = ''; 
    if(sidebarIcon) sidebarIcon.innerText = '';
    if(sidebarText) sidebarText.innerText = domainName;

    if(typeof window.stopWorkflowPolling === 'function') window.stopWorkflowPolling();
    if(typeof window.hideThinkingAnimation === 'function') window.hideThinkingAnimation();
    window.activeWorkflowId = null;
    window.activeWorkflow = null;
    window.completedNodes = [];
    window.pendingNodes = [];
    
    if(typeof window.updateActionBarStatus === 'function') window.updateActionBarStatus(); 
    
    if (!isInit && !window.currentChatId) {
        if (typeof window.initNewChatUI === 'function') {
            window.initNewChatUI(false);
        }
    }
    
    if (!isInit && typeof window.appendMessage === 'function') {
        window.appendMessage('ai', `🔄 频道跃迁完成，管家已在 <b>[${domainName}]</b> 内待命。该频道专属的资产与调度流已挂载。`);
    }

    if (typeof window.extractAssets === 'function') window.extractAssets();
    if (typeof window.initWorkflowSelector === 'function') window.initWorkflowSelector();
    if (typeof window.fetchAndRenderWorkflows === 'function') window.fetchAndRenderWorkflows();
    if (typeof window.renderExplorer === 'function') window.renderExplorer('/'); 
};

window.createNewDomainFromAI = async function(domainName, originalRequirement = null) {
    const newId = 'domain_' + Date.now();
    domainList.push({ id: newId, name: domainName });
    renderDomainSelector();
    
    const uselessChatIdToDestroy = window.currentChatId;
    
    if (typeof window.initNewChatUI === 'function') {
        window.initNewChatUI(false); 
    }

    window.switchDomain(newId);

    if (typeof window.handleSend === 'function') {
        let handoverMsg = `【系统指令：频道隔离网已建立】\n当前所在域：[${domainName}]。`;
        if (originalRequirement && originalRequirement.trim() !== "新建通用任务") {
            handoverMsg += `\n\n【厂长的首要需求引渡如下，请立即启动设计】：\n${originalRequirement}`;
        } else {
            handoverMsg += `\n\n请汇报当前环境状态并列出可能的研发切入点。`;
        }
        
        setTimeout(() => {
            window.handleSend(handoverMsg, null, true);
        }, 800);
    }

    if (uselessChatIdToDestroy) {
        try {
            await fetch(`/api/chats/${uselessChatIdToDestroy}`, { method: 'DELETE' });
            if (typeof window.fetchAndRenderChats === 'function') {
                setTimeout(window.fetchAndRenderChats, 1200); 
            }
        } catch (e) {
            console.error("销毁废弃接待壳失败:", e);
        }
    }
};

window.openDomainManager = function() {
    let modal = document.getElementById('domain-manager-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'domain-manager-modal';
        modal.className = 'modal-overlay';
        modal.style.zIndex = '99999';
        document.body.appendChild(modal);
    }
    
    const listHtml = domainList.map(d => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:10px; border-radius:8px; margin-bottom:8px;">
            <span style="color:#eee; font-weight:bold;">${d.name}</span>
            <button onclick="deleteDomain('${d.id}', '${d.name}')" style="background:transparent; border:1px solid #ff5f56; color:#ff5f56; border-radius:4px; padding:4px 8px; cursor:pointer; font-size:0.75rem;">彻底摧毁</button>
        </div>
    `).join('');

    modal.innerHTML = `
        <div class="template-modal" style="width:90%; max-width:400px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem;">
                <h3 style="margin:0; color:var(--accent-color); font-size: 1.2rem;">⚙️ 频道空间管理</h3>
                <span style="cursor:pointer; font-size:1.5rem; color:#666;" onclick="document.getElementById('domain-manager-modal').style.display='none'">×</span>
            </div>
            
            <div style="margin-bottom:15px; display:flex; gap:8px;">
                <input type="text" id="new-domain-input" placeholder="输入新频道名称..." style="flex:1; background:#000; border:1px solid #444; color:#fff; padding:8px; border-radius:6px; outline:none;">
                <button onclick="manualCreateDomain()" style="background:var(--accent-color); color:#000; font-weight:bold; border:none; padding:8px 15px; border-radius:6px; cursor:pointer;">新建</button>
            </div>
            
            <div style="max-height: 300px; overflow-y:auto;">
                ${listHtml || '<div style="color:#666; text-align:center; padding:20px;">当前空无一物</div>'}
            </div>
        </div>
    `;
    modal.style.display = 'flex';
};

window.manualCreateDomain = function() {
    const input = document.getElementById('new-domain-input');
    const name = input.value.trim();
    if (!name) return;
    
    window.createNewDomainFromAI(name);
    openDomainManager(); 
};

window.deleteDomain = async function(domainId, domainName) {
    if (domainId === 'factory_dev') {
        alert("⚠️ [系统预警]：总控开发大区为底层物理基地，不可摧毁！");
        return;
    }
    if (!confirm(`🚨 危险操作！\n\n您确定要彻底删除频道 [${domainName}] 吗？\n删除后，该频道下的所有工作流都会被连带销毁，且无法恢复！`)) return;
    
    domainList = domainList.filter(d => d.id !== domainId);
    if (currentDomain === domainId) {
        currentDomain = domainList.length > 0 ? domainList[0].id : null;
    }
    saveDomainsToStorage();
    renderDomainSelector();

    try {
        const res = await fetch('/api/config/workflows');
        const templates = await res.json();
        for (const [wfId, wf] of Object.entries(templates)) {
            const wfDomain = wf.domain_id || (wf.data && wf.data.domain_id) || 'factory_dev';
            if (wfDomain === domainId) {
                await fetch(`/api/config/workflows/${wfId}`, { method: 'DELETE' });
            }
        }
    } catch(e) { console.error("清理工作流失败", e); }

    if (currentDomain) {
        switchDomain(currentDomain, true);
    } else {
        triggerNoDomainState();
    }
    openDomainManager(); 
};

window.updateActionBarStatus = function() {
    const badge = document.getElementById('ui-mode-badge');
    const text = document.getElementById('ui-mode-text');
    if (!badge || !text) return;
    if (activeWorkflow) {
        badge.classList.add('factory-active');
        text.innerText = `${activeWorkflow.name}`;
    } else {
        badge.classList.remove('factory-active');
        text.innerText = `管家待命`;
    }
};

window.checkSystemStatus = async function() {
    const textElem = document.getElementById('queue-text');
    if (!textElem) return;
    
    if (window._wfInterval || window._wfCountdown > 0) {
        return; 
    }

    try {
        const res = await fetch('/api/system/status');
        if (!res.ok) return;
        const data = await res.json();
        if (data.comfyui_queue > 0) {
            textElem.innerText = `资源满载，前方排队 ${data.comfyui_queue}...`;
        } else if (workflowPollInterval) {
            textElem.innerHTML = `🏭 黑灯推演中... <span style="font-size:0.7rem;color:#888;">(✅ 可安全离线)</span>`;
        } else if (data.active_tasks > 0) {
            textElem.innerText = `管家正在调度集群...`;
        } else {
            textElem.innerText = `处理中，即将返回...`;
        }
    } catch (e) {}
};

window.startQueuePolling = function() {
    const badge = document.getElementById('queue-badge');
    if (!badge) return;
    badge.style.display = 'flex';
    window.checkSystemStatus();
    queuePollInterval = setInterval(window.checkSystemStatus, 3000); 
};

window.stopQueuePolling = function() {
    if (queuePollInterval) { clearInterval(queuePollInterval); queuePollInterval = null; }
    if (document.getElementById('queue-badge')) document.getElementById('queue-badge').style.display = 'none';
};

window.updateStagingArea = function() {
    let stagingArea = document.getElementById('staging-area');
    if (!stagingArea) {
        stagingArea = document.createElement('div');
        stagingArea.id = 'staging-area';
        stagingArea.style.cssText = 'width: 100%; display: flex; gap: 8px; padding-bottom: 8px; margin-bottom: 8px; overflow-x: auto; box-sizing: border-box; border-bottom: 1px solid rgba(255,255,255,0.05);';
        const textarea = document.getElementById('chat-input');
        textarea.parentNode.insertBefore(stagingArea, textarea);
    }
    if (stagedImages.length === 0) { stagingArea.style.display = 'none'; return; }
    stagingArea.style.display = 'flex';
    stagingArea.innerHTML = '';
    stagedImages.forEach((url, idx) => {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'position: relative; flex-shrink: 0; width: 60px; height: 60px; border-radius: 8px; overflow: hidden; border: 1px solid #444;';
        wrapper.innerHTML = `
            <img src="${url}" style="width:100%; height:100%; object-fit:cover;">
            <button onclick="window.removeStagedImage(${idx})" style="position:absolute; top:2px; right:2px; background:rgba(0,0,0,0.8); color:#fff; border:1px solid #666; border-radius:50%; width:18px; height:18px; font-size:10px; cursor:pointer; display:flex; align-items:center; justify-content:center;">×</button>
        `;
        stagingArea.appendChild(wrapper);
    });
};

window.removeStagedImage = function(idx) { stagedImages.splice(idx, 1); window.updateStagingArea(); };
window.clearStaging = function() { stagedImages = []; contextImages = []; workflowContext = ""; window.updateStagingArea(); };

// ==========================================
// 💡 V21.0 核心：双态引擎感知与 CLI 优先下拉框
// ==========================================
window.initModelSelector = async function() {
    const selector = document.getElementById('iq-mode-selector');
    if (!selector) return;
    const currentMode = localStorage.getItem('butler_ui_mode') || 'simple';
    const oldVal = selector.value; 
    
    try {
        const res = await fetch('/api/config/ai');
        const config = await res.json();
        let optionsHtml = '';
        
        let flatVendors = [];
        if (config.categories) {
            config.categories.forEach(cat => cat.nodes.forEach(n => { if(n.enabled !== false) flatVendors.push(n) }));
        } else if (config.vendors) {
            flatVendors = config.vendors;
        }

        if (currentMode === 'dev') {
            // 🔓 [极客模式]：砸碎门锁，按物理分类渲染全域 100% 节点
            if (config.categories) {
                config.categories.forEach(cat => {
                    optionsHtml += `<optgroup label="── ${cat.name || '智能体分类'} ──" style="color:#888;">`;
                    
                    // 💡 CLI 优先法则：强行将底层 CLI 终端排在云端 API 节点之前！
                    let sortedNodes = [...cat.nodes].filter(n => n.enabled !== false).sort((a, b) => {
                        if (a.exec_mode === 'cli' && b.exec_mode !== 'cli') return -1;
                        if (a.exec_mode !== 'cli' && b.exec_mode === 'cli') return 1;
                        return 0;
                    });

                    sortedNodes.forEach(n => { 
                        const modeIcon = n.exec_mode === 'cli' ? '💻 CLI' : '🌐 API';
                        const color = n.exec_mode === 'cli' ? '#f1c40f' : '#eee'; // CLI 引擎金色高亮
                        optionsHtml += `<option value="${n.id}" style="color:${color}; font-weight:bold;">[${modeIcon}] ${n.icon || '🤖'} ${n.name}</option>`;
                    });
                    optionsHtml += `</optgroup>`;
                });
            } else {
                optionsHtml += `<optgroup label="── 全域智能体 ──" style="color:#888;">`;
                let sortedVendors = [...flatVendors].sort((a, b) => {
                    if (a.exec_mode === 'cli' && b.exec_mode !== 'cli') return -1;
                    if (a.exec_mode !== 'cli' && b.exec_mode === 'cli') return 1;
                    return 0;
                });
                sortedVendors.forEach(n => {
                    const modeIcon = n.exec_mode === 'cli' ? '💻 CLI' : '🌐 API';
                    const color = n.exec_mode === 'cli' ? '#f1c40f' : '#eee';
                    optionsHtml += `<option value="${n.id}" style="color:${color}; font-weight:bold;">[${modeIcon}] ${n.icon || '🤖'} ${n.name}</option>`;
                });
                optionsHtml += `</optgroup>`;
            }
        } else {
            // 🛡️ [极简模式]：开启防误触装甲，仅保留核心调度员
            const receptionist = flatVendors.find(v => v.id === 'ai_receptionist');
            // 兼容您的管家 ID
            const manager = flatVendors.find(v => v.id === 'ai_1772784456575' || v.name.includes('管家')); 

            optionsHtml += `<optgroup label="── 智能体调度 ──" style="color:#888;">`;
            if (receptionist) {
                const modeIcon = receptionist.exec_mode === 'cli' ? '💻 CLI' : '🌐 API';
                optionsHtml += `<option value="${receptionist.id}" style="color:#ffb74d; font-weight:bold;">[${modeIcon}] ${receptionist.icon} ${receptionist.name}</option>`;
            }
            if (manager) {
                const modeIcon = manager.exec_mode === 'cli' ? '💻 CLI' : '🌐 API';
                optionsHtml += `<option value="${manager.id}" style="color:#d8b4fe; font-weight:bold;">[${modeIcon}] ${manager.icon} ${manager.name}</option>`;
            }
            optionsHtml += `</optgroup>`;
        }

        selector.innerHTML = optionsHtml;
        
        // 💡 接单员绝对优先锚点：如果当前没有值，或者跨模式丢失，强制回退给接待员！
        if (oldVal && selector.querySelector(`option[value="${oldVal}"]`)) {
            selector.value = oldVal;
        } else if (selector.querySelector(`option[value="ai_receptionist"]`)) {
            selector.value = 'ai_receptionist';
        } else if (selector.options.length > 0) {
            selector.selectedIndex = 0;
        }
    } catch (e) {
        console.error("加载模型列表失败:", e);
    }
};

window.extractMemory = async function() {
    const container = document.getElementById('memory-container');
    if (!container || !currentChatId) return;
    try {
        const res = await fetch(`/api/chats/${currentChatId}`);
        const json = await res.json();
        const sessionState = json.data.session_state || {};
        
        container.innerHTML = '';
        
        const ignoredKeys = ['system_status', 'attached_workflow', 'completed_nodes', 'pending_nodes'];
        let hasValidMemory = false;

        for (const [key, value] of Object.entries(sessionState)) {
            if (value === null || ignoredKeys.includes(key)) continue;
            if (key.startsWith('节点产出_') && (typeof value === 'string' && (value.includes('等待下一步') || value.includes('管家无响应')))) continue;

            hasValidMemory = true;
            let displayKey = key;
            if (key === 'user_corrections') displayKey = '厂长绝对纲领';
            else if (key.startsWith('节点产出_')) displayKey = key.replace('节点产出_', '流水线结论: ');

            const card = document.createElement('div');
            card.className = 'memory-card';
            card.innerHTML = `
                <div class="memory-key">
                    📌 ${displayKey}
                    <button class="memory-del-btn" onclick="window.deleteMemoryItem('${key}', this)">[删除]</button>
                </div>
                <pre class="memory-val">${typeof value === 'string' ? value : JSON.stringify(value, null, 2)}</pre>
            `;
            container.appendChild(card);
        }

        if (!hasValidMemory) {
            container.innerHTML = `
                <div style="color: #777; text-align: center; font-size: 0.85rem; line-height: 1.6; margin-top: 30px;">
                    <div style="color: #eee; font-weight: bold; margin-bottom: 6px; font-size: 1rem;">底层思想钢印为空</div>
                    在聊天窗口中，点击 AI 回复下方的<br><b>[📌 蒸馏核心结论]</b> 按钮<br>即可将其转化为本频道的系统潜意识。
                </div>`;
        }
    } catch (e) {
        console.error("加载钢印失败:", e);
    }
};

function initDraggableInput() {
    const wrapper = document.getElementById('drag-wrapper');
    const handle = document.getElementById('drag-handle');
    if(!wrapper || !handle) return;
    let isDragging = false, startX, startY, initialLeft, initialTop;
    handle.addEventListener('pointerdown', (e) => {
        isDragging = true; startX = e.clientX; startY = e.clientY;
        const rect = wrapper.getBoundingClientRect();
        wrapper.style.left = `${rect.left}px`; wrapper.style.top = `${rect.top}px`;
        wrapper.style.right = 'auto'; wrapper.style.bottom = 'auto';
        initialLeft = rect.left; initialTop = rect.top;
        handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        let newX = initialLeft + (e.clientX - startX);
        let newY = initialTop + (e.clientY - startY);
        newX = Math.max(0, Math.min(newX, window.innerWidth - wrapper.offsetWidth));
        newY = Math.max(0, Math.min(newY, window.innerHeight - wrapper.offsetHeight));
        wrapper.style.left = `${newX}px`; wrapper.style.top = `${newY}px`;
    });
    handle.addEventListener('pointerup', (e) => { isDragging = false; handle.releasePointerCapture(e.pointerId); });
}

window.switchRightTab = function(tabName) {
    document.getElementById('tab-assets').style.display = tabName === 'assets' ? 'flex' : 'none';
    document.getElementById('tab-workflow').style.display = tabName === 'workflow' ? 'flex' : 'none';
    document.getElementById('tab-memory').style.display = tabName === 'memory' ? 'flex' : 'none';
    document.getElementById('tab-report').style.display = tabName === 'report' ? 'flex' : 'none'; 
    
    document.getElementById('tab-btn-assets').classList.toggle('active', tabName === 'assets');
    document.getElementById('tab-btn-workflow').classList.toggle('active', tabName === 'workflow');
    document.getElementById('tab-btn-memory').classList.toggle('active', tabName === 'memory');
    document.getElementById('tab-btn-report').classList.toggle('active', tabName === 'report'); 
    
    if(tabName === 'memory' && typeof window.extractMemory === 'function') window.extractMemory();
};

window.fetchMorningReport = async function() {
    const box = document.getElementById('report-content');
    if(!box) return;
    box.innerHTML = '<span style="color:#ffb74d">正在打开管家信箱...</span>';
    try {
        const res = await fetch('/storage/morning_report.md?v=' + Date.now());
        if (res.ok) {
            const text = await res.text();
            box.innerHTML = text; 
        } else {
            box.innerHTML = '📭 今日暂无报告，后台管家可能未排程任务。';
        }
    } catch(e) {
        box.innerHTML = '【系统提示】：读取信箱失败。';
    }
};

window.extractAssets = async function() {
    const assetGrid = document.getElementById('asset-grid');
    if (!assetGrid) return;
    try {
        const res = await fetch('/api/gallery');
        if (!res.ok) return;
        const json = await res.json();
        const assets = json.data || [];
        
        _explorerData = assets.filter(a => {
            const aDomain = (a.meta && a.meta.domain_id) ? a.meta.domain_id : 'factory_dev';
            const curDomain = currentDomain || 'factory_dev';
            return aDomain === curDomain;
        });
        
        window.renderExplorer(_explorerCurrentPath);
    } catch (e) {
        console.error("同步资产库失败:", e);
    }
};

window.renderExplorer = function(path) {
    _explorerCurrentPath = path;
    const assetGrid = document.getElementById('asset-grid');
    const pathBar = document.getElementById('exp-address-bar');
    if(pathBar) pathBar.innerText = '🖥️ 本机 \\ ' + (path === '/' ? '资产总仓' : '资产总仓' + path.replace(/\//g, ' \\ '));
    
    if (_explorerData.length === 0) {
        assetGrid.innerHTML = '<div style="color: #777; text-align: center; margin-top: 50px; grid-column: 1 / -1; font-size: 0.85rem;">当前频道暂无专属数字资产</div>';
        return;
    }

    let folders = new Set();
    let files = [];

    _explorerData.forEach(asset => {
        let category = asset.meta?.category || asset.meta?.type || '未分类杂项';
        
        if (category === 'standard_image') category = '静态图纸_Images';
        if (category === 'vr_panorama') category = '全景渲染_Panoramas';
        if (category === 'html_app') category = '交互程序_HTML';
        if (category === 'cli_output') category = '代码与日志_Code';

        if (path === '/') {
            folders.add(category);
        } else if (path === '/' + category) {
            files.push(asset);
        }
    });

    assetGrid.innerHTML = '';

    if (path === '/') {
        folders.forEach(folderName => {
            const div = document.createElement('div');
            div.className = 'exp-item exp-folder';
            div.onclick = () => window.renderExplorer('/' + folderName);
            div.innerHTML = `
                <div class="exp-icon">📁</div>
                <div class="exp-name">${folderName}</div>
            `;
            assetGrid.appendChild(div);
        });
    } else {
        if (files.length === 0) {
            assetGrid.innerHTML = '<div style="color: #555; grid-column: 1/-1; text-align:center; margin-top:20px;">文件夹为空</div>';
            return;
        }

        files.forEach(asset => {
            const div = document.createElement('div');
            div.className = 'exp-item exp-file';
            
            const tipText = asset.meta && asset.meta.user_input ? asset.meta.user_input.replace(/"/g, '&quot;') : '系统资产';
            const filename = asset.filename.toLowerCase();
            
            let iconHtml = '';
            let clickAction = `window.open('${asset.image_url}', '_blank')`; 

            if (filename.endsWith('.html') || filename.endsWith('.htm')) {
                iconHtml = `<div class="exp-icon-large" style="color:#ff5f56;">🌐</div>`;
                clickAction = `window.openHtmlPreview('${asset.image_url}', '${asset.filename}')`;
            } 
            else if (filename.endsWith('.mp4') || filename.endsWith('.webm')) {
                iconHtml = `<div class="exp-icon-large" style="color:#00a8e8;">🎬</div>`;
            } 
            else if (filename.endsWith('.mp3') || filename.endsWith('.wav')) {
                iconHtml = `<div class="exp-icon-large" style="color:#f59f00;">🎵</div>`;
            } 
            else if (filename.endsWith('.py') || filename.endsWith('.json') || filename.endsWith('.js') || filename.endsWith('.txt')) {
                iconHtml = `<div class="exp-icon-large" style="color:#4caf50;">📄</div>`;
            }
            else {
                iconHtml = `<img src="${asset.image_url}" class="exp-img-thumb" loading="lazy">`;
            }

            div.setAttribute('onclick', clickAction);
            div.innerHTML = `
                <div class="exp-thumb-wrapper">${iconHtml}</div>
                <div class="exp-name" title="${tipText}">${asset.filename}</div>
            `;
            assetGrid.appendChild(div);
        });
    }
};

window.explorerNavUp = function() {
    if (_explorerCurrentPath !== '/') {
        window.renderExplorer('/');
    }
};

// 💡 V16.0 唤醒全息双轨视界 (侧滑半屏模式)
window.openHtmlPreview = function(url, title) {
    const pane = document.getElementById('holographic-preview-pane');
    const iframe = document.getElementById('holo-iframe');
    const titleEl = document.getElementById('holo-title');
    
    // 如果找不到新版容器，回退到兜底模式 (防止旧版缓存报错)
    if (!pane) {
        console.warn("全息容器未就绪，将新窗口打开");
        window.open(url, '_blank');
        return;
    }
    
    if(pane && iframe && titleEl) {
        // 先让侧屏滑出来，再加载文档，极致丝滑
        pane.classList.add('open'); 
        iframe.src = url;
        titleEl.innerText = '📄 ' + title;
    }
};

window.closeHtmlPreview = function() {
    const pane = document.getElementById('holographic-preview-pane');
    if(pane) {
        pane.classList.remove('open');
        // 延迟 400ms 清空 iframe，等待收起动画结束，释放内存
        setTimeout(() => { document.getElementById('holo-iframe').src = ''; }, 400);
    }
};