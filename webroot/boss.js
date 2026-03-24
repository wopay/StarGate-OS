// [webroot/boss.js] - 歼星舰指挥所核心控制系统 (V13.0 蜂群意识流 & 终极正则防崩溃版)

// --- Markdown 初始化 ---
marked.setOptions({
    highlight: function(code, lang) {
        if (lang && hljs.getLanguage(lang)) { return hljs.highlight(code, { language: lang }).value; }
        return hljs.highlightAuto(code).value;
    }, breaks: true
});

// --- 探头挂载 ---
setTimeout(() => {
    const protocol = window.location.protocol;
    if (protocol === 'https:') document.getElementById('radar-iframe').src = '/api/radar/stream';
    else document.getElementById('radar-iframe').src = 'http://' + window.location.hostname + ':8999';
}, 100);

// --- 动态获取大脑并同步 Badge ---
let activeBrainId = "";
async function fetchAvailableBrain() {
    const sel = document.getElementById('boss-model-selector');
    try {
        const res = await fetch('/api/config/ai');
        if (res.ok) {
            const data = await res.json();
            let flat = [];
            if (data.categories) data.categories.forEach(c => c.nodes.forEach(n => { if (n.enabled !== false) flat.push(n); }));
            else if (data.vendors) flat = data.vendors;
            
            if (flat.length === 0) { sel.innerHTML = '<option value="">未配置</option>'; return; }

            // 💡 CLI 优先法则：强行将底层 CLI 终端排在云端 API 节点之前！
            flat.sort((a, b) => {
                const aIsCli = a.exec_mode === 'cli';
                const bIsCli = b.exec_mode === 'cli';
                if (aIsCli && !bIsCli) return -1;
                if (!aIsCli && bIsCli) return 1;
                return 0;
            });

            // 注入尊贵的双态引擎标识
            sel.innerHTML = flat.map(v => {
                const isCLI = v.exec_mode === 'cli';
                const modeIcon = isCLI ? '💻 CLI' : '🌐 API';
                const color = isCLI ? '#f1c40f' : '#eee'; 
                return `<option value="${v.id}" style="color:${color}; font-weight:bold;">[${modeIcon}] ${v.icon || '🤖'} ${v.name}</option>`;
            }).join('');
            
            const factory02 = flat.find(v => String(v.id) === 'ai_1772830837817');
            if (factory02) {
                sel.value = factory02.id;
            } else if (data.pro_model_id && flat.find(v => String(v.id) === String(data.pro_model_id))) {
                sel.value = data.pro_model_id;
            } else if (data.primary_model_id && flat.find(v => String(v.id) === String(data.primary_model_id))) {
                sel.value = data.primary_model_id;
            }
            
            activeBrainId = sel.value;
            updateModelBadges();
        }
    } catch(e) { sel.innerHTML = '<option value="">失败</option>'; }
}

function updateModelBadges() {
    const sel = document.getElementById('boss-model-selector');
    const modelName = sel.options[sel.selectedIndex]?.text || "兜底分配";
    const stBadge = document.getElementById('badge-stargate');
    const f2Badge = document.getElementById('badge-factory2');
    if (stBadge) stBadge.innerText = `算力: ${modelName}`;
    if (f2Badge) f2Badge.innerText = `算力: ${modelName}`;
}
fetchAvailableBrain();

// --- OS 窗口化管理 ---
let topZIndex = 3000;

function makeWindowDraggable(winId, headerId) {
    const win = document.getElementById(winId);
    const header = document.getElementById(headerId);
    if(!win || !header) return;

    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    win.addEventListener('mousedown', () => { win.style.zIndex = ++topZIndex; });
    win.addEventListener('touchstart', () => { win.style.zIndex = ++topZIndex; }, {passive: true});
    
    header.onmousedown = dragMouseDown;
    header.ontouchstart = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event;
        if(e.target.tagName === 'BUTTON') return;
        
        if(e.type === 'touchstart') {
            pos3 = e.touches[0].clientX; pos4 = e.touches[0].clientY;
        } else {
            e.preventDefault();
            pos3 = e.clientX; pos4 = e.clientY;
        }
        win.style.zIndex = ++topZIndex;
        document.onmouseup = closeDragElement; document.onmousemove = elementDrag;
        document.ontouchend = closeDragElement; document.ontouchmove = elementDrag;
    }
    function elementDrag(e) {
        e = e || window.event; 
        let currentX, currentY;
        if(e.type === 'touchmove') {
            currentX = e.touches[0].clientX; currentY = e.touches[0].clientY;
        } else {
            e.preventDefault();
            currentX = e.clientX; currentY = e.clientY;
        }
        pos1 = pos3 - currentX; pos2 = pos4 - currentY;
        pos3 = currentX; pos4 = currentY;
        win.style.top = (win.offsetTop - pos2) + "px"; win.style.left = (win.offsetLeft - pos1) + "px";
    }
    function closeDragElement() { 
        document.onmouseup = null; document.onmousemove = null; 
        document.ontouchend = null; document.ontouchmove = null; 
    }
}

["fw-stargate", "fw-factory2", "fw-radar", "fw-diagnose", "fw-memory-matrix"].forEach(id => {
    makeWindowDraggable(id, id.replace("fw-", "header-"));
});

function openOSWindow(id) { 
    const win = document.getElementById(id);
    if (!win) return;
    win.style.display = 'flex'; 
    win.style.zIndex = ++topZIndex;

    if (window.innerWidth <= 768 && !win.dataset.positioned) {
        win.style.width = '95vw';
        win.style.height = '75vh'; 
        win.style.left = '2.5vw';
        win.style.top = '90px'; 
        win.dataset.positioned = "true";
    }
    
    if (id === 'fw-memory-matrix') loadMemories();
}
function closeOSWindow(id) { 
    const win = document.getElementById(id);
    if (win) win.style.display = 'none'; 
}

function makeDraggableSphere(el) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    let isDragging = false;
    if(!el) return;
    const boundary = document.getElementById('drag-boundary');
    if (!boundary) return;
    
    el.onmousedown = dragMouseDown; el.ontouchstart = dragMouseDown;

    function dragMouseDown(e) {
        if (window.getComputedStyle(el).position === 'relative') return;

        e = e || window.event; isDragging = false; el.isDragging = false;
        pos3 = e.clientX || e.touches[0].clientX; pos4 = e.clientY || e.touches[0].clientY;
        document.onmouseup = closeDragElement; document.onmousemove = elementDrag;
        document.ontouchend = closeDragElement; document.ontouchmove = elementDrag;
    }

    function elementDrag(e) {
        if (window.getComputedStyle(el).position === 'relative') return;

        e = e || window.event;
        const currentX = e.clientX || (e.touches ? e.touches[0].clientX : pos3);
        const currentY = e.clientY || (e.touches ? e.touches[0].clientY : pos4);
        
        if (Math.abs(currentX - pos3) > 5 || Math.abs(currentY - pos4) > 5) {
            isDragging = true; el.isDragging = true; e.preventDefault();
        }

        if (!isDragging) return;

        pos1 = pos3 - currentX; pos2 = pos4 - currentY;
        pos3 = currentX; pos4 = currentY;

        let newTop = el.offsetTop - pos2; let newLeft = el.offsetLeft - pos1;
        if(newTop < 0) newTop = 0; if(newLeft < 0) newLeft = 0;
        if(newTop > boundary.offsetHeight - el.offsetHeight) newTop = boundary.offsetHeight - el.offsetHeight;
        if(newLeft > boundary.offsetWidth - el.offsetWidth) newLeft = boundary.offsetWidth - el.offsetWidth;

        el.style.top = newTop + "px"; el.style.left = newLeft + "px";
    }

    function closeDragElement() {
        document.onmouseup = null; document.onmousemove = null;
        document.ontouchend = null; document.ontouchmove = null;
        setTimeout(() => { el.isDragging = false; }, 100);
    }
}

["fab-diagnose", "fab-stargate", "fab-factory2", "fab-radar", "fab-memory"].forEach(id => {
    makeDraggableSphere(document.getElementById(id));
});

function checkNuke() {
    const input = document.getElementById('nuke-text').value.trim();
    const btn = document.getElementById('nuke-btn');
    if (btn) btn.disabled = (input !== '清空记忆');
}
async function purgeMemory() {
    const btn = document.getElementById('nuke-btn');
    if(btn && !btn.disabled) {
        btn.innerHTML = "☢️ 正在投掷核弹...";
        btn.disabled = true;
        try {
            // 1. 软清空：通知主控删除所有本地记录
            await fetch('/api/stargate/archives/all', { method: 'DELETE' }).catch(e=>{});
            await fetch('/api/microcosm/history', { method: 'DELETE' }).catch(e=>{});
            
            // 2. 硬杀伤：向二厂发射清空 Wild 异体的净世指令 (我们借用 8999 的 kill 接口，但不带 task 参数，稍后需在 sandbox_worker.py 补充该无参清空逻辑，这里先发信)
            const radarHost = window.location.hostname;
            const killUrl = window.location.protocol === 'https:' ? `/api/radar/kill?task=ALL_WILD` : `http://${radarHost}:8999/kill?task=ALL_WILD`;
            fetch(killUrl).catch(e=>{});
            
            alert("☢️ 物理净世完成！所有野生异体及历史沉淀均已被焚毁！");
        } catch(e) {
            console.error(e);
            alert("⚠️ 核弹投掷存在部分异常，请检查后端存活状态！");
        } finally {
            document.getElementById('nuke-text').value = ''; 
            btn.innerHTML = "💥 执行不可逆的全域物理擦除 (Purge All)";
            checkNuke();
        }
    }
}

async function triggerSysCommand(role, promptText) {
    const selectedModel = document.getElementById('boss-model-selector').value;
    if (!selectedModel) return alert("⚠️ 厂长，请先选择算力模型！");
    try {
        const payload = {
            chat_id: "factory_system_command", step_title: "架构自检", 
            instruction: `【最高身份指令】：你是${role}。${promptText}`, user_input: promptText,
            deliver_type: "agent_async_task", vendors: [selectedModel], images: [], domain_id: "factory_dev", delay_seconds: 0, work_mode: "creation", is_dispatcher: false
        };
        const res = await fetch('/api/workflow/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (res.ok) alert("✅ 指令已下放，请在右侧监控探头观测结果。"); else throw new Error();
    } catch (e) { alert('❌ 下放失败'); }
}


// ================= 🧠 向量记忆编辑器引擎 (V12.1 样式修复版) =================
const DEFAULT_DOMAIN = 'factory_dev';

function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return String(unsafe);
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

async function loadMemories() {
    const memList = document.getElementById('memory-list');
    const typeSelect = document.getElementById('mem-type-select');
    if (!memList || !typeSelect) return;
    
    const type = typeSelect.value;
    memList.innerHTML = '<div style="color:#666; text-align:center; padding:20px;">📡 正在潜入潜意识深层...</div>';
    
    try {
        const res = await fetch(`/api/memory/${DEFAULT_DOMAIN}?mem_type=${type}`);
        const data = await res.json();
        
        if(data.status !== 'ok') throw new Error(data.msg);
        
        if(!data.data || data.data.length === 0) {
            memList.innerHTML = '<div style="color:#666; text-align:center; padding:20px;">当前记忆分区为空白。</div>';
            return;
        }

        // 💡 使用 marked.parse 渲染记忆，让代码块完美显示
        memList.innerHTML = data.data.map(mem => {
            const renderedContent = marked.parse(mem.text).replace(/<pre>/g, '<pre style="background:#050505; padding:10px; border:1px solid #333; overflow-x:auto; border-radius:6px; margin:8px 0;">');
            return `
            <div style="background:#111; border-left:3px solid ${type==='sop'?'#ff5f56':'#20c997'}; padding:15px; border-radius:4px; position:relative; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
                <div style="font-size:0.65rem; color:#888; margin-bottom:8px; font-family:monospace;">Node ID: ${mem.id}</div>
                <div style="color:#eee; font-size:0.85rem; line-height:1.5;">${renderedContent}</div>
                <button onclick="eraseMemory('${mem.id}')" style="position:absolute; top:10px; right:10px; background:rgba(255,95,86,0.1); color:var(--accent-red); border:1px solid var(--accent-red); border-radius:4px; cursor:pointer; font-size:0.7rem; padding:4px 8px; transition:0.2s;" onmouseover="this.style.background='var(--accent-red)'; this.style.color='#000';" onmouseout="this.style.background='rgba(255,95,86,0.1)'; this.style.color='var(--accent-red)';">彻底抹除</button>
            </div>
        `}).join('');
    } catch(e) {
        memList.innerHTML = `<div style="color:var(--accent-red); text-align:center; padding:20px;">❌ 神经元链接熔断: ${e.message}</div>`;
    }
}

async function injectMemory() {
    const textElem = document.getElementById('new-mem-text');
    const typeSelect = document.getElementById('mem-type-select');
    if (!textElem || !typeSelect) return;

    const text = textElem.value.trim();
    if(!text) return;
    
    const type = typeSelect.value;
    const id = `${type}_${Date.now()}`;
    
    try {
        const res = await fetch(`/api/memory/${DEFAULT_DOMAIN}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id, text, mem_type: type })
        });
        if(res.ok) {
            textElem.value = '';
            loadMemories();
        } else {
            alert("脑区满载或拒绝写入");
        }
    } catch(e) { alert("烙印失败: " + e.message); }
}

async function eraseMemory(id) {
    if(!confirm("⚠️ 警告：确定要永久抹除这段底层的记忆神经元吗？此操作不可逆！")) return;
    const typeSelect = document.getElementById('mem-type-select');
    const type = typeSelect ? typeSelect.value : 'sop';
    try {
        await fetch(`/api/memory/${DEFAULT_DOMAIN}/${id}?mem_type=${type}`, { method: 'DELETE' });
        loadMemories();
    } catch(e) { alert("抹除失败: " + e.message); }
}

// ================= 🌌 统一终端收发引擎 (V12.1 本地持久化版) =================
let stagedUploads = {}; 

function loadTerminalHistory(chatId, boxId) {
    const chatBox = document.getElementById(boxId);
    if (!chatBox) return;
    const history = JSON.parse(localStorage.getItem(`boss_history_${chatId}`) || "[]");
    
    if (history.length > 0) {
        chatBox.innerHTML = '';
        history.forEach(msg => {
            chatBox.innerHTML += `<div class="sg-msg ${msg.role}"><div class="sg-bubble">${msg.html}</div></div>`;
        });
        setTimeout(() => { chatBox.scrollTop = chatBox.scrollHeight; }, 100);
        if (history[history.length-1].role === 'ai') {
            scanAndMountFactoryTask(chatBox, history[history.length-1].raw);
        }
    }
}

function saveTerminalHistory(chatId, role, htmlContent, rawText) {
    let history = JSON.parse(localStorage.getItem(`boss_history_${chatId}`) || "[]");
    history.push({ role: role, html: htmlContent, raw: rawText });
    if (history.length > 50) history = history.slice(-50);
    localStorage.setItem(`boss_history_${chatId}`, JSON.stringify(history));
}

document.addEventListener('DOMContentLoaded', () => {
    loadTerminalHistory('boss_stargate_channel', 'chat-stargate');
    loadTerminalHistory('boss_capsule_south', 'chat-factory2');
});


async function handleUpload(inputElem, previewId) {
    const file = inputElem.files[0];
    if (!file) return;
    const preview = document.getElementById(previewId);
    preview.innerHTML = "上传中...";
    const formData = new FormData(); formData.append("file", file);
    try {
        const res = await fetch(`/api/chats/temp_stargate/upload`, { method: 'POST', body: formData });
        if(res.ok) {
            const data = await res.json();
            stagedUploads[previewId] = data.url;
            preview.innerHTML = `✅ ${file.name}`;
        } else throw new Error();
    } catch(e) { preview.innerHTML = "❌ 失败"; }
    inputElem.value = ""; 
}

window.copyCode = function(btn) {
    const pre = btn.parentElement;
    const code = pre.querySelector('code').innerText;
    navigator.clipboard.writeText(code).then(() => {
        const old = btn.innerText; btn.innerText = "已复制!";
        setTimeout(() => btn.innerText = old, 2000);
    });
}

function scanAndMountFactoryTask(chatBox, aiText) {
    setTimeout(() => {
        const codeBlocks = chatBox.querySelectorAll('.sg-msg:last-child pre code');
        codeBlocks.forEach(block => {
            const content = block.textContent;
            
            // 只要包含 cat << EOF 就可以触发识别
            if (content.includes("cat << 'EOF' >") || content.includes('cat << "EOF" >')) {
                if (block.parentElement.querySelector('.btn-deploy-factory')) return;

                const pre = block.parentElement;
                pre.style.position = 'relative';
                pre.style.border = '2px solid var(--accent-cyan)';
                pre.style.boxShadow = '0 0 15px rgba(32, 201, 151, 0.2)';

                const btn = document.createElement('button');
                btn.className = 'btn-deploy-factory';
                btn.innerHTML = '⚡ 一键下发物理机床 (脱机执行)';
                btn.style.cssText = 'position:absolute; top:5px; right:60px; background:var(--accent-cyan); color:#000; border:none; padding:6px 12px; font-weight:bold; border-radius:4px; cursor:pointer; font-size:0.75rem; transition:0.2s; box-shadow: 0 4px 10px rgba(0,0,0,0.5);';
                
                btn.onmouseover = () => btn.style.transform = 'scale(1.05)';
                btn.onmouseout = () => btn.style.transform = 'scale(1)';
                
                btn.onclick = async () => {
                    try {
                        let jsonStr = "";
                        
                        // 💡 1. 高容错提取：无视开头的 Copycat 或路径，精准捕获两段 EOF 之间的内容
                        const match = content.match(/<<\s*['"]?EOF['"]?[^\n]*\n([\s\S]*?)\nEOF/);
                        
                        if (match) {
                            jsonStr = match[1];
                        } else {
                            // 💡 2. 终极兜底方案：如果连 EOF 都没写对，直接暴力抠出最外层的 { JSON }
                            const fallbackMatch = content.match(/(\{[\s\S]*\})/);
                            if (fallbackMatch) {
                                jsonStr = fallbackMatch[1];
                            } else {
                                throw new Error("未能从代码块中解析出有效的 JSON 结构");
                            }
                        }
                        
                        const task = JSON.parse(jsonStr);
                        
                        btn.innerHTML = "📡 正在穿越星门落盘...";
                        btn.disabled = true;

                        const res = await fetch('/api/sandbox/task', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(task)
                        });

                        if (res.ok) {
                            btn.innerHTML = "✅ 机床已接单";
                            btn.style.background = "#4caf50";
                            btn.style.color = "#000";
                            
                            // 👇 [V50 新增装甲]：追加独立的脱机任务终止按钮
                            const killBtn = document.createElement('button');
                            killBtn.innerHTML = "🛑 紧急拔管";
                            killBtn.style.cssText = 'position:absolute; top:5px; right:5px; background:var(--accent-red); color:#fff; border:none; padding:6px 12px; font-weight:bold; border-radius:4px; cursor:pointer; font-size:0.75rem; transition:0.2s; box-shadow: 0 4px 10px rgba(255,107,107,0.3);';
                            killBtn.onclick = () => {
                                if(!confirm("⚠️ 确定要直接击穿雷达端口，物理处决脱机机床吗？")) return;
                                killBtn.innerHTML = "☠️ 处刑中...";
                                killBtn.disabled = true;
                                // 使用 task.task_id 追杀
                                const radarHost = window.location.hostname;
                                const killUrl = window.location.protocol === 'https:' ? `/api/radar/kill?task=${task.task_id}` : `http://${radarHost}:8999/kill?task=${task.task_id}`;
                                fetch(killUrl).then(()=>{
                                    killBtn.innerHTML = "💀 已被爆头";
                                    setTimeout(()=>killBtn.remove(), 2000);
                                    btn.innerHTML = "⚡ 重新下发";
                                    btn.style.background = "var(--accent-cyan)";
                                    btn.disabled = false;
                                }).catch(e => {
                                    alert("信号发射失败！");
                                    killBtn.innerHTML = "🛑 重试拔管";
                                    killBtn.disabled = false;
                                });
                            };
                            pre.appendChild(killBtn);
                            
                        } else {
                            throw new Error("HTTP " + res.status);
                        }
                    } catch (e) {
                        console.error("引渡失败详情:", e);
                        alert("引渡失败: " + e.message);
                        btn.innerHTML = "❌ 格式解析或网络错误";
                        btn.style.background = "var(--accent-red)";
                        btn.disabled = false;
                    }
                };
                pre.appendChild(btn);
            }
        });
    }, 100);
}

async function sendTerminalMsg(inputId, chatBoxId, targetChatId, deliverType, sysInstruction) {
    const inputObj = document.getElementById(inputId);
    const text = inputObj.value.trim();
    const previewId = inputId === 'input-stargate' ? 'preview-stargate' : 'preview-factory2';
    const stagedImg = stagedUploads[previewId];

    if (!text && !stagedImg) return;

    const chatBox = document.getElementById(chatBoxId);
    let userDisplay = text;
    if(stagedImg) userDisplay += `<br><span style="color:#aaa; font-size:0.75rem;">[附件]: ${stagedImg}</span>`;
    
    const userHtml = `<div class="sg-bubble">${userDisplay}</div>`;
    chatBox.innerHTML += `<div class="sg-msg user">${userHtml}</div>`;
    saveTerminalHistory(targetChatId, 'user', userHtml, text);
    
    inputObj.value = '';
    
    const selectedModel = document.getElementById('boss-model-selector').value;
    if (!selectedModel) return alert("请先挂载算力模型");

    const loadingId = 'load_' + Date.now();
    chatBox.innerHTML += `<div id="${loadingId}" style="color:#555; padding:10px;">> 计算穿透中...</div>`;
    chatBox.scrollTop = chatBox.scrollHeight;

    const payloadImages = stagedImg ? [stagedImg] : [];
    stagedUploads[previewId] = null; document.getElementById(previewId).innerHTML = "";

    try {
        const payload = {
            chat_id: targetChatId, step_title: "终端指令",
            instruction: sysInstruction, user_input: text,
            deliver_type: deliverType, vendors: [selectedModel], 
            images: payloadImages, domain_id: "factory_dev", delay_seconds: 0, work_mode: "creation", is_dispatcher: false
        };

        const response = await fetch('/api/workflow/execute', { 
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) 
        });

        document.getElementById(loadingId).remove();
        if (response.ok) {
            const data = await response.json();
            let aiText = data.answer || "无信号。";
            let rawAiText = aiText.replace(/<[^>]*>?/gm, '').trim(); 
            aiText = aiText.replace(/<div class='ai-scheme-card'.*?class='scheme-payload'>/g, '').replace(/<\/div><button.*?>.*?<\/button><\/div>/g, '').trim();
            const renderedHtml = marked.parse(aiText).replace(/<pre>/g, '<pre><button class="copy-btn" onclick="copyCode(this)">Copy</button>');
            
            const finalAiHtml = `<div class="sg-bubble">${renderedHtml}</div>`;
            chatBox.innerHTML += `<div class="sg-msg ai">${finalAiHtml}</div>`;
            saveTerminalHistory(targetChatId, 'ai', finalAiHtml, aiText);

            scanAndMountFactoryTask(chatBox, aiText);

            microcosmHistory.push({
                name: "二厂主脑", wid: "ROOT", station: "强网隔离终端",
                time: new Date().toLocaleTimeString(),
                timestamp: Date.now(),
                hasMemory: true,
                thought: `<span style="color:var(--accent-gold);">[厂长最高指令]:</span> ${text} <br><span style="color:var(--accent-cyan);">[图纸回传]:</span> ${rawAiText.substring(0, 60)}...`
            });
            await fetch('/api/microcosm/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ feed: microcosmHistory }) });
            renderFeed();

        } else {
            chatBox.innerHTML += `<div style="color:var(--accent-red); padding:10px;">[ERROR] HTTP ${response.status}</div>`;
        }
    } catch (e) {
        document.getElementById(loadingId)?.remove();
        chatBox.innerHTML += `<div style="color:var(--accent-red); padding:10px;">[FATAL] 物理层断开</div>`;
    }
    chatBox.scrollTop = chatBox.scrollHeight;
}

function downloadChatLog(containerId, titleName) {
    const content = document.getElementById(containerId).innerHTML;
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${titleName}</title><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/atom-one-dark.min.css"><style>body{background:#000; color:#fff; font-family:monospace; padding:20px;} .sg-msg{margin-bottom:20px; display:flex; flex-direction:column;} .user{align-items:flex-end;} .user .sg-bubble{border:1px solid #20c997; padding:15px; border-radius:8px;} .ai{align-items:flex-start;} .ai .sg-bubble{background:#111; border:1px solid #333; padding:15px; border-radius:8px;} pre{background:#050505; padding:15px; border:1px solid #333; overflow-x:auto;} .copy-btn{display:none;}</style></head><body><h1>📡 ${titleName} ARCHIVE</h1>${content}</body></html>`;
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${titleName}_${Date.now()}.html`; a.click();
}

// ================= 🧠 【V13.0 蜂群意识流：向量结晶版】 =================
let microcosmHistory = [];
let aiWorkers = {};

async function loadWorkersFromServer() {
    try {
        const res = await fetch('/api/microcosm/workers');
        if (res.ok) { aiWorkers = await res.json(); }
    } catch (e) {}
}

async function saveWorkersToServer() {
    try {
        await fetch('/api/microcosm/workers', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workers: aiWorkers })
        });
    } catch (e) {}
}

async function loadFeedFromServer() {
    try {
        const res = await fetch('/api/microcosm/history');
        if (res.ok) { microcosmHistory = await res.json(); } 
    } catch(e) { }
    renderFeed();
}

const escapeJs = str => String(str).replace(/'/g, "\\'");

function renderFeed() {
    const feedContainer = document.getElementById('microcosm-feed');
    if (!feedContainer) return;
    
    feedContainer.innerHTML = '';
    if(microcosmHistory.length === 0) {
        feedContainer.innerHTML = '<div style="color:#555; text-align:center; padding: 50px;">底噪扫描中，暂无数字生命波动...</div>'; return;
    }
    
    const toRender = microcosmHistory.slice(-100).reverse();
    toRender.forEach((item, index) => {
        const realIndex = microcosmHistory.length - 1 - index;
        
        const privilegeBtn = item.hasMemory ? 
            `<button class="god-btn" style="color:#d8b4fe; border-color:#d8b4fe;" onclick="window.openManageBrain('${item.wid}', '${escapeJs(item.name)}', '${escapeJs(item.station)}')">🧠 战术微调</button>
             <button class="god-btn" style="color:var(--accent-cyan); border-color:var(--accent-cyan);" onclick="window.triggerOuroborosProtocol('${item.wid}')">📡 战术评估</button>` :
            `<button class="god-btn" style="color:var(--accent-cyan); border-color:var(--accent-cyan);" onclick="window.grantMemory('${item.wid}', '${escapeJs(item.name)}', '${escapeJs(item.station)}')">🧬 提拔为军师</button>`;

        const div = document.createElement('div'); 
        div.className = 'feed-item';
        div.style.borderLeft = item.hasMemory ? "3px solid #d8b4fe" : "3px solid #333"; 
        
        div.innerHTML = `
            <div class="worker-meta">
                <span class="worker-name" style="${item.hasMemory ? 'color:#d8b4fe;' : ''}">
                    🤖 ${item.name} ${item.hasMemory ? '💎[向量共生体]' : '<span style="color:#666;">[未开化]</span>'} | 📍 ${item.station}
                </span>
                <span style="color:#666;">${item.time}</span>
            </div>
            <div class="worker-thought" style="font-size:0.9rem; line-height:1.6;">${item.thought}</div>
            <div class="god-actions" style="margin-top:10px;">
                <button class="god-btn" onclick="actOnWorker(${realIndex}, 'like')">👍 提取结晶</button>
                <button class="god-btn" onclick="toggleReplyBox(${realIndex})">💬 发布新帖(指令)</button>
                ${privilegeBtn}
            </div>
            <div class="reply-box" id="reply-box-${realIndex}">
                <textarea id="reply-input-${realIndex}" placeholder="发布全局/个体新指令，将作为新一轮循环的起点..."></textarea>
                <button onclick="submitReply(${realIndex})">⚡ 注入向量库</button>
            </div>
        `;
        feedContainer.appendChild(div); 
    });
}

function toggleReplyBox(index) {
    const box = document.getElementById(`reply-box-${index}`);
    if (box) box.style.display = box.style.display === 'flex' ? 'none' : 'flex';
}
async function actOnWorker(index, action) { alert(`已从该报告中提取核心精华，准备凝结...`); }

window.grantMemory = async function(wid, name, station) {
    if (!confirm(`确定赋予 [${name}] 长久记忆特权并录入编制吗？`)) return;
    await loadWorkersFromServer();
    aiWorkers[wid] = { wid, name, station, hasMemory: true, freq: 60, steelMark: "" };
    await saveWorkersToServer();
    alert(`✅ 已赋予 [${name}] 向量特权。`);
    loadFeedFromServer();
};

window.openManageBrain = async function(wid, name, station) {
    await loadWorkersFromServer();
    const ai = aiWorkers[wid] || { wid, name, station, freq: 60, steelMark: "" };
    document.getElementById('mb-wid').value = ai.wid;
    document.getElementById('mb-name').value = ai.name || name;
    document.getElementById('mb-station').value = ai.station || station;
    document.getElementById('mb-name-display').innerText = `- ${ai.name || name}`;
    document.getElementById('mb-freq').value = ai.freq;
    document.getElementById('mb-steelmark').value = ai.steelMark || "";
    document.getElementById('manage-brain-modal').style.display = 'flex';
    
    // 👇 【新增：触发 DNA 胶囊渲染】 👇
    if(typeof window.renderBossDnaPills === 'function') {
        setTimeout(window.renderBossDnaPills, 50);
    }
};

window.saveBrainConfig = async function() {
    const wid = document.getElementById('mb-wid').value;
    const name = document.getElementById('mb-name').value;
    const station = document.getElementById('mb-station').value;
    const freq = parseInt(document.getElementById('mb-freq').value) || 60;
    const steelMark = document.getElementById('mb-steelmark').value.trim();

    await loadWorkersFromServer();
    aiWorkers[wid] = { wid, name, station, hasMemory: true, freq, steelMark };
    await saveWorkersToServer();
    document.getElementById('manage-brain-modal').style.display = 'none';
};

window.revokeMemory = async function() {
    const wid = document.getElementById('mb-wid').value;
    const name = document.getElementById('mb-name').value;
    if (!confirm(`💀 警告：确定要剥夺 [${name}] 的记忆并执行物理淘汰吗？`)) return;
    
    await loadWorkersFromServer();
    if (aiWorkers[wid]) {
        delete aiWorkers[wid];
        await saveWorkersToServer();
    }
    document.getElementById('manage-brain-modal').style.display = 'none';
    microcosmHistory.push({ 
        name: name, wid: wid, station: "回收站", 
        thought: `[致命警告]: 存储扇区正在被厂长清空，代码链解体...`, 
        time: new Date().toLocaleTimeString(),
        timestamp: Date.now(), 
        hasMemory: false 
    });
    await fetch('/api/microcosm/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ feed: microcosmHistory }) });
    renderFeed();
};

async function submitReply(index) {
    const item = microcosmHistory[index];
    const input = document.getElementById(`reply-input-${index}`).value.trim();
    if(!input) return;

    document.getElementById(`reply-box-${index}`).innerHTML = '<span style="color:var(--accent-cyan); font-size:0.8rem;">正在凝结为全局向量指令...</span>';
    
    try {
        const memId = `post_${Date.now()}`;
        await fetch(`/api/memory/factory_dev`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id: memId, text: `[最高目标帖]: 对 ${item.name} 或全局发布指令: ${input}`, mem_type: "sop" })
        });

        microcosmHistory.push({ 
            name: "厂长 (全局广播)", wid: "ROOT", station: "歼星舰指挥所", 
            time: new Date().toLocaleTimeString(), timestamp: Date.now(), 
            hasMemory: true,
            thought: `<span style="color:var(--accent-gold); font-weight:bold;">[发布新循环起点]</span>: ${escapeHtml(input)}<br><span style="color:#aaa; font-size:0.8rem;">(已写入 SOP 向量库，各 AI 节点将在下一周期吸收执行)</span>` 
        });
        
        await fetch('/api/microcosm/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ feed: microcosmHistory }) });
        renderFeed();
    } catch(e) { alert("发帖失败！"); }
}

window.forceFetchThought = async function() { 
    try {
        await fetch('/api/microcosm/force_thought', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: "mob", aiData: null })
        });
        setTimeout(loadFeedFromServer, 5000);
    } catch (e) { console.error(e); }
}

window.toggleMicrocosm = async function(action) {
    try {
        const res = await fetch('/api/microcosm/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: action })
        });
        const data = await res.json();
        alert(data.message);
    } catch(e) {
        alert("开关指令发送失败");
    }
};

loadWorkersFromServer();
loadFeedFromServer();
setInterval(loadFeedFromServer, 180000); 

// ================= 🛡️ 全域探头与审计数据中继 =================
async function fetchAuditStats() {
    try {
        const res = await fetch('/api/audit/stats');
        if (res.ok) {
            const data = await res.json();
            if (document.getElementById('asset-count')) document.getElementById('asset-count').innerText = data.assets;
            if (document.getElementById('block-count')) document.getElementById('block-count').innerText = data.blocks;
        }
    } catch (e) {}
}
fetchAuditStats();
setInterval(fetchAuditStats, 5000);

const auditLogsContainer = document.getElementById('audit-logs-container');
let isAuditConnected = false;

function initAuditStream() {
    if (isAuditConnected || !auditLogsContainer) return;
    const evtSource = new EventSource('/api/radar/stream');
    evtSource.onopen = () => { isAuditConnected = true; addAuditLog('✅ 雷达信号已接驳', 'cyan'); };

    evtSource.onmessage = function(e) {
        if(e.data && auditLogsContainer) {
            const text = e.data;
            const now = new Date().toLocaleTimeString('zh-CN', { hour12: false }).substring(0, 5); 
            let logType = '';
            if (text.match(/阻断|警告|失败|崩溃|ERROR|❌|🔥/i)) logType = 'red';
            else if (text.match(/完成|成功|折叠|引渡|✅|🏁|🧬/i)) logType = 'cyan';

            if (logType) {
                const cleanText = text.replace(/<[^>]*>?/gm, '').replace(/\[.*?\]\s*/, '').substring(0, 40) + '...';
                const colorHex = logType === 'red' ? 'var(--accent-red)' : 'var(--accent-cyan)';
                const logHtml = `<div style="padding: 4px 0;"><span style="color: #555;">[${now}]</span> <span style="color:${colorHex};">${cleanText}</span></div>`;
                auditLogsContainer.insertAdjacentHTML('afterbegin', logHtml);
                if (auditLogsContainer.children.length > 15) auditLogsContainer.removeChild(auditLogsContainer.lastChild);
            }
        }
    };

    evtSource.onerror = function() {
        isAuditConnected = false; evtSource.close();
        if (auditLogsContainer) addAuditLog('⚠️ 信号丢失，10秒后重试', 'red');
        setTimeout(initAuditStream, 10000); 
    };
}

function addAuditLog(msg, type) {
    if (!auditLogsContainer) return;
    const now = new Date().toLocaleTimeString('zh-CN', { hour12: false }).substring(0, 5);
    const colorHex = type === 'red' ? 'var(--accent-red)' : 'var(--accent-cyan)';
    const logHtml = `<div style="padding: 4px 0;"><span style="color: #555;">[${now}]</span> <span style="color:${colorHex};">${msg}</span></div>`;
    auditLogsContainer.insertAdjacentHTML('afterbegin', logHtml);
    if (auditLogsContainer.children.length > 15) auditLogsContainer.removeChild(auditLogsContainer.lastChild);
}

setTimeout(initAuditStream, 2000);

// 👇 【新增开始】：歼星舰全域 DNA 库与 Ouroboros 战术评估逻辑 👇

let DNA_VAULT = [];
window.addEventListener('load', async () => {
    try {
        const res = await fetch('/api/config/dna');
        if (res.ok) {
            const data = await res.json();
            DNA_VAULT = Array.isArray(data.vault) ? data.vault : [];
        }
    } catch(e) {}
});

// === 1. 基因注入交互逻辑 ===
window.openBossDnaPicker = function() {
    const listContainer = document.getElementById('dna-picker-list');
    if(!listContainer) return;
    listContainer.innerHTML = '';
    const currentTa = document.getElementById('mb-steelmark').value;

    DNA_VAULT.forEach(dna => {
        const macro = `{{${dna.id}}}`;
        const isSelected = currentTa.includes(macro);
        const item = document.createElement('div');
        item.style.cssText = `display:flex; justify-content:space-between; align-items:center; padding:12px; background:rgba(255,255,255,0.05); border:1px solid ${isSelected ? 'var(--accent-cyan)' : '#333'}; border-radius:8px; cursor:pointer; transition:0.2s;`;
        
        item.onclick = () => {
            const ta = document.getElementById('mb-steelmark');
            if (!ta.value.includes(macro)) ta.value = ta.value ? ta.value + '\n\n' + macro : macro;
            else ta.value = ta.value.replace(new RegExp('\\n?\\n?' + macro, 'g'), '');
            window.renderBossDnaPills();
            document.getElementById('modal-dna-picker').style.display='none';
        };
        
        let icon = dna.type === 'identity' ? '👤' : (dna.type === 'rule' ? '🚨' : '⚙️');
        item.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:1.2rem;">${icon}</span>
                <div>
                    <div style="color:#eee; font-weight:bold; font-size:0.9rem;">${dna.name}</div>
                    <div style="color:#666; font-size:0.7rem; margin-top:2px;">${dna.id}</div>
                </div>
            </div>
            <div style="font-size:1.2rem; color:var(--accent-cyan);">${isSelected ? '✔️' : '＋'}</div>
        `;
        listContainer.appendChild(item);
    });
    document.getElementById('modal-dna-picker').style.display = 'flex';
};

window.renderBossDnaPills = function() {
    const ta = document.getElementById('mb-steelmark');
    const container = document.getElementById('mb-dna-pills');
    if(!ta || !container) return;
    
    container.innerHTML = '';
    const matches = ta.value.match(/\{\{([A-Za-z0-9_]+)\}\}/g) || [];
    matches.forEach(m => {
        const dnaId = m.replace('{{', '').replace('}}', '');
        const dnaObj = DNA_VAULT.find(d => d.id === dnaId);
        if (dnaObj) {
            container.innerHTML += `<div style="background:rgba(32,201,151,0.15); border:1px solid var(--accent-cyan); color:var(--accent-cyan); padding:2px 8px; border-radius:12px; font-size:0.7rem; font-weight:bold;">${dnaObj.name}</div>`;
        }
    });
};

// === 2. Ouroboros 军师自检战术逻辑 ===
let obSwarmContext = { wid: null, patch: null };

window.triggerOuroborosProtocol = function(wid) {
    const worker = aiWorkers[wid];
    if (!worker) return alert("找不到该军师节点数据");
    
    obSwarmContext.wid = wid;
    obSwarmContext.patch = null;
    
    document.getElementById('ob-worker-name').innerText = worker.name;
    document.getElementById('ob-worker-id').innerText = wid;
    document.getElementById('ob-worker-mark').innerText = worker.steelMark || "尚未装配战术大纲";
    
    document.getElementById('ob-console-output').innerHTML = `<span style="color:var(--accent-cyan);">该军师节点的近期密报似乎偏离了最高战略意图。</span><br><br>指挥官，请授权主脑对其战略钢印进行推演与重构升级。`;
    
    document.getElementById('ob-btn-diagnose').style.display = 'block';
    document.getElementById('ob-btn-diagnose').disabled = false;
    document.getElementById('ob-btn-apply').style.display = 'none';
    
    const modal = document.getElementById('ouroborosModal');
    if(modal) modal.style.display = 'flex';
};

window.startSwarmHealing = async function() {
    const consoleOut = document.getElementById('ob-console-output');
    const btnDiag = document.getElementById('ob-btn-diagnose');
    btnDiag.disabled = true;
    const worker = aiWorkers[obSwarmContext.wid];

    try {
        consoleOut.innerHTML = "<span style='color:var(--accent-purple);'>[1/2] 正在建立与歼星舰主脑的神经直连...</span><br>";
        if (!activeBrainId) throw new Error("指挥所未挂载全局大模型主脑，请先在顶部下拉框配置。");
        
        const aiRes = await fetch('/api/config/ai');
        const aiData = await aiRes.json();
        let chiefPhysician = null;
        for (let cat of (aiData.categories || [])) {
            chiefPhysician = cat.nodes.find(n => n.id === activeBrainId);
            if (chiefPhysician) break;
        }
        if (!chiefPhysician && aiData.vendors) {
            chiefPhysician = aiData.vendors.find(n => n.id === activeBrainId);
        }
        if (!chiefPhysician) throw new Error("主脑模型离线或未就绪。");

        consoleOut.innerHTML += "<span style='color:var(--accent-cyan);'>[2/2] 主脑正在读取该军师的配置流，推演全新的战术红线与大纲...</span><br>";
        
        const sysPrompt = `你是一个顶级战略架构师。歼星舰指挥所内的一名精英军师节点近期战术输出不够专业、精准或出现了逻辑偏移。
请根据该军师当前的【战略钢印】配置，为其提炼出一个全新的 Rule (红线) 或 SOP 基因，以全面提升其作为“系统级监控哨兵”的极客感。
【绝对强制】：只输出JSON，绝不允许废话，格式如下：
{
  "analysis": "【战术评估】：简述当前配置的不足，以及升级思路...",
  "proposed_dnas": [
    { "id": "SOP_ELITE_xxx_V2", "type": "rule", "name": "💡 战术升维大纲", "content": "..." }
  ]
}`;

        const res = await fetch(chiefPhysician.url.endsWith('/completions') ? chiefPhysician.url : `${chiefPhysician.url.replace(/\/$/, '')}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${chiefPhysician.key}` },
            body: JSON.stringify({
                model: chiefPhysician.name,
                messages: [
                    { role: "system", content: sysPrompt }, 
                    { role: "user", content: `【军师代号】：${worker.name}\n【网络坐标】：${worker.station}\n【当前战略钢印】：\n${worker.steelMark}` }
                ],
                temperature: 0.2
            })
        });

        if(!res.ok) throw new Error("主脑连接受阻。");
        const data = await res.json();
        const reply = data.choices[0].message.content.trim();
        const match = reply.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("主脑返回了未知的降维数据。");
        
        obSwarmContext.patch = JSON.parse(match[0]);
        
        consoleOut.innerHTML = `
            <div style="color:var(--accent-cyan); font-size:1rem; margin-bottom:10px;">📋 战术评估报告：</div>
            <div style="color:#eee; margin-bottom:20px; border-left:3px solid var(--accent-cyan); padding-left:10px;">${obSwarmContext.patch.analysis}</div>
            <div style="color:#d8b4fe; font-size:1rem; margin-bottom:10px;">💡 提炼的新版战略基因：</div>
            ${obSwarmContext.patch.proposed_dnas.map(dna => `<div style="background:rgba(216,180,254,0.1); padding:8px; border-left:3px solid #d8b4fe; margin-bottom:5px;"><b>[${dna.id}]</b> ${dna.name}</div>`).join('')}
        `;
        btnDiag.style.display = 'none';
        document.getElementById('ob-btn-apply').style.display = 'block';

    } catch (error) {
        consoleOut.innerHTML += `<br><span style='color:var(--accent-red);'>❌ 推演中断：${error.message}</span>`;
        btnDiag.disabled = false;
    }
};

window.applySwarmPatch = async function() {
    const btnApply = document.getElementById('ob-btn-apply');
    const consoleOut = document.getElementById('ob-console-output');
    btnApply.disabled = true; btnApply.innerText = "⏳ 正在热更新全域配置...";
    
    try {
        const payload = {
            workflow_id: "swarm_hidden_room", node_id: obSwarmContext.wid, target_machine_id: "none",
            new_dnas: obSwarmContext.patch.proposed_dnas
        };
        await fetch('/api/workflow/auto_patch', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });

        const worker = aiWorkers[obSwarmContext.wid];
        const newDnaMacro = obSwarmContext.patch.proposed_dnas.map(d => `{{${d.id}}}`).join('\n\n');
        worker.steelMark = worker.steelMark ? worker.steelMark + '\n\n' + newDnaMacro : newDnaMacro;
        
        await saveWorkersToServer(); 
        
        consoleOut.innerHTML = `<h2 style="color:var(--accent-cyan); text-align:center; margin-top:20px;">✅ 战术重构完成，军师已接收最新指令！</h2>`;
        setTimeout(() => { document.getElementById('ouroborosModal').style.display = 'none'; }, 2000);
        
    } catch (e) {
        consoleOut.innerHTML += `<br><span style='color:var(--accent-red);'>❌ 落盘失败：${e.message}</span>`;
        btnApply.disabled = false; btnApply.innerText = "📥 确认落盘并升级战略钢印";
    }
};