// [webroot/work.js] - AI 工厂流水线 DAG 核心逻辑 (星门逻辑注入版 + 多维仓储检索)

const FACTORY_SKILLS = {
    inputs: [
        { id: "nature_chat", icon: "💬", label: "监听对话输入 (默认)" },
        { id: "context_memory", icon: "🧠", label: "继承记忆上下文" },
        { id: "image_upload", icon: "🖼️", label: "强制要求上传图纸/截图" },
        { id: "cli_feedback", icon: "💻", label: "监听 CLI 本地反馈" },
        { id: "voice_recognition", icon: "🎤", label: "监听语音/音频输入" }
    ],
    outputs: {
        "🚀 核心生产力 (CLI 优先)": [
            { id: "agent_async_task", icon: "🌌", label: "星门：交由 CLI 后台异步研发 (主力)" },
            { id: "sandbox_terminal", icon: "💻", label: "终端：交由 CLI 沙盒直接执行 (主力)" }
        ],
        "☁️ 云端算力辅助 (API 备用兜底)": [
            { id: "flagship_delivery", icon: "🗡️", label: "旗舰 API：高维架构与逻辑统筹" },
            { id: "swarm_distill", icon: "🐝", label: "蜂群 API：高并发数据清洗提纯" },
            { id: "text_comm", icon: "💬", label: "标准 API：结构化输出/代码生成" },
            { id: "condition", icon: "⚖️", label: "逻辑引擎：条件判定与路由分支" },
            { id: "agent_tools", icon: "🛠️", label: "工具调用：API 挂载外部网络插件" }
        ],
        "🏠 视觉与空间设计中台": [
            { id: "img_analysis", icon: "👁️", label: "视觉分析：读图与特征总结" },
            { id: "html", icon: "🖼️", label: "空间渲染：生成 VR 360°全景" },
            { id: "image", icon: "🎨", label: "图像生成：绘制静态效果图" },
            { id: "agent_hotspots", icon: "🎯", label: "空间计算：计算并挂载 VR 热点" }
        ]
    }
};

// ======== 核心状态管理 (回归本地安全作用域) ========
let scale = 1, panX = 0, panY = 0;
let nodes = [];
let edges = []; 

let currentNodeForAI = null;
let currentLoadedId = null; 
let currentLoadedName = ""; 
let AI_VENDORS = []; 

// 💡 V3.0 弃用旧版字典，启用全域 DNA 基因库
let DNA_VAULT = []; 

let viewport, canvas, svgLayer, mapCanvas;

let waitingForConnectionSourceId = null;
let waitingConnectionType = 'major'; 
let tempMouseX = 0, tempMouseY = 0;      
let minimapState = { scale: 1, offsetX: 0, offsetY: 0 };
let lastClientX = 0, lastClientY = 0;

let isPanning = false, startPanX = 0, startPanY = 0;
let isPinching = false, initialPinchDist = 0, initialPinchScale = 1;

// 💡 增强：云端模板缓存
let _cachedCloudTemplates = {};

document.addEventListener("DOMContentLoaded", () => {
    viewport = document.getElementById('viewport');
    canvas = document.getElementById('canvas');
    svgLayer = document.getElementById('svg-layer');
    mapCanvas = document.getElementById('minimap-canvas');

    if(!viewport || !canvas || !svgLayer) {
        console.error("DOM 节点缺失，UI 无法渲染！");
        return;
    }

    setupWorkspaceInteractions();
    setupMinimapInteractions();
    
    const fileImport = document.getElementById('file-import');
    if (fileImport) {
        fileImport.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => parseAndApplyLocalJSON(ev.target.result, file.name);
            reader.readAsText(file);
            e.target.value = ''; 
        });
    }
});

window.onload = async () => {
    await Promise.all([loadAIVendors(), loadDNAVault()]); // 并行极速拉取躯壳与灵魂
    initCanvasPosition(); 
    createNode(100, 100, 'major'); 
};

// 💡 V3.0 新增：加载 DNA 基因库
async function loadDNAVault() {
    try {
        const res = await fetch('/api/config/dna');
        if (res.ok) {
            const data = await res.json();
            DNA_VAULT = data.vault || [];
        }
    } catch(e) { console.error("基因图谱拉取失败", e); }
}

function setupWorkspaceInteractions() {
    viewport.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.node') || e.target.closest('#minimap-container')) return; 
        
        if (waitingForConnectionSourceId) { 
            cancelConnectionMode(); 
            return; 
        }
        
        if (!isPinching) {
            isPanning = true;
            startPanX = e.clientX - panX;
            startPanY = e.clientY - panY;
            viewport.setPointerCapture(e.pointerId);
        }
    });

    window.addEventListener('pointermove', (e) => {
        lastClientX = e.clientX;
        lastClientY = e.clientY;

        if (isPanning) {
            panX = e.clientX - startPanX;
            panY = e.clientY - startPanY;
            updateTransform();
        }
        if (waitingForConnectionSourceId) {
            const rect = canvas.getBoundingClientRect();
            tempMouseX = (e.clientX - rect.left) / scale;
            tempMouseY = (e.clientY - rect.top) / scale;
            drawLines();
        }
    });

    viewport.addEventListener('pointerup', (e) => {
        if(isPanning) {
            isPanning = false;
            viewport.releasePointerCapture(e.pointerId);
        }
    });

    viewport.addEventListener('touchstart', (e) => {
        if (e.target.closest('.node') || e.target.closest('#minimap-container')) return; 
        if (e.touches.length === 2) {
            isPanning = false; 
            isPinching = true;
            initialPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            initialPinchScale = scale;
        }
    }, {passive: false});

    viewport.addEventListener('touchmove', (e) => {
        if (isPinching && e.touches.length === 2) {
            e.preventDefault(); 
            const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            if (initialPinchDist === 0) initialPinchDist = dist;
            let newScale = Math.min(Math.max(0.15, initialPinchScale * (dist / initialPinchDist)), 2.5);
            const mouseX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - viewport.getBoundingClientRect().left;
            const mouseY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - viewport.getBoundingClientRect().top;
            panX = mouseX - (mouseX - panX) * (newScale / scale);
            panY = mouseY - (mouseY - panY) * (newScale / scale);
            scale = newScale;
            updateTransform();
        }
    }, {passive: false});

    viewport.addEventListener('touchend', (e) => { if (e.touches.length < 2) isPinching = false; });

    viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = viewport.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const delta = -e.deltaY * 0.001;
        let newScale = Math.min(Math.max(0.15, scale + delta), 2.5); 
        panX = mouseX - (mouseX - panX) * (newScale / scale);
        panY = mouseY - (mouseY - panY) * (newScale / scale);
        scale = newScale;
        updateTransform();
    }, { passive: false });
}

function setupMinimapInteractions() {
    mapCanvas.addEventListener('pointerdown', (e) => {
        if (document.getElementById('minimap-container').classList.contains('collapsed')) return;
        
        e.stopPropagation(); 
        if (waitingForConnectionSourceId) cancelConnectionMode();

        if (nodes.length === 0) return;
        const rect = mapCanvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const targetRealX = (clickX - minimapState.offsetX) / minimapState.scale;
        const targetRealY = (clickY - minimapState.offsetY) / minimapState.scale;

        panX = (window.innerWidth / 2) - (targetRealX * scale);
        panY = (window.innerHeight / 2) - (targetRealY * scale);
        
        canvas.style.transition = 'none';
        updateTransform();
    });
}

function initCanvasPosition() {
    panX = window.innerWidth / 2 - 150; 
    panY = window.innerHeight / 2 - 150;
    updateTransform();
}

async function loadAIVendors() {
    try {
        const res = await fetch('/api/config/ai');
        if (res.ok) {
            const data = await res.json();
            let flatVendors = [];
            if (data.categories) {
                data.categories.forEach(cat => {
                    cat.nodes.forEach(n => {
                        if (n.enabled !== false) flatVendors.push(n);
                    });
                });
            } else if (data.vendors) {
                flatVendors = data.vendors;
            }
            AI_VENDORS = flatVendors;
            
            // 💡 [新增] 缓存全局钢印字典
            if (data.system_prompts) {
                GLOBAL_SYSTEM_PROMPTS = data.system_prompts;
            }

            const selectEl = document.getElementById('ai-gen-vendor');
            if(selectEl) selectEl.innerHTML = AI_VENDORS.map(v => `<option value="${v.id}">${v.name}</option>`).join('');
        }
    } catch (e) {}
}

function getIconHtml(icon, styleClass = "") {
    if (!icon) return '🤖';
    if (icon.startsWith('http') || icon.startsWith('/') || icon.startsWith('data:')) 
        return `<img src="${icon}" class="${styleClass}" onerror="this.outerHTML='🤖'">`;
    return `<span class="${styleClass}">${icon}</span>`;
}

window.toggleDropdown = function() { document.getElementById("actionDropdown").classList.toggle("show"); }
window.onclick = function(event) {
    if (!event.target.matches('.dropdown-btn')) {
        var dropdowns = document.getElementsByClassName("dropdown-content");
        for (var i = 0; i < dropdowns.length; i++) {
            if (dropdowns[i].classList.contains('show')) dropdowns[i].classList.remove('show');
        }
    }
}
window.closeModal = function(id) { document.getElementById(id).classList.remove('show'); }

// 💡 修复：正确呼出多维云端仓库
window.showLoadModal = function() { 
    fetchCloudTemplatesAndRender(); 
    document.getElementById('modal-load').classList.add('show'); 
}

window.openAIGenModal = function() { document.getElementById('modal-ai-gen').classList.add('show'); }

function updateTransform() {
    if(!canvas) return;
    canvas.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    if (waitingForConnectionSourceId) {
        const rect = canvas.getBoundingClientRect();
        tempMouseX = (lastClientX - rect.left) / scale;
        tempMouseY = (lastClientY - rect.top) / scale;
    }
    drawLines(); 
    updateMinimap(); 
}

function getNodeThemeClass(nodeObj) {
    if (!nodeObj) return 'theme-recog';
    const isLeaf = !edges.some(e => e.source === nodeObj.id);
    if (isLeaf && nodeObj.deliverType !== 'condition') return 'theme-leaf';
    if (nodeObj.deliverType === 'condition') return 'theme-cond';
    if (nodeObj.deliverType === 'swarm_distill') return 'theme-swarm';
    if (nodeObj.deliverType === 'sandbox_terminal' || nodeObj.deliverType === 'agent_async_task') return 'theme-sandbox';
    if (nodeObj.workMode === 'creation') return 'theme-create';
    return 'theme-recog'; 
}

function getInputOptions(nodeObj) {
    return FACTORY_SKILLS.inputs.map(opt => `<option value="${opt.id}" ${nodeObj.inputType === opt.id ? 'selected' : ''}>${opt.icon} ${opt.label}</option>`).join('');
}

function getOutputOptions(nodeObj) {
    let optionsHtml = '';
    for (const [groupName, skills] of Object.entries(FACTORY_SKILLS.outputs)) {
        optionsHtml += `<optgroup label="${groupName}">`;
        optionsHtml += skills.map(opt => `<option value="${opt.id}" ${nodeObj.deliverType === opt.id ? 'selected' : ''}>${opt.icon} ${opt.label}</option>`).join('');
        optionsHtml += `</optgroup>`;
    }
    return optionsHtml;
}

function createNode(x, y, type = 'major', existingData = null) {
    const id = existingData ? existingData.id : 'n_' + Date.now() + Math.floor(Math.random()*1000);
    const nodeObj = existingData || { 
        id, x, y, type, 
        title: type === 'major' ? '核心生产节点' : '并行研发分支',
        instruction: '', selectedAIs: [], workMode: 'recognition',
        inputType: 'nature_chat', deliverType: 'text_comm', 
        requiresReview: false, delay_seconds: 0, 
        is_dispatcher: false, is_loop_trigger: false,
        collapsed: false, locked: true, override_base: false // ✅ 新增：默认不剥离
    };
    
    if(nodeObj.collapsed === undefined) nodeObj.collapsed = false;
    if(nodeObj.locked === undefined) nodeObj.locked = true;
    if(nodeObj.inputType === undefined) nodeObj.inputType = 'nature_chat';
    if(nodeObj.delay_seconds === undefined) nodeObj.delay_seconds = 0;
    if(nodeObj.is_dispatcher === undefined) nodeObj.is_dispatcher = false;
    if(nodeObj.is_loop_trigger === undefined) nodeObj.is_loop_trigger = false;
    if(nodeObj.override_base === undefined) nodeObj.override_base = false; // ✅ 新增：反序列化防空盾
    
    nodes.push(nodeObj);

    const el = document.createElement('div');
    el.id = id;
    el.style.left = nodeObj.x + 'px';
    el.style.top = nodeObj.y + 'px';

    renderNodeUI(el, nodeObj);
    canvas.appendChild(el);
    
    let isNodeDragging = false;
    let nDragOffsetX = 0, nDragOffsetY = 0;

    el.addEventListener('pointerdown', (e) => {
        if(e.target.closest('.node-port') || e.target.closest('.node-lock-btn') || e.target.closest('.collapse-btn') || e.target.closest('.close-btn')) return;
        
        if (!nodeObj.locked) {
            const ignoredTags = ['INPUT', 'TEXTAREA', 'SELECT', 'OPTION'];
            if (ignoredTags.includes(e.target.tagName) || e.target.closest('.mode-selector') || e.target.closest('.node-btns') || e.target.closest('.check-row')) return;
        }
        
        e.stopPropagation();
        isNodeDragging = true;
        el.setPointerCapture(e.pointerId);
        
        nDragOffsetX = e.clientX / scale - nodeObj.x;
        nDragOffsetY = e.clientY / scale - nodeObj.y;
        
        document.querySelectorAll('.node').forEach(n => n.classList.remove('active'));
        document.querySelectorAll('.node').forEach(n => n.style.zIndex = 10);
        el.style.zIndex = 100;
        el.classList.add('active');
        
        // 💡 [新增] 触发节点属性面板与思想钢印的渲染
        if (typeof renderNodeProperties === 'function') {
            renderNodeProperties(nodeObj.id);
        }
    });

    el.addEventListener('pointermove', (e) => {
        if (isNodeDragging) {
            nodeObj.x = e.clientX / scale - nDragOffsetX;
            nodeObj.y = e.clientY / scale - nDragOffsetY;
            el.style.left = nodeObj.x + 'px';
            el.style.top = nodeObj.y + 'px';
            drawLines();
            updateMinimap();
            
            if (document.activeElement && document.activeElement.tagName !== 'BODY') {
                document.activeElement.blur();
            }
        }
    });

    el.addEventListener('pointerup', (e) => {
        if(isNodeDragging){
            isNodeDragging = false;
            el.releasePointerCapture(e.pointerId);
        }
    });

    renderNodeAIPool(id);
}

window.toggleLock = function(e, id) {
    e.stopPropagation();
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    node.locked = !node.locked;
    const el = document.getElementById(id);
    renderNodeUI(el, node); 
    renderNodeAIPool(id);
}

window.toggleCollapse = function(e, id) {
    e.stopPropagation();
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    node.collapsed = !node.collapsed;
    const el = document.getElementById(id);
    renderNodeUI(el, node);
    setTimeout(drawLines, 50); 
    updateMinimap();
};

function reRenderAllNodes() {
    nodes.forEach(n => {
        const el = document.getElementById(n.id);
        if (el) {
            renderNodeUI(el, n);
            // 💡 V18.2 终极补丁：重绘外壳后，强行补填 AI 头像，拒绝导入变盲盒
            if (typeof window.renderNodeAIPool === 'function') {
                window.renderNodeAIPool(n.id);
            }
        }
    });
    drawLines();
    updateMinimap();
}

window.setWorkMode = function(id, mode) {
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    node.workMode = mode;
    reRenderAllNodes();
    renderNodeAIPool(id);
}

function hasInputEdges(id) {
    return edges.some(e => e.target === id);
}

window.updateNodeData = function(id, key, val) { 
    const node = nodes.find(n => n.id === id);
    if(node) node[key] = val; 
}

function renderNodeUI(el, nodeObj) {
    const isCreation = nodeObj.workMode === 'creation';
    const isCondition = nodeObj.deliverType === 'condition';
    const themeClass = getNodeThemeClass(nodeObj);
    
    el.className = `node ${nodeObj.type} ${themeClass} ${nodeObj.collapsed ? 'collapsed' : ''} ${nodeObj.locked ? 'locked' : 'unlocked'}`;
    
    let instructionLabel = isCreation ? '✨ 给 AI 的执行指令' : '👁️ 提取/分析规则';
    let placeholderText = isCreation ? "例如：根据提取的信息生成一份系统接口代码..." : "例如：提取上面文档中的所有 Shell 命令...";
    if (isCondition) {
        instructionLabel = '⚖️ 设定路由判断规则';
        placeholderText = "如果发现报错输出 decision:'修复'; 否则输出 decision:'发布'";
    }

    const isTerminal = nodeObj.deliverType === 'sandbox_terminal' || nodeObj.deliverType === 'agent_async_task';
    const assetTipHtml = (isCreation && isTerminal) 
        ? `<div style="font-size:0.7rem; color:var(--color-sandbox); margin-top:4px; font-weight:bold; letter-spacing:0.5px;">
             💡 锻造实体文档，请在指令末尾追加要求：<span style="background:rgba(32,201,151,0.2); padding:2px 4px; border-radius:4px; user-select:all;">[[ASSET:/app/workspace/文件名.docx]]</span>
           </div>` 
        : '';
    
    const hasIn = hasInputEdges(nodeObj.id);
    if (hasIn) el.classList.add('has-input');
    else el.classList.remove('has-input');

    // 💡 提取引擎头像
    let aiIconHtml = "🤖";
    if (nodeObj.selectedAIs && nodeObj.selectedAIs.length > 0) {
        let vendor = AI_VENDORS.find(v => v.id === nodeObj.selectedAIs[0]);
        if (vendor && vendor.icon) {
            aiIconHtml = getIconHtml(vendor.icon);
        }
    }

    el.innerHTML = `
        <div class="node-lock-btn" onclick="toggleLock(event, '${nodeObj.id}')" title="点击解锁以编辑内容">
            ${nodeObj.locked ? '🔒' : '🔓'}
        </div>

        <div class="node-port node-port-in" onpointerdown="handlePortInClick(event, '${nodeObj.id}')">
            <span class="port-label">${hasIn ? '✂️ 点击切断连接' : '接收输入端'}</span>
        </div>
        
        <div class="node-header" style="display: flex; align-items: center; gap: 8px;">
            <button class="collapse-btn" onclick="toggleCollapse(event, '${nodeObj.id}')">▼</button>
            
            <div id="header-ai-icon-${nodeObj.id}" style="font-size: 1.2rem; pointer-events: none;" title="当前绑定引擎">${aiIconHtml}</div>
            
            <input class="node-title" style="flex: 1; min-width: 0;" value="${nodeObj.title}" placeholder="节点名称" onchange="updateNodeData('${nodeObj.id}', 'title', this.value)" onpointerdown="event.stopPropagation()">
            <span class="close-btn" onclick="confirmRemoveNode('${nodeObj.id}')" onpointerdown="event.stopPropagation()">×</span>
        </div>
        
        <div class="node-content">
            <div class="mode-selector" style="${isCondition ? 'display:none;' : ''}">
                <button class="mode-btn ${!isCreation?'active':''}" onclick="setWorkMode('${nodeObj.id}', 'recognition')" onpointerdown="event.stopPropagation()">👁️ 分析降噪</button>
                <button class="mode-btn ${isCreation?'active':''}" onclick="setWorkMode('${nodeObj.id}', 'creation')" onpointerdown="event.stopPropagation()">🎯 执行交付</button>
            </div>
            
            <div class="ai-select-area" onclick="openAIDock('${nodeObj.id}')" onpointerdown="event.stopPropagation()" id="ai-pool-${nodeObj.id}"></div>
            
            <div class="instruction-box">
                <label style="${isCondition ? 'color:#ffb74d' : ''}">${instructionLabel}</label>
                <textarea placeholder="${placeholderText}" onpointerdown="event.stopPropagation()" onchange="updateNodeData('${nodeObj.id}', 'instruction', this.value)">${nodeObj.instruction || ''}</textarea>
                ${assetTipHtml}
            </div>
            
            <div style="display:flex; gap:10px; margin-bottom: 8px;">
                <div class="form-row" style="flex:1;">
                    <label>输入源 (Input)</label>
                    <select onpointerdown="event.stopPropagation()" onchange="updateNodeData('${nodeObj.id}', 'inputType', this.value);">
                        ${getInputOptions(nodeObj)}
                    </select>
                </div>
                <div class="form-row" style="flex:1;">
                    <label>目标武器 (Output)</label>
                    <select onpointerdown="event.stopPropagation()" style="border-color: ${isCondition ? '#ffb74d' : '#444'};" 
                            onchange="updateNodeData('${nodeObj.id}', 'deliverType', this.value); reRenderAllNodes(); renderNodeAIPool('${nodeObj.id}');">
                        ${getOutputOptions(nodeObj)}
                    </select>
                </div>
            </div>
            
            <div style="display:flex; gap:10px; margin-bottom: 8px;">
                <div class="form-row" style="flex:1;">
                    <label style="color:#f59f00;">⏱️ 执行延时 (秒)</label>
                    <input type="number" min="0" max="300" placeholder="0" value="${nodeObj.delay_seconds || 0}" 
                           onpointerdown="event.stopPropagation()" 
                           onchange="updateNodeData('${nodeObj.id}', 'delay_seconds', parseInt(this.value) || 0)">
                </div>
                <div class="form-row" style="flex:2; justify-content:center;">
                    <div class="check-row" style="margin-top: 14px; padding: 6px 10px; ${isCondition ? 'display:none;' : ''}">
                        <input type="checkbox" id="check-${nodeObj.id}" ${nodeObj.requiresReview ? 'checked' : ''} onpointerdown="event.stopPropagation()" onchange="updateNodeData('${nodeObj.id}', 'requiresReview', this.checked)">
                        <label for="check-${nodeObj.id}" onpointerdown="event.stopPropagation()">人工质检拦截</label>
                    </div>
                </div>
            </div>

            <div style="margin-bottom: 12px; background: rgba(0,0,0,0.3); padding: 8px 10px; border-radius: 6px; border: 1px solid #333; ${isCondition ? 'display:none;' : ''}">
                <div style="font-size: 0.7rem; color: #888; margin-bottom: 6px; font-weight:bold;">👑 高级流程控制 (System Override)</div>
                
                <div class="check-row" style="${!isCreation ? '' : 'display:none;'} margin-top:0; padding:4px 0;">
                    <input type="checkbox" id="disp-${nodeObj.id}" ${nodeObj.is_dispatcher ? 'checked' : ''} onpointerdown="event.stopPropagation()" onchange="updateNodeData('${nodeObj.id}', 'is_dispatcher', this.checked)">
                    <label for="disp-${nodeObj.id}" onpointerdown="event.stopPropagation()" style="color:#4dabf7; font-weight:bold;">🔀 激活智能包工头 (动态调度算力)</label>
                </div>
                
                <div class="check-row" style="${isCreation ? '' : 'display:none;'} margin-top:0; padding:4px 0;">
                    <input type="checkbox" id="loop-${nodeObj.id}" ${nodeObj.is_loop_trigger ? 'checked' : ''} onpointerdown="event.stopPropagation()" onchange="updateNodeData('${nodeObj.id}', 'is_loop_trigger', this.checked)">
                    <label for="loop-${nodeObj.id}" onpointerdown="event.stopPropagation()" style="color:#d8b4fe; font-weight:bold;">♻️ 衔尾蛇节点 (重置并循环流水线)</label>
                </div>
            </div>

            <div class="node-btns">
                <button class="n-btn" onclick="addBranch('${nodeObj.id}', 'sub')" onpointerdown="event.stopPropagation()">👇 向下建分支</button>
                <button class="n-btn" style="background:var(--accent-color); color:#111" onclick="addBranch('${nodeObj.id}', 'major')" onpointerdown="event.stopPropagation()">👉 向右建主干</button>
            </div>
        </div>
        
        <div class="node-port node-port-out-major" onpointerdown="handlePortOutClick(event, '${nodeObj.id}', 'major')">
            <span class="port-label">主干输出 (右)</span>
        </div>
        <div class="node-port node-port-out-sub" onpointerdown="handlePortOutClick(event, '${nodeObj.id}', 'sub')">
            <span class="port-label">分支输出 (下)</span>
        </div>
    `;
}

window.handlePortOutClick = function(e, sourceId, type) {
    e.stopPropagation();
    if (waitingForConnectionSourceId === sourceId && waitingConnectionType === type) {
        cancelConnectionMode(); 
    } else {
        cancelConnectionMode(); 
        waitingForConnectionSourceId = sourceId;
        waitingConnectionType = type;
        document.body.classList.add('is-connecting'); 
        
        const el = document.getElementById(sourceId);
        const outPortClass = type === 'major' ? '.node-port-out-major' : '.node-port-out-sub';
        const outPort = el.querySelector(outPortClass);
        if(outPort) outPort.classList.add('waiting');

        const rect = canvas.getBoundingClientRect();
        tempMouseX = (e.clientX - rect.left) / scale;
        tempMouseY = (e.clientY - rect.top) / scale;
        drawLines();
    }
}

window.handlePortInClick = function(e, targetId) {
    e.stopPropagation();

    if (waitingForConnectionSourceId) {
        if (waitingForConnectionSourceId === targetId) {
            alert("禁止连接自己！");
            cancelConnectionMode(); return;
        }
        
        const exists = edges.some(edge => edge.source === waitingForConnectionSourceId && edge.target === targetId);
        if (!exists) {
            edges.push({
                source: waitingForConnectionSourceId,
                target: targetId,
                type: waitingConnectionType
            });
        }
        
        cancelConnectionMode();
        reRenderAllNodes(); 
    } else if (hasInputEdges(targetId)) {
        if (confirm("✂️ 确认切断该节点的所有输入连线吗？")) {
            edges = edges.filter(edge => edge.target !== targetId);
            reRenderAllNodes(); 
        }
    }
}

function cancelConnectionMode() {
    if (waitingForConnectionSourceId) {
        const el = document.getElementById(waitingForConnectionSourceId);
        if (el) {
            const outPortM = el.querySelector('.node-port-out-major');
            const outPortS = el.querySelector('.node-port-out-sub');
            if(outPortM) outPortM.classList.remove('waiting');
            if(outPortS) outPortS.classList.remove('waiting');
        }
    }
    waitingForConnectionSourceId = null;
    document.body.classList.remove('is-connecting');
    drawLines(); 
}

function drawLines() {
    svgLayer.innerHTML = '';
    
    edges.forEach(edge => {
        const pEl = document.getElementById(edge.source);
        const cEl = document.getElementById(edge.target);
        if (!pEl || !cEl) return;
        
        const parent = nodes.find(n => n.id === edge.source);
        const node = nodes.find(n => n.id === edge.target);
        if (!parent || !node) return;
        
        const themeClass = getNodeThemeClass(parent); 
        
        let strokeColor = '#555';
        if (themeClass === 'theme-recog') strokeColor = 'var(--color-recog)';
        else if (themeClass === 'theme-create') strokeColor = 'var(--color-create)';
        else if (themeClass === 'theme-cond') strokeColor = 'var(--color-cond)';
        else if (themeClass === 'theme-swarm') strokeColor = 'var(--color-swarm)';
        else if (themeClass === 'theme-sandbox') strokeColor = 'var(--color-sandbox)';
        
        let x1, y1, cp1x, cp1y;
        
        if (edge.type === 'major') {
            x1 = parent.x + pEl.offsetWidth + 25; 
            y1 = parent.y + (parent.collapsed ? 35 : pEl.offsetHeight / 2);
            cp1x = x1 + Math.max(Math.abs(node.x - x1) * 0.5, 40);
            cp1y = y1;
        } else {
            x1 = parent.x + pEl.offsetWidth / 2; 
            y1 = parent.y + (parent.collapsed ? 70 : pEl.offsetHeight) + 25;
            cp1x = x1;
            cp1y = y1 + Math.max(Math.abs(node.y - y1) * 0.5, 40);
        }
        
        const x2 = node.x - 25; 
        const y2 = node.y + (node.collapsed ? 35 : cEl.offsetHeight / 2);
        const cp2x = x2 - Math.max(Math.abs(x2 - x1) * 0.5, 40);
        const cp2y = y2;

        const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
        line.setAttribute("class", `connector`);
        line.setAttribute("stroke", strokeColor);
        if (edge.type === 'sub') line.setAttribute("stroke-dasharray", "6,4"); 
        
        line.setAttribute("d", `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`);
        svgLayer.appendChild(line);
    });

    if (waitingForConnectionSourceId) {
        const parent = nodes.find(n => n.id === waitingForConnectionSourceId);
        if(!parent) return;
        const pEl = document.getElementById(parent.id);
        if (pEl) {
            let x1, y1, cp1x, cp1y;
            if (waitingConnectionType === 'major') {
                x1 = parent.x + pEl.offsetWidth + 25; 
                y1 = parent.y + (parent.collapsed ? 35 : pEl.offsetHeight / 2);
                cp1x = x1 + Math.max(Math.abs(tempMouseX - x1) * 0.5, 40);
                cp1y = y1;
            } else {
                x1 = parent.x + pEl.offsetWidth / 2; 
                y1 = parent.y + (parent.collapsed ? 70 : pEl.offsetHeight) + 25;
                cp1x = x1;
                cp1y = y1 + Math.max(Math.abs(tempMouseY - y1) * 0.5, 40);
            }
            
            const x2 = tempMouseX; const y2 = tempMouseY;
            const cp2x = x2 - 40; const cp2y = y2;

            const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
            line.setAttribute("class", "connector temp");
            line.setAttribute("d", `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`);
            svgLayer.appendChild(line);
        }
    }
}

window.confirmRemoveNode = function(id) {
    if (confirm("删除此节点？其相关的连线也会被断开。")) {
        nodes = nodes.filter(n => n.id !== id);
        edges = edges.filter(e => e.source !== id && e.target !== id);
        const el = document.getElementById(id);
        if (el) el.remove();
        reRenderAllNodes();
    }
}

function findEmptySlot(startX, startY, stepX, stepY) {
    let targetX = startX;
    let targetY = startY;
    let isOccupied = true;
    let attempts = 0;
    
    while (isOccupied && attempts < 20) {
        isOccupied = nodes.some(n => Math.abs(n.x - targetX) < 100 && Math.abs(n.y - targetY) < 100);
        if (isOccupied) targetY += stepY; 
        attempts++;
    }
    return { x: targetX, y: targetY };
}

window.addBranch = function(sourceId, type) {
    const parent = nodes.find(n => n.id === sourceId);
    if(!parent) return;
    const stepX = 420; 
    const stepY = 350; 
    
    let initialX = parent.x;
    let initialY = parent.y;
    
    if (type === 'major') {
        initialX += stepX;
    } else { 
        initialY += stepY;
    }

    const safePos = findEmptySlot(initialX, initialY, stepX, stepY);

    const newNodeId = 'n_' + Date.now() + Math.floor(Math.random()*1000);
    const newNode = { 
        id: newNodeId, x: safePos.x, y: safePos.y, type: type,
        title: type === 'major' ? '主干节点' : '子分支',
        instruction: '', selectedAIs: [], workMode: 'recognition',
        inputType: 'context_memory', deliverType: 'text_comm', 
        requiresReview: false, delay_seconds: 0, 
        is_dispatcher: false, is_loop_trigger: false,
        collapsed: false, locked: false
    };
    
    createNode(safePos.x, safePos.y, type, newNode);
    edges.push({ source: sourceId, target: newNodeId, type: type });
    reRenderAllNodes(); 
}

window.toggleMinimap = function() {
    const container = document.getElementById('minimap-container');
    const icon = document.getElementById('minimap-toggle-icon');
    container.classList.toggle('collapsed');
    icon.innerText = container.classList.contains('collapsed') ? '▲' : '▼';
}

function updateMinimap() {
    if(!mapCanvas) return;
    mapCanvas.innerHTML = '';
    if (nodes.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(n => {
        minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x + 340); maxY = Math.max(maxY, n.y + (n.collapsed ? 80 : 380));
    });

    if (maxX - minX < 10) { maxX += 400; minX -= 400; }
    if (maxY - minY < 10) { maxY += 400; minY -= 400; }

    const mapW = mapCanvas.clientWidth, mapH = mapCanvas.clientHeight;
    const contentW = maxX - minX, contentH = maxY - minY;
    
    minimapState.scale = Math.min(mapW / contentW, mapH / contentH) * 0.85;
    minimapState.offsetX = (mapW - contentW * minimapState.scale) / 2 - minX * minimapState.scale;
    minimapState.offsetY = (mapH - contentH * minimapState.scale) / 2 - minY * minimapState.scale;

    nodes.forEach(n => {
        const el = document.createElement('div');
        el.className = 'minimap-node';
        el.style.left = (n.x * minimapState.scale + minimapState.offsetX) + 'px';
        el.style.top = (n.y * minimapState.scale + minimapState.offsetY) + 'px';
        el.style.width = (340 * minimapState.scale) + 'px';
        el.style.height = ((n.collapsed ? 80 : 300) * minimapState.scale) + 'px';
        
        const themeClass = getNodeThemeClass(n);
        if (themeClass === 'theme-leaf') el.style.background = 'var(--color-leaf)';
        else if (themeClass === 'theme-cond') el.style.background = 'var(--color-cond)';
        else if (themeClass === 'theme-create') el.style.background = 'var(--color-create)';
        else if (themeClass === 'theme-swarm') el.style.background = 'var(--color-swarm)';
        else if (themeClass === 'theme-sandbox') el.style.background = 'var(--color-sandbox)';
        else el.style.background = 'var(--color-recog)';
        
        mapCanvas.appendChild(el);
    });

    const vpRect = document.createElement('div');
    vpRect.className = 'minimap-viewport';
    vpRect.style.left = ((-panX / scale) * minimapState.scale + minimapState.offsetX) + 'px';
    vpRect.style.top = ((-panY / scale) * minimapState.scale + minimapState.offsetY) + 'px';
    vpRect.style.width = ((window.innerWidth / scale) * minimapState.scale) + 'px';
    vpRect.style.height = ((window.innerHeight / scale) * minimapState.scale) + 'px';
    mapCanvas.appendChild(vpRect);
}

// 💡 绝杀改造 1：强容错数据挂载引擎 (解决 AI 扁平化数据无法载入的报错 Bug)
function applyWorkflow(wf) {
    nodes = []; edges = [];
    document.querySelectorAll('.node').forEach(n => n.remove());
    
    // AI生成的通常没有 data 包裹，我们要智能探测
    const actualData = wf.data ? wf.data : wf;
    
    scale = actualData.scale || 1; 
    panX = actualData.posX || 0; 
    panY = actualData.posY || 0;
    
    if (actualData.edges && Array.isArray(actualData.edges)) {
        edges = actualData.edges;
    } else if (actualData.nodes && Array.isArray(actualData.nodes)) {
        // 如果没有边缘定义，尝试从 parentId 重建
        actualData.nodes.forEach(n => {
            if (n.parentId) edges.push({ source: n.parentId, target: n.id, type: n.type || 'major' });
        });
    }
    
    if (actualData.nodes && Array.isArray(actualData.nodes)) {
        actualData.nodes.forEach((n, idx) => {
            if (n.x === undefined) n.x = idx * 420;
            if (n.y === undefined) n.y = 150 + (n.type === 'sub' ? 350 : 0);
            if (n.locked === undefined) n.locked = true;
            if (n.inputType === undefined) n.inputType = 'nature_chat';
            if (n.delay_seconds === undefined) n.delay_seconds = 0; 
            
            // 确保反序列化时载入开关状态
            if (n.is_dispatcher === undefined) n.is_dispatcher = false;
            if (n.is_loop_trigger === undefined) n.is_loop_trigger = false;
            if (n.override_base === undefined) n.override_base = false; // ✅ 新增：保护旧图纸兼容性

            createNode(n.x, n.y, n.type || 'major', n); 
        });
    } else {
        alert("该模板数据损坏或为空节点结构！");
    }
    
    if (panX === 0 && panY === 0) initCanvasPosition();
    else updateTransform();
    
    reRenderAllNodes(); 
    cancelConnectionMode();
}

// 💡 绝杀改造 2：检索系统升级（多维过滤渲染引擎）
window.fetchCloudTemplatesAndRender = async function() {
    try {
        const res = await fetch('/api/config/workflows');
        _cachedCloudTemplates = await res.json();
        window.renderCloudTemplates();
    } catch(e) {
        console.error("抓取流仓库失败", e);
    }
}

window.renderCloudTemplates = function() {
    const list = document.getElementById('template-list'); 
    if(!list) return;

    const domainFilterEl = document.getElementById('repo-domain-filter');
    const searchKwEl = document.getElementById('repo-search');
    
    const domainFilter = domainFilterEl ? domainFilterEl.value : 'all';
    const searchKw = searchKwEl ? searchKwEl.value.toLowerCase().trim() : "";

    let filteredList = [];

    for (const [id, wf] of Object.entries(_cachedCloudTemplates)) {
        const wfDomain = wf.domain_id || 'factory_dev';
        const wfName = wf.name ? wf.name.toLowerCase() : "";
        const nodeCount = (wf.data && wf.data.nodes) ? wf.data.nodes.length : (wf.nodes ? wf.nodes.length : 0);

        // 1. 频道过滤
        if (domainFilter !== 'all' && wfDomain !== domainFilter) continue;
        
        // 2. 关键词模糊检索
        if (searchKw && !wfName.includes(searchKw)) continue;

        filteredList.push({ id, wf, nodeCount });
    }

    if (filteredList.length === 0) {
        list.innerHTML = '<li style="color:#777; padding:2rem; text-align:center;">此视图下未找到相关流水线模板</li>';
        return;
    }

    // 倒序排列，最新创建的在上面
    filteredList.reverse();

    list.innerHTML = filteredList.map(item => `
        <li class="template-item">
            <div class="template-info" onclick="loadTemplateById('${item.id}')">
                <span style="font-weight:bold; color:#eee;">${item.wf.name}</span>
                <div style="display:flex; gap:10px; margin-top:4px;">
                    <span style="font-size:0.7rem; color:#888; background:#222; padding:2px 6px; border-radius:4px;">${item.nodeCount} 个节点</span>
                    <span style="font-size:0.7rem; color:var(--accent-color); background:rgba(168,199,250,0.1); padding:2px 6px; border-radius:4px;">${item.wf.domain_id || 'factory_dev'}</span>
                </div>
            </div>
            <button class="del-btn-small" onclick="event.stopPropagation(); deleteTemplate('${item.id}')">删除</button>
        </li>
    `).join('');
};

// ==========================================
// 💡 [核心绝杀 3]：后端通用路由执行前端一键编排 + 新增实体开关感知
// ==========================================
window.executeAIGen = async function() {
    const prompt = document.getElementById('ai-gen-prompt').value.trim();
    const vendorId = document.getElementById('ai-gen-vendor').value;
    
    if (!prompt) return alert("请先输入需求描述");
    if (!vendorId) return alert("请在后台配置至少一个 AI 大模型");

    const btn = document.getElementById('btn-execute-ai-gen');
    const originalText = btn.innerHTML;
    btn.innerHTML = "⏳ 正在连接星门，唤醒架构师...";
    btn.disabled = true;

    const systemPrompt = document.getElementById('ai-gen-system-prompt').value;

    const availableModelsStr = AI_VENDORS.map(v => 
        `- 模型ID: "${v.id}", 名称: "${v.name}", 【架构身份】: ${v.is_agentic ? '🌌 本地星门 CLI' : '☁️ 云端 API'}, 特长: "${v.remark || '通用'}"`
    ).join('\n');

    // 💡 注入新的显式开关指令
    // 💡 [新增] 提取当前的 DNA 库信息喂给大模型
    const availableDnasStr = DNA_VAULT.map(d => 
        `- 基因ID: "${d.id}", 类型: [${d.type}], 名称: "${d.name}"`
    ).join('\n');

    // 💡 注入新的显式开关指令与基因指派指令
    const userPromptPayload = `
【核心资源池：您可以调用的 AI 引擎字典 (必须把这里的"模型ID"填入 selectedAIs 中)】：
${availableModelsStr}

【全域基因库：你可以为节点挂载的思想钢印 (提取"基因ID"填入 injected_dna 中)】：
${availableDnasStr || "当前基因库为空"}

【厂长的开发需求】：
${prompt}

【💥 厂长给你的终极警告 / 思想钢印】：
1. 绝对不能缺岗：每个节点的 \`selectedAIs\` 必须填入上方资源池中的【模型ID】！如果不知道选谁，就用 "${vendorId}"。
2. 绝对不能偷懒：\`instruction\` 必须详细写明该节点要做什么（系统级提示词）！
3. 动态注入灵魂：根据节点的任务性质，从上方的【全域基因库】中挑选合适的基因ID，以数组形式填入该节点的 \`injected_dna\` 属性中。如果不需要，可以传 []。如果需要该节点彻底忘掉出厂预设、完全被基因接管，请在节点中输出 \`"override_base": true\`。
4. 防止并发崩溃：如果要顺次执行重型任务，必须给后续节点设置递增延时 \`delay_seconds\`！
5. 【新增特权】显式赋权开关：
   - 如果该节点是"分析降噪"(recognition)，且需要它当包工头动态调度其他AI，必须在节点JSON中输出 \`"is_dispatcher": true\`。
   - 如果该节点是"执行交付"(creation)，且它是流程的最后一环，需要清空记忆并循环流水线，必须在节点JSON中输出 \`"is_loop_trigger": true\`。
    `.trim();

    try {
        const reqData = {
            chat_id: "system_workflow_generator", 
            step_title: "AI 一键编排流",
            instruction: systemPrompt,
            user_input: userPromptPayload,
            vendors: [vendorId], 
            deliver_type: "text_comm", 
            images: [],
            // 💡 获取当前 work.html 选择的频道绑定
            domain_id: document.getElementById('work-domain-selector') ? document.getElementById('work-domain-selector').value : "factory_dev"
        };

        const res = await fetch('/api/workflow/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reqData)
        });

        if (!res.ok) throw new Error("总厂路由调度失败！");

        const data = await res.json();
        let resultText = data.answer; 

        // 💡 修复解析：容错 JSON 提取
        let jsonStr = "";
        const jsonMatch = resultText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch && jsonMatch[1]) {
            jsonStr = jsonMatch[1];
        } else {
            const firstBrace = resultText.indexOf('{');
            const lastBrace = resultText.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                jsonStr = resultText.substring(firstBrace, lastBrace + 1);
            } else {
                throw new Error("AI 返回的内容中没有发现合法的 JSON 结构。");
            }
        }

        const aiWfData = JSON.parse(jsonStr);
        
        let currentX = 100;
        let currentY = 150;
        let autoDelayAccumulator = 0; 
        
        if(aiWfData.nodes) {
            aiWfData.nodes.forEach((n, i) => {
                if(n.x === undefined) n.x = currentX;
                if(n.y === undefined) n.y = currentY;
                n.locked = false; 
                n.collapsed = false;

                if (!n.selectedAIs || !Array.isArray(n.selectedAIs) || n.selectedAIs.length === 0) {
                    n.selectedAIs = [vendorId]; 
                }

                // 💡 [V3.0 基因防呆]：确保 AI 给的基因组是合法的数组，防止未注入时报错
                if (!n.injected_dna || !Array.isArray(n.injected_dna)) {
                    n.injected_dna = [];
                }

                if (!n.instruction || n.instruction.trim() === "") {
                    n.instruction = `执行厂长下发的 ${n.title} 任务，依据上下文给出最优解。`;
                }

                if (n.delay_seconds === undefined) n.delay_seconds = 0;
                
                if (i > 0 && n.delay_seconds === 0 && (n.deliverType === 'sandbox_terminal' || n.deliverType === 'agent_async_task')) {
                    autoDelayAccumulator += 15;
                    n.delay_seconds = autoDelayAccumulator;
                } else if (n.delay_seconds > 0) {
                    autoDelayAccumulator = n.delay_seconds; 
                }
                
                if (n.is_dispatcher === undefined) n.is_dispatcher = false;
                if (n.is_loop_trigger === undefined) n.is_loop_trigger = false;

                currentX += 420; 
                if (i > 0 && (i + 1) % 4 === 0) {
                    currentX = 100;
                    currentY += 400;
                }
            });
        }

        const finalPayload = { name: aiWfData.name || "AI自动编排的架构流", data: aiWfData };
        currentLoadedId = null; 
        currentLoadedName = finalPayload.name;
        applyWorkflow(finalPayload);
        
        document.getElementById('current-workflow-indicator').innerText = "✨ AI 编排草稿";
        closeModal('modal-ai-gen');

    } catch (err) {
        console.error("编排崩溃详情:", err);
        alert(`❌ AI 编排失败！\n原因：${err.message}\n建议：换个聪明点的大脑，或者修改提示词后重试。`);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function parseAndApplyLocalJSON(jsonText, filename) {
    try {
        const parsed = JSON.parse(jsonText); let wfData = parsed;
        if (!wfData.data && !wfData.nodes) { throw new Error("无效数据"); }
        if (!wfData.data) { wfData = { name: filename.replace('.json', ''), data: wfData }; }
        currentLoadedId = null; currentLoadedName = wfData.name || "导入工作流";
        applyWorkflow(wfData);
        document.getElementById('current-workflow-indicator').innerText = "📍 本地: " + currentLoadedName;
    } catch (err) { alert("加载失败"); }
}

window.exportWorkflow = function() {
    if (nodes.length === 0) return alert("当前画布为空！");
    
    // 💡 导出时记录频道
    const domainSelector = document.getElementById('work-domain-selector');
    const targetDomain = domainSelector ? domainSelector.value : 'factory_dev';
    
    const payload = { 
        name: currentLoadedName || "未命名调度流", 
        domain_id: targetDomain,
        data: { nodes, edges, scale, posX: panX, posY: panY } 
    };
    
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `${payload.name}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

window.saveAndDeploy = async function() {
    if (nodes.length === 0) return alert("画布为空！");
    let name = "", mode = "new"; 
    if (currentLoadedId) {
        if (confirm(`覆盖云端模板 [${currentLoadedName}] 吗？\n取消则另存为新模板。`)) { mode = "overwrite"; name = currentLoadedName; } else name = prompt("新模板名称：", currentLoadedName + "_副本");
    } else name = prompt("部署并保存到云端：", currentLoadedName || "新设计流");
    if (!name) return;
    
    // 💡 部署时记录频道
    const domainSelector = document.getElementById('work-domain-selector');
    const targetDomain = domainSelector ? domainSelector.value : 'factory_dev';
    
    const payload = { 
        name, 
        id: mode === "overwrite" ? currentLoadedId : null, 
        domain_id: targetDomain,
        data: { nodes, edges, scale, posX: panX, posY: panY } 
    };
    
    try {
        const res = await fetch('/api/config/workflows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (res.ok) {
            const result = await res.json(); alert("部署成功！");
            currentLoadedId = result.id; currentLoadedName = name; 
            document.getElementById('current-workflow-indicator').innerText = "☁️ " + name;
        }
    } catch (e) { alert("部署失败"); }
}

window.loadTemplateById = async function(id) {
    if (!_cachedCloudTemplates || !_cachedCloudTemplates[id]) {
        const res = await fetch('/api/config/workflows'); 
        _cachedCloudTemplates = await res.json();
    }
    const template = _cachedCloudTemplates[id];
    
    if (template) { 
        currentLoadedId = id; 
        currentLoadedName = template.name; 
        applyWorkflow(template); 
        document.getElementById('current-workflow-indicator').innerText = "☁️ " + template.name; 
        
        // 载入时同步更新顶部下拉框的频道
        const sel = document.getElementById('work-domain-selector');
        if (sel && template.domain_id) sel.value = template.domain_id;
        
        closeModal('modal-load'); 
    }
}

window.deleteTemplate = async function(id) {
    if (!confirm("⚠️ 彻底删除？此操作不可逆！")) return;
    try {
        const res = await fetch(`/api/config/workflows/${id}`, { method: 'DELETE' });
        if (res.ok) { 
            if (currentLoadedId === id) { currentLoadedId = null; document.getElementById('current-workflow-indicator').innerText = "草稿状态"; } 
            window.fetchCloudTemplatesAndRender(); 
        }
    } catch (e) {}
}

window.openAIDock = function(nodeId) {
    currentNodeForAI = nodes.find(n => n.id === nodeId);
    if (!currentNodeForAI) return;
    const grid = document.getElementById('ai-grid'); grid.innerHTML = '';
    AI_VENDORS.forEach(v => {
        // 💡 双态引擎精准识别：如果它是 CLI，就给它无上的金色光芒！
        const isCLI = v.exec_mode === 'cli';
        const engineBadge = isCLI 
            ? `<span style="background:#f1c40f; color:#000; font-size:0.65rem; padding:2px 6px; border-radius:4px; font-weight:bold; margin-left:auto; flex-shrink:0; box-shadow:0 0 8px rgba(241,196,15,0.4);">💻 物理 CLI</span>` 
            : `<span style="background:rgba(255,255,255,0.1); color:#aaa; font-size:0.65rem; padding:2px 6px; border-radius:4px; margin-left:auto; flex-shrink:0;">🌐 API</span>`;
        
        const card = document.createElement('div');
        card.className = `ai-card ${currentNodeForAI.selectedAIs.includes(v.id) ? 'selected' : ''}`;
        if (isCLI && currentNodeForAI.selectedAIs.includes(v.id)) {
             card.style.borderColor = '#f1c40f'; // CLI 选中时金色高亮
             card.style.boxShadow = '0 0 15px rgba(241,196,15,0.2)';
        }
        
        card.innerHTML = `
            <div class="ai-card-top">
                <div class="ai-card-icon">${getIconHtml(v.icon)}</div>
                <div class="ai-card-name" title="${v.name}" style="display:flex; align-items:center; width:100%; color:${isCLI ? '#f1c40f' : '#eee'};">${v.name}${engineBadge}</div>
            </div>
            <div class="ai-card-remark" title="${v.remark || '暂无能力描述'}">${v.remark || '暂无能力描述'}</div>
        `;
        card.onclick = () => {
            const idx = currentNodeForAI.selectedAIs.indexOf(v.id);
            if(idx > -1) {
                currentNodeForAI.selectedAIs.splice(idx, 1);
            } else {
                // 💡 [修改] 限制单节点目前主力跑一个 AI，防止提示词污染
                currentNodeForAI.selectedAIs = [v.id]; 
                // 切换 AI 时，清空之前手写的干预
                delete currentNodeForAI.custom_prompt; 
                
                // 移除其他卡片的选中状态 (UI 上的互斥)
                Array.from(grid.children).forEach(c => c.classList.remove('selected'));
            }
            card.classList.toggle('selected'); 
            renderNodeAIPool(currentNodeForAI.id);
            
            // 💡 [新增] 触发钢印重绘
            if (typeof renderNodeProperties === 'function') {
                renderNodeProperties(currentNodeForAI.id); 
            }
        };
        grid.appendChild(card);
    });
    document.getElementById('ai-dock').classList.add('show');
}

window.renderNodeAIPool = function(nodeId) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    // 1. 更新节点肚子里的内部引擎池面板
    const pool = document.getElementById(`ai-pool-${nodeId}`);
    if (pool) {
        if (!node.selectedAIs || !node.selectedAIs.length) { 
            pool.innerHTML = '<div style="color:#888; font-size:0.8rem; font-weight:500;">+ 指派引擎</div>'; 
        } else {
            pool.innerHTML = node.selectedAIs.map(id => {
                const v = AI_VENDORS.find(v => v.id === id); 
                const isCLI = v && v.exec_mode === 'cli';
                const styleStr = isCLI ? "border-color: #f1c40f; box-shadow: 0 0 10px rgba(241,196,15,0.4);" : "";
                return v ? `<div class="ai-icon-mini" style="${styleStr}" title="${v.name}${isCLI ? ' (💻 物理 CLI)' : ' (🌐 云端 API)'}\n${v.remark||''}">${getIconHtml(v.icon)}</div>` : '';
            }).join('');
        }
    }

    // 2. 💡 同步更新外部标题栏头像，秒切秒换！
    const headerIcon = document.getElementById(`header-ai-icon-${nodeId}`);
    if (headerIcon) {
        let aiIconHtml = "🤖";
        if (node.selectedAIs && node.selectedAIs.length > 0) {
            let vendor = AI_VENDORS.find(v => v.id === node.selectedAIs[0]);
            if (vendor && vendor.icon) {
                aiIconHtml = getIconHtml(vendor.icon);
            }
        }
        headerIcon.innerHTML = aiIconHtml;
    }
}

window.closeDock = function() { document.getElementById('ai-dock').classList.remove('show'); }
// ==========================================
// 🧬 V3.0 核心逻辑：节点 DNA 装配与物理微操引擎
// ==========================================
let currentlyEditingNodeId = null;

window.renderNodeProperties = function(nodeId) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    currentlyEditingNodeId = nodeId;
    if (!node.injected_dna) node.injected_dna = []; // 防御性初始化

    const panel = document.getElementById('properties-panel');
    const promptArea = document.getElementById('node-custom-prompt');
    
    if (!panel) return;
    panel.classList.remove('collapsed');

    window.renderDnaPills(); // 渲染胶囊

    // 👇 【新增】：动态渲染真空剥离开关 👇
    let overrideContainer = document.getElementById('override-base-container');
    if (!overrideContainer) {
        // 找到微操框所在的父级容器
        const promptGroup = document.getElementById('node-custom-prompt').parentNode;
        promptGroup.insertAdjacentHTML('afterbegin', `
            <div id="override-base-container" style="margin-bottom:15px; padding:10px; background:rgba(255,107,107,0.1); border:1px solid #ff6b6b; border-radius:8px;">
                <label style="font-size:0.85rem; color:#ff6b6b; cursor:pointer; display:flex; align-items:center; gap:8px; font-weight:bold;">
                    <input type="checkbox" id="node-override-base">
                    ⚠️ 剥离出厂预设 (变为空白躯壳)
                </label>
                <div style="font-size:0.7rem; color:#aaa; margin-top:4px;">开启后，该机床在 ai_core 中的原始 Prompt 将被清空，完全受此处的 DNA 和微操支配。</div>
            </div>
        `);
        overrideContainer = document.getElementById('override-base-container');
    }
    const overrideCheckbox = document.getElementById('node-override-base');
    overrideCheckbox.checked = node.override_base || false;
    overrideCheckbox.onchange = (e) => { node.override_base = e.target.checked; };
    // 👆 【新增结束】 👆

    // 渲染底层微操覆盖框
    if (promptArea) {
        promptArea.disabled = (!node.selectedAIs || node.selectedAIs.length === 0);
        promptArea.value = node.custom_prompt || "";
        promptArea.oninput = (e) => { node.custom_prompt = e.target.value; };
    }
};

// 🎨 渲染已挂载的胶囊
window.renderDnaPills = function() {
    const node = nodes.find(n => n.id === currentlyEditingNodeId);
    const pillContainer = document.getElementById('node-dna-pills');
    if (!node || !pillContainer) return;

    if (!node.injected_dna || node.injected_dna.length === 0) {
        pillContainer.innerHTML = '<span style="color:#777; font-size:0.8rem;">未挂载任何基因序列，节点将凭本能行事。</span>';
        return;
    }

    pillContainer.innerHTML = node.injected_dna.map(dnaId => {
        const dnaObj = DNA_VAULT.find(d => d.id === dnaId);
        if (!dnaObj) return '';
        
        let color = '#fff'; let bg = 'rgba(255,255,255,0.1)'; let border = 'rgba(255,255,255,0.3)';
        if (dnaObj.type === 'identity') { color = '#a8c7fa'; bg = 'rgba(168,199,250,0.15)'; border = '#a8c7fa'; }
        if (dnaObj.type === 'sop') { color = '#d8b4fe'; bg = 'rgba(216,180,254,0.15)'; border = '#d8b4fe'; }
        if (dnaObj.type === 'rule') { color = '#ff6b6b'; bg = 'rgba(255,107,107,0.15)'; border = '#ff6b6b'; }

        return `
            <div style="display:flex; align-items:center; gap:6px; background:${bg}; border:1px solid ${border}; color:${color}; padding:4px 10px; border-radius:16px; font-size:0.75rem; font-weight:bold; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
                <span title="${dnaObj.id}">${dnaObj.name}</span>
                <span style="cursor:pointer; font-size:0.9rem; opacity:0.7;" onclick="removeDna('${dnaId}')" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.7">✖</span>
            </div>
        `;
    }).join('');
};

// 🛒 打开基因库挑选弹窗
window.openDnaPicker = function() {
    const node = nodes.find(n => n.id === currentlyEditingNodeId);
    if (!node) return;
    
    const listContainer = document.getElementById('dna-picker-list');
    listContainer.innerHTML = '';

    if (DNA_VAULT.length === 0) {
        listContainer.innerHTML = '<div style="color:#777; text-align:center; padding: 20px;">系统基因库为空，请先前往 [DNA库] 提取基因。</div>';
    } else {
        DNA_VAULT.forEach(dna => {
            const isSelected = (node.injected_dna || []).includes(dna.id);
            const item = document.createElement('div');
            item.style.cssText = `display:flex; justify-content:space-between; align-items:center; padding:12px; background:rgba(255,255,255,0.05); border:1px solid ${isSelected ? '#20c997' : '#333'}; border-radius:8px; cursor:pointer; transition:0.2s;`;
            item.onclick = () => { toggleDnaSelection(dna.id); closeModal('modal-dna-picker'); };
            
            let icon = '⚙️';
            if (dna.type === 'identity') icon = '👤';
            if (dna.type === 'rule') icon = '🚨';

            item.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:1.2rem;">${icon}</span>
                    <div>
                        <div style="color:#eee; font-weight:bold; font-size:0.9rem;">${dna.name}</div>
                        <div style="color:#666; font-size:0.7rem; margin-top:2px;">${dna.id}</div>
                    </div>
                </div>
                <div style="font-size:1.2rem; color:#20c997;">${isSelected ? '✔️' : '＋'}</div>
            `;
            listContainer.appendChild(item);
        });
    }
    
    document.getElementById('modal-dna-picker').classList.add('show');
};

// 🔌 切换/添加/移除基因
window.toggleDnaSelection = function(dnaId) {
    const node = nodes.find(n => n.id === currentlyEditingNodeId);
    if (!node) return;
    if (!node.injected_dna) node.injected_dna = [];
    
    const idx = node.injected_dna.indexOf(dnaId);
    if (idx > -1) {
        node.injected_dna.splice(idx, 1);
    } else {
        node.injected_dna.push(dnaId);
        // 自动清空物理微操，防止冲突
        if (node.custom_prompt) {
            node.custom_prompt = "";
            const pa = document.getElementById('node-custom-prompt');
            if (pa) pa.value = "";
        }
    }
    window.renderDnaPills();
};

window.removeDna = function(dnaId) {
    window.toggleDnaSelection(dnaId);
};

// 监听画布点击，收起面板 (如果在节点外部/弹窗外部点击)
document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.node') && !e.target.closest('.side-panel') && !e.target.closest('.overlay-dock') && !e.target.closest('.modal-overlay')) {
        const panel = document.getElementById('properties-panel');
        if (panel) panel.classList.add('collapsed');
    }
});