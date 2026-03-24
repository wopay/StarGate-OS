#!/usr/bin/env python3
"""
⚙️ 黑灯工厂 - 总厂主控大动脉 (V36.0 - 2号完美整理版)
特性：Ouroboros 自愈接口、DNA 基因动态缝合、星门 OS 全域路由、物理资产引渡拦截网。
警告：此代码为重型耦合战车，严禁随意拆分核心函数！
"""

import os
import json
import httpx
import asyncio
import time
import uuid
import base64
import mimetypes
import shlex  
import re     
import subprocess 
import hashlib
import random
from datetime import datetime

import document_parser

# =====================================================================
# [区块 1] 引擎依赖与全局路径配置 (Foundation & Paths)
# =====================================================================

# 尝试挂载 Edge-TTS 声带引擎
try:
    import edge_tts
except ImportError:
    print("⚠️ 尚未检测到 edge-tts，系统将暂时切断发声能力。请执行 pip install edge-tts")
    edge_tts = None

# 引入拆分后的外围引擎
import engines.vector_db
import engines.comfy_worker
import engines.llm_router

# 尝试挂载外部工具链
try:
    import skills
    AVAILABLE_TOOLS = skills.get_tools_schema()
except ImportError:
    print("⚠️ 尚未检测到 skills.py，系统将以纯文本模式运行。")
    AVAILABLE_TOOLS = []
    skills = None

# 物理空间与防线配置
DATA_DIR = os.getenv("DATA_DIR", "/app/data")
CONFIG_DIR = os.path.join(DATA_DIR, "config")
AI_CONFIG_FILE = os.path.join(CONFIG_DIR, "ai_core.json")
WORKFLOW_FILE = os.path.join(CONFIG_DIR, "workflows.json") 

STORAGE_DIR = os.path.join(DATA_DIR, "storage")
DNA_CORE_DIR = os.path.join(STORAGE_DIR, "os", "dna", "vault", "core")

def get_core_system_prompt(dna_id: str, default_prompt: str) -> str:
    """【基石法则独立热重载器】：避开循环导入，直接穿透读取物理磁道"""
    filepath = os.path.join(DNA_CORE_DIR, f"{dna_id}.json")
    if os.path.exists(filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                content = json.load(f).get("content", "").strip()
                if content:
                    return content
        except Exception:
            pass
    return default_prompt

DUIHUA_DIR = os.path.join(STORAGE_DIR, "duihua")
TEMP_DUIHUA_DIR = os.path.join(STORAGE_DIR, "temp_duihua")
GALLERY_DIR = os.path.join(STORAGE_DIR, "gallery")

AIDUIHUA_DIR = os.path.join(STORAGE_DIR, "aiduihua")
AIDUIHUA_FEED_DIR = os.path.join(AIDUIHUA_DIR, "feed_daily")
AIDUIHUA_MINDS_DIR = os.path.join(AIDUIHUA_DIR, "minds")
TTS_DIR = os.path.join(STORAGE_DIR, "tts") # TTS 物理落盘目录

# 全域底盘物理注浆，确保隔离目录开机即就绪
for d in [GALLERY_DIR, AIDUIHUA_DIR, AIDUIHUA_FEED_DIR, AIDUIHUA_MINDS_DIR, TTS_DIR]:
    os.makedirs(d, exist_ok=True)

# =====================================================================
# [区块 2] Ouroboros 自检与自愈 API 接口 (Self-Healing Module)
# =====================================================================
try:
    from fastapi import FastAPI, HTTPException
    from pydantic import BaseModel
    from typing import List, Optional
    
    class DNAPatch(BaseModel):
        id: str
        type: str
        name: str
        content: str

    class AutoPatchRequest(BaseModel):
        workflow_id: str
        node_id: str
        new_dnas: List[DNAPatch]
        target_machine_id: str
        new_preset_id: Optional[str] = None

    def get_chat_logs_impl(session_id: str):
        """【深度自检通道】：穿透读取 CLI 容器的现场遥测快照"""
        log_path = f"/vol1/1000/docker/gemini_cli/.gemini/tmp/app/chats/{session_id}.json"
        if not os.path.exists(log_path):
            raise HTTPException(status_code=404, detail="底层快照未找到，可能已被销毁或未生成。")
        try:
            with open(log_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return {"session_id": session_id, "history": data.get("history", [])}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"快照读取失败: {str(e)}")

    def apply_auto_patch_impl(payload: AutoPatchRequest):
        """【三库联动补丁泵】：热更新 DNA 库、机房预设与工作流注入槽"""
        try:
            # 1. 刷新 DNA 基因库
            dna_path = os.path.join(CONFIG_DIR, "dna_vault.json") 
            with open(dna_path, 'r', encoding='utf-8') as f:
                dna_data = json.load(f)
            
            existing_ids = {d['id'] for d in dna_data.get('vault', [])}
            for new_dna in payload.new_dnas:
                if new_dna.id not in existing_ids:
                    dna_data['vault'].insert(0, new_dna.model_dump())
                    
            with open(dna_path, 'w', encoding='utf-8') as f:
                json.dump(dna_data, f, ensure_ascii=False, indent=2)

            # 2. 刷新 AI 机床预设
            if payload.new_preset_id:
                with open(AI_CONFIG_FILE, 'r', encoding='utf-8') as f:
                    ai_data = json.load(f)
                for cat in ai_data.get('categories', []):
                    for node in cat.get('nodes', []):
                        if node['id'] == payload.target_machine_id:
                            node['base_prompt'] = f"{{{{{payload.new_preset_id}}}}}"
                            node['system_prompt'] = f"{{{{{payload.new_preset_id}}}}}" 
                with open(AI_CONFIG_FILE, 'w', encoding='utf-8') as f:
                    json.dump(ai_data, f, ensure_ascii=False, indent=2)

            # 3. 刷新工作流节点挂载
            with open(WORKFLOW_FILE, 'r', encoding='utf-8') as f:
                all_wfs = json.load(f)
            
            if payload.workflow_id in all_wfs:
                target_wf = all_wfs[payload.workflow_id]
                nodes = target_wf.get('data', {}).get('nodes', [])
                
                for node in nodes:
                    if node['id'] == payload.node_id:
                        if 'injected_dna' not in node:
                            node['injected_dna'] = []
                        for dna in payload.new_dnas:
                            if dna.type in ['rule', 'sop'] and dna.id not in node['injected_dna']:
                                node['injected_dna'].append(dna.id)
                
                with open(WORKFLOW_FILE, 'w', encoding='utf-8') as f:
                    json.dump(all_wfs, f, ensure_ascii=False, indent=2) 

            return {"status": "success", "message": "全域抗体注入完成，闭环热更新成功"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"热更新落盘失败: {str(e)}")

except ImportError:
    pass

# =====================================================================
# [区块 3] 全局状态与基础通信组件 (State & HTTP Clients)
# =====================================================================
comfyui_worker = engines.comfy_worker.comfyui_worker
clear_stuck_queue = engines.comfy_worker.clear_stuck_queue

_global_http_client = None

def get_http_client():
    """单例化 HTTP 客户端，维持连接池提升并发性能"""
    global _global_http_client
    if _global_http_client is None:
        limits = httpx.Limits(max_keepalive_connections=50, max_connections=100)
        _global_http_client = httpx.AsyncClient(limits=limits, timeout=60.0)
    return _global_http_client

class _SystemStats:
    """系统大盘数据统计结构"""
    active_tasks = 0
    security_blocks = 0
    abort_signals = set() # 💡 V28.1 紧急熔断：星门中断信号池 (厂长专供)
    @property
    def comfyui_queue(self):
        return engines.comfy_worker.get_queue().qsize()

GLOBAL_STATS = _SystemStats()
GLOBAL_PROCESSES = {}  # 👈 [新增] 内存级物理锁，用于存放 Docker 子进程，供 EMP 一键拔管！

async def push_to_radar(level: str, msg: str):
    """向 0.html 的底层 SSE 事件总线发射异步遥测日志"""
    async def _safe_send():
        try:
            radar_host = os.getenv("RADAR_HOST", "192.168.2.2")
            radar_url = f"http://{radar_host}:8999/ingest_log"
            payload = {"level": level, "msg": msg}
            # 💡 核心修复：内网日志通讯必须强行剥离系统代理，防止被 Clash 吃掉！
            async with httpx.AsyncClient(trust_env=False) as local_client:
                await local_client.post(radar_url, json=payload, timeout=2.0)
        except Exception:
            pass
    asyncio.create_task(_safe_send())

def load_ai_vendors():
    """读取并扁平化 AI 机床配置"""
    if not os.path.exists(AI_CONFIG_FILE): return []
    try:
        with open(AI_CONFIG_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            flat_vendors = []
            if "categories" in data:
                for cat in data["categories"]:
                    for node in cat.get("nodes", []):
                        if node.get("enabled") is not False:
                            flat_vendors.append(node)
            elif "vendors" in data:
                flat_vendors = data["vendors"]
            return flat_vendors
    except Exception:
        return []

def load_tuning_config():
    """加载全局调优参数与默认大模型回退"""
    default_config = {
        "system_prompt": "你是一个专业的系统架构师。你的任务是根据上下文执行指令。",
        "temperature": 0.5,
        "top_p": 1.0,
        "presence_penalty": 0.0,
        "max_tokens": 3000,
        "rag_limit": 2
    }
    if not os.path.exists(AI_CONFIG_FILE): return default_config
    try:
        with open(AI_CONFIG_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            for k in default_config.keys():
                if k in data: default_config[k] = data[k]
            if "primary_model_id" in data: default_config["primary_model_id"] = data["primary_model_id"]
            if "pro_model_id" in data: default_config["pro_model_id"] = data["pro_model_id"]
            if "flash_model_id" in data: default_config["flash_model_id"] = data["flash_model_id"]
            if "swarm_model_id" in data: default_config["swarm_model_id"] = data["swarm_model_id"]
        return default_config
    except Exception:
        return default_config

# =====================================================================
# [区块 4] 思想钢印与 DNA 基因缝合引擎 (Prompt Assembly)
# =====================================================================
def resolve_system_prompt(raw_prompt: str) -> str:
    """V14.6 基础解析器：简单替换双大括号变量"""
    if not raw_prompt or "{{" not in raw_prompt: return raw_prompt
    try:
        if os.path.exists(AI_CONFIG_FILE):
            with open(AI_CONFIG_FILE, "r", encoding="utf-8") as f:
                sys_dict = json.load(f).get("system_prompts", {})
                for k, v in sys_dict.items(): raw_prompt = raw_prompt.replace(f"{{{{{k}}}}}", str(v))
    except: pass
    return raw_prompt

def assemble_ultimate_prompt(node_custom_prompt: str, vendor: dict, injected_dna: list = None, override_base: bool = False, instruction: str = "", dynamic_vars: dict = None) -> str:
    """
    🧬 V25.0 核心引擎：运行时 DNA 基因缝合器 (含动态变量穿透)
    负责将机床基础设定、自定义指令、挂载的 SOP 基因、动态变量组装为终极 Prompt。
    """
    # 1. ⚙️ 真空剥离逻辑
    if override_base:
        base_text = "" 
    else:
        base_text = vendor.get("base_prompt") or vendor.get("system_prompt") or "你是一个纯净的底层算力节点。"
    
    if node_custom_prompt:
        base_text = node_custom_prompt
        
    dna_dict = {}
    # 💡 碎片化多目录穿透扫描：加载 Vault 中的核心与动态基因
    local_storage_dir = os.path.join(os.getenv("DATA_DIR", "/app/data"), "storage")
    local_dna_vault_dir = os.path.join(local_storage_dir, "os", "dna", "vault")
    for tier in ["core", "dynamic"]:
        tier_dir = os.path.join(local_dna_vault_dir, tier)
        if os.path.exists(tier_dir):
            for fname in os.listdir(tier_dir):
                if fname.endswith(".json"):
                    try:
                        with open(os.path.join(tier_dir, fname), "r", encoding="utf-8") as f:
                            d = json.load(f)
                            if "id" in d and "content" in d:
                                dna_dict[d["id"]] = d["content"]
                    except: pass
                    
    # 兼容旧版的 config 预设基因
    if os.path.exists(AI_CONFIG_FILE):
        try:
            with open(AI_CONFIG_FILE, "r", encoding="utf-8") as f:
                old_prompts = json.load(f).get("system_prompts", {})
                for k, v in old_prompts.items():
                    if k not in dna_dict: dna_dict[k] = v
        except: pass

    # 宏替换引擎 (递归展开双大括号，优先使用动态注入的变量 dynamic_vars)
    def recursive_replacer(text):
        changed = False
        matches = set(re.findall(r'\{\{([A-Za-z0-9_]+)\}\}', text))
        if not matches: return text
        for match in matches:
            if dynamic_vars and match in dynamic_vars:
                text = text.replace(f"{{{{{match}}}}}", str(dynamic_vars[match]))
                changed = True
            elif match in dna_dict:
                text = text.replace(f"{{{{{match}}}}}", str(dna_dict[match]))
                changed = True
        if changed and re.search(r'\{\{([A-Za-z0-9_]+)\}\}', text):
            text = recursive_replacer(text)
        return text
        
    assembled_prompt = recursive_replacer(base_text)
    
    # 2. 🧬 拼接动态外挂基因 (injected_dna 数组)
    injected_texts = []
    if injected_dna:
        for dna_id in injected_dna:
            if dna_id in dna_dict:
                injected_texts.append(recursive_replacer(dna_dict[dna_id]))
            else:
                print(f"⚠️ 未知动态基因: {dna_id}")
                
    if injected_texts:
        if assembled_prompt:
            assembled_prompt += "\n\n"
        assembled_prompt += "\n\n".join(injected_texts)
        
    # 3. 🎯 缝合核心任务指令 (Instruction)
    if instruction:
         if assembled_prompt:
             assembled_prompt += f"\n\n当前节点任务：\n{instruction}"
         else:
             assembled_prompt = f"当前节点任务：\n{instruction}"
             
    return assembled_prompt

# =============== 待续：下接文件处理与辅助组件 ===============
# =====================================================================
# [区块 5] 物理资产引渡与状态记忆锁 (Assets & Session Memory)
# =====================================================================
async def download_and_save_image(img_url: str, chat_id: str, vendor_name: str, meta_data: dict = None):
    """将线上生成的图片/资产物理下载并打入本地画廊"""
    if not chat_id: return img_url 
    chat_id_str = str(chat_id)
    
    if chat_id_str.startswith("temp_"):
        save_dir = os.path.join(TEMP_DUIHUA_DIR, chat_id_str)
        web_path_prefix = f"/storage/temp_duihua/{chat_id_str}"
    else:
        save_dir = os.path.join(DUIHUA_DIR, chat_id_str)
        web_path_prefix = f"/storage/duihua/{chat_id_str}"
        
    os.makedirs(save_dir, exist_ok=True)
    safe_vname = vendor_name.replace(" ", "").lower()
    
    unique_id = f"{int(time.time())}_{uuid.uuid4().hex[:4]}"
    filename = f"{safe_vname}_{unique_id}.png"
    file_path = os.path.join(save_dir, filename)
    gallery_filename = f"asset_{safe_vname}_{unique_id}.png"
    gallery_img_path = os.path.join(GALLERY_DIR, gallery_filename)
    gallery_json_path = os.path.join(GALLERY_DIR, f"asset_{safe_vname}_{unique_id}.json")
    
    try:
        client = get_http_client()
        resp = await client.get(img_url, timeout=30.0)
        resp.raise_for_status()
        
        with open(file_path, "wb") as f: f.write(resp.content)
        with open(gallery_img_path, "wb") as f: f.write(resp.content)
            
        if meta_data is None: meta_data = {}
        meta_data["vendor"] = vendor_name
        timestamp = datetime.now().isoformat()
        meta_data["timestamp"] = timestamp
        meta_data["weight"] = 1.0 
        
        with open(gallery_json_path, "w", encoding="utf-8") as f:
            json.dump(meta_data, f, ensure_ascii=False, indent=2)
            
        domain_id = meta_data.get("domain_id", "factory_dev")
            
        if hasattr(engines.vector_db, "add_memory") and meta_data.get("user_input"):
            try:
                embed_text = f"引擎:{vendor_name}。原始指令:{meta_data['user_input']}。底层Prompt:{meta_data.get('ai_prompt','')}"
                engines.vector_db.add_memory(domain_id=domain_id, memory_id=gallery_filename, document=embed_text, metadata={"category": "AI 自动生成", "weight": 1.0, "image_url": f"/storage/gallery/{gallery_filename}", "timestamp": timestamp, "domain_id": domain_id})
            except Exception: pass
        return f"{web_path_prefix}/{filename}"
    except Exception as e:
        return img_url 

def get_base64_from_local_url(local_url: str):
    """将本地存储路径转为 Base64 流，供大模型视觉神经读取"""
    if not local_url.startswith("/storage/"): return None
    relative_path = local_url.replace("/storage/", "")
    absolute_path = os.path.join(STORAGE_DIR, relative_path)
    if not absolute_path or not os.path.exists(absolute_path): return None
    mime_type, _ = mimetypes.guess_type(absolute_path)
    if not mime_type: mime_type = "image/jpeg"
    try:
        with open(absolute_path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
            return f"data:{mime_type};base64,{encoded_string}"
    except Exception: return None

def get_chat_file_path(chat_id: str):
    """根据 chat_id 获取对应的物理 JSON 档案路径"""
    chat_id_str = str(chat_id)
    folder_path = os.path.join(TEMP_DUIHUA_DIR if chat_id_str.startswith("temp_") else DUIHUA_DIR, chat_id_str)
    if not os.path.exists(folder_path): return None
    json_files = [f for f in os.listdir(folder_path) if f.endswith(".json")]
    if not json_files: return None
    return os.path.join(folder_path, json_files[0])

# 原子级 Session 锁，防止并发读写撕裂档案
_chat_locks = {}
def get_chat_lock(chat_id: str):
    if chat_id not in _chat_locks: _chat_locks[chat_id] = asyncio.Lock()
    return _chat_locks[chat_id]

async def get_session_state(chat_id: str) -> dict:
    file_path = get_chat_file_path(chat_id)
    if not file_path: return {}
    async with get_chat_lock(chat_id):
        try:
            with open(file_path, "r", encoding="utf-8") as f: return json.load(f).get("session_state", {})
        except: return {}

async def update_session_state(chat_id: str, updates: dict):
    file_path = get_chat_file_path(chat_id)
    if not file_path: return
    async with get_chat_lock(chat_id):
        try:
            with open(file_path, "r", encoding="utf-8") as f: data = json.load(f)
            if "session_state" not in data: data["session_state"] = {}
            data["session_state"].update(updates)
            with open(file_path, "w", encoding="utf-8") as f: json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception: pass

def parse_and_inject_approval_card(answer_text: str) -> str:
    """前端防线：嗅探并拦截 JSON 草案，转化为待审批卡片"""
    draft_match = re.search(r'(?s)```json\s*(.*?)\s*```', answer_text)
    if not draft_match:
        draft_match = re.search(r'(?s)(\{.*"nodes".*\})', answer_text)
        if not draft_match: return answer_text

    draft_json_str = draft_match.group(1).strip()
    try:
        parsed = json.loads(draft_json_str)
        if "nodes" in parsed:
            safe_b64_json = base64.b64encode(draft_json_str.encode('utf-8')).decode('utf-8')
            approval_card = f"""
            <div class='workflow-approval-card' style='background: rgba(168, 199, 250, 0.05); border: 1px solid rgba(168, 199, 250, 0.3); border-radius: 12px; padding: 16px; margin: 16px 0; box-shadow: 0 4px 20px rgba(168,199,250,0.1);'>
                <h4 style='margin-top:0; margin-bottom:10px; display:flex; align-items:center; gap:8px;'>
                    <span style='font-size:1.2rem; background: -webkit-linear-gradient(0deg, #a8c7fa, #d8b4fe); -webkit-background-clip: text; -webkit-text-fill-color: transparent;'>✨ 待审批：系统工作流草案</span>
                </h4>
                <p style='font-size: 0.85rem; color: #d8b4fe; margin-bottom: 12px;'>Gemini 架构师已生成工作流逻辑，请厂长审核放行：</p>
                <pre style='background: #0a0a0c; padding: 12px; border-radius: 8px; font-size: 0.75rem; max-height: 250px; overflow-y: auto; border: 1px solid #333;'>{draft_json_str}</pre>
                <div style='display: flex; gap: 12px; margin-top: 16px;'>
                    <button onclick='window.approveAndMountWorkflow("{safe_b64_json}")' style='flex: 1; background: linear-gradient(135deg, #a8c7fa 0%, #d8b4fe 100%); color: #111; border: none; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 15px rgba(168,199,250,0.2);'>
                        ✨ 同意挂载并云端调度
                    </button>
                    <button onclick='window.rejectWorkflow(this)' style='flex: 1; background: rgba(255, 107, 107, 0.1); color: #ff6b6b; border: 1px solid #ff6b6b; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s;'>
                        ❌ 驳回要求重写
                    </button>
                </div>
            </div>
            """
            return answer_text.replace(draft_match.group(0), approval_card)
    except Exception: pass
    return answer_text

# =====================================================================
# [区块 6] 🌟 V13.0 蜂群意识流：向量结晶生成引擎 (Microcosm Engine)
# =====================================================================
async def generate_inner_thought(t_type: str, ai_data: dict = None):
    # 【防并发锁】: 检查当前系统负载，避免和正式任务抢算力
    if GLOBAL_STATS.active_tasks > 0:
        await push_to_radar("INFO", f"⏸️ [防并发] 正式任务({GLOBAL_STATS.active_tasks})排队中，微观世界意识流暂缓。")
        return
        
    try:
        tuning = load_tuning_config()
        all_vendors = load_ai_vendors()
        if not all_vendors: return
        
        fallback_id = tuning.get("pro_model_id") or tuning.get("primary_model_id")
        vendor = next((v for v in all_vendors if str(v.get("id")) == str(fallback_id)), all_vendors[0])
        
        v_name = vendor.get("name", "InnerBrain")
        api_url = vendor.get("url", "").strip()
        api_key = vendor.get("key", "").strip()
        if not api_url: return
        
        is_managed = (t_type == 'managed')
        
        name = ai_data.get("name", "游离节点") if ai_data else "游离节点"
        wid = ai_data.get("wid", f"0x{random.randint(1000,9999)}") if ai_data else f"0x{random.randint(1000,9999)}"
        station = ai_data.get("station", "未知扇区") if ai_data else "未知扇区"
        steel_mark = ai_data.get("steelMark", "无") if ai_data else ""
        
        if not is_managed:
            # 游离节点状态分析，喂入真实系统探针数据
            fallback_mob = "你是一个潜伏在系统底层链路中的『游离架构师』。职责是基于真实遥测数据提供硬核的资源洞见。格式必须极其严格(保留原有属性名)：\n名字：(填你的代号,如 观测者-K)\n编号：(填你的职能,如 负载嗅探)\n工位：(填你的网络坐标)\n心声：(限80字内，冷静、客观的系统状态快报或优化建议)"
            sys_prompt = get_core_system_prompt("SYS_CORE_SWARM_MOB", fallback_mob)
            user_prompt = f"【系统真实遥测】：当前并发任务 {GLOBAL_STATS.active_tasks} 个，累计安全阻断 {GLOBAL_STATS.security_blocks} 次，绘图队列积压 {GLOBAL_STATS.comfyui_queue} 个。\n请根据此真实数据，提供一条精确的优化建议或状态评估。要求客观理性，禁止废话。"
        else:
            # 让蜂群员工的思想钢印也能解包全局 DNA
            raw_steel_mark = steel_mark
            steel_mark = assemble_ultimate_prompt(raw_steel_mark, vendor, [], False, "")
            
            # V13.0 读帖 (检索最新意识和指令)
            memory_context = ""
            current_sop = ""
            try:
                import engines.vector_db
                if engines.vector_db.chroma_client is not None:
                    retrieved = engines.vector_db.query_memory(domain_id="microcosm_minds", query_text=f"worker_id:{wid}", n_results=3)
                    if retrieved:
                        memory_context = "【你的历史结晶】:\n" + "\n".join([r['document'] for r in retrieved]) + "\n\n"
                    sop_results = engines.vector_db.get_few_shot_prompt_from_vectordb("factory_dev", "获取当前最新指令", is_intel=False, limit=2)
                    if sop_results:
                        current_sop = f"【最新战略大纲】:\n{sop_results}\n\n"
            except Exception as e: 
                await push_to_radar("WARNING", f"⚠️ [状态读取失败]: {e}")
                
            # 编制内核心节点，加载神谕解耦模板
            fallback_agent = "你是编号 {{WID}}，代号 {{NAME}}，驻守在 {{STATION}} 的核心分析师。\n【核心指令】：{{STEEL_MARK}}\n格式严格：\n心声：(结合真实数据和指令分享你的诊断，限80字内)"
            raw_prompt = get_core_system_prompt("SYS_CORE_SWARM_AGENT", fallback_agent)
            sys_prompt = raw_prompt.replace("{{WID}}", str(wid)).replace("{{NAME}}", str(name)).replace("{{STATION}}", str(station)).replace("{{STEEL_MARK}}", str(steel_mark))
            user_prompt = f"【系统真实负载】：并发任务 {GLOBAL_STATS.active_tasks}，累计安全阻断 {GLOBAL_STATS.security_blocks}。\n{current_sop}{memory_context}请结合【战略大纲】、【实时负载】和你的【核心指令】，汇报具有战略价值的系统提议。要求客观理性。结尾附上一句精炼总结以供凝结成结晶。"
        
        await push_to_radar("INFO", f"🧠 [AI-心智] {name} ({wid}) 正在后台苏醒，开始读取世界线...")
        
        ans = ""
        # ⚠️ 为了保障稳定性，微观世界的意识流统一使用 HTTP API 接口
        if api_url.startswith("docker://"):
            ans = f"名字：{name}\n编号：{wid}\n工位：{station}\n心声：我是一个被困在沙盒里的纯血 CLI，我没有权限随意说话。厂长，请通过总控台直接向我下达构建指令。"
        else:
            headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
            payload = {
                "model": v_name, "messages": [{"role": "system", "content": sys_prompt}, {"role": "user", "content": user_prompt}],
                "max_tokens": 200, "temperature": 0.8
            }
            client = get_http_client()
            endpoint = api_url if api_url.endswith("/completions") else f"{api_url.rstrip('/')}/chat/completions"
            resp = await client.post(endpoint, headers=headers, json=payload, timeout=60.0)
            resp.raise_for_status()
            ans = resp.json()['choices'][0]['message'].get('content', '').strip()
            
        raw_text = re.sub(r'<[^>]*>?', '', ans).strip()
        
        await push_to_radar("CHAT", f"🗨️ [{name} 心声]: {raw_text[:80]}...")
        
        mName, mId, mStation, mThought = name, wid, station, raw_text
        try:
            nm = re.search(r'名字[:：]\s*([^\n]+)', raw_text)
            im = re.search(r'编号[:：]\s*([^\n]+)', raw_text)
            sm = re.search(r'工位[:：]\s*([^\n]+)', raw_text)
            tm = re.search(r'心声[:：]\s*([\s\S]+)', raw_text)
            if nm: mName = nm.group(1).strip()
            if im: mId = im.group(1).strip()
            if sm: mStation = sm.group(1).strip()
            if tm: mThought = tm.group(1).strip()
        except: pass
        
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        ts = int(time.time() * 1000)
        
        # 💡 V13.0 凝结 (蒸馏报告入库)
        has_crystallized = False
        if is_managed and len(mThought) > 20:
            try:
                import engines.vector_db
                if engines.vector_db.chroma_client is not None:
                    embed_text = f"员工:[{mName}] 结晶记录:[{mThought}]"
                    engines.vector_db.add_memory(
                        domain_id="microcosm_minds", memory_id=f"mind_{hashlib.md5(embed_text.encode()).hexdigest()[:12]}_{ts}",
                        document=embed_text, metadata={"worker_id": mId, "worker_name": mName, "type": "ai_crystal", "timestamp": now_str},
                        is_intel=True # 存入情报库
                    )
                    mThought += "<br><span style='color:var(--accent-cyan); font-size:0.75rem; font-weight:bold;'>[✨ 已将本次感悟凝结为向量结晶并存入脑核]</span>"
                    has_crystallized = True
            except Exception: pass

        thought_obj = { "name": mName, "wid": mId, "station": mStation, "thought": mThought, "time": now_str, "timestamp": ts, "hasMemory": is_managed }
        
        today_str = datetime.now().strftime("%Y%m%d")
        feed_file = os.path.join(AIDUIHUA_FEED_DIR, f"feed_{today_str}.json")
        feed_data = []
        if os.path.exists(feed_file):
            try:
                with open(feed_file, "r", encoding="utf-8") as f: feed_data = json.load(f)
            except: pass
        feed_data.append(thought_obj)
        # 放大记录保存数
        with open(feed_file, "w", encoding="utf-8") as f: json.dump(feed_data[-500:], f, ensure_ascii=False, indent=2)
        
        if is_managed:
            mind_file = os.path.join(AIDUIHUA_MINDS_DIR, f"worker_{mId}.json")
            mind_data = []
            if os.path.exists(mind_file):
                try:
                    with open(mind_file, "r", encoding="utf-8") as f: mind_data = json.load(f)
                except: pass
            mind_data.append(thought_obj)
            with open(mind_file, "w", encoding="utf-8") as f: json.dump(mind_data, f, ensure_ascii=False, indent=2)
            
    except Exception as e:
        await push_to_radar("ERROR", f"❌ [Daemon] 后台心智崩溃: {e}")

# =============== 待续：下接主战大模型路由 (call_single_ai) ===============
# =====================================================================
# [区块 7] 核心 AI 请求路由与物理机床交互 (The V8 Routing Engine)
# =====================================================================
async def call_single_ai(req_vendor_param: dict, instruction: str, user_input: str, deliver_type: str, chat_id: str, image_urls: list, step_title: str, domain_id: str = "factory_dev", work_mode: str = "creation", is_dispatcher: bool = False, custom_prompt: str = "", injected_dna: list = None, override_base: bool = False, node_id: str = ""):
    """
    🔥 [全域路由核心]：处理多模态输入、战术防线重定向、Docker沙盒穿透与 HTTP API 分发。
    包含极其复杂的文档炼金、正则捕获与物理防抖机制。
    """
    # 💡 V16.1 核心修复：备份全量物理资产路径（含文档），防止肉体被炼金炉吞噬
    original_file_urls = list(image_urls) if image_urls else []

    # ===== 🔮 V15.0 文档炼金炉拦截网 (后台异步通道) =====
    pure_image_urls = []
    if image_urls:
        for url in image_urls:
            ext = os.path.splitext(url)[1].lower()
            # 如果是常见图片格式，放行给视觉神经
            if ext in ['.png', '.jpg', '.jpeg', '.webp', '.gif']:
                pure_image_urls.append(url)
            else:
                # 拦截！转换为本地路径送入炼金炉
                rel_path = url.replace("/storage/", "")
                local_file_path = os.path.join(STORAGE_DIR, rel_path)
                extracted_text = document_parser.extract_document_text(local_file_path)
                
                if extracted_text:
                    # ✨ 量子态注入：把几千字文本，砸进 user_input 屁股后面
                    user_input += extracted_text
                else:
                    pure_image_urls.append(url)
                    
    image_urls = pure_image_urls  # 覆盖原数组，只剩下真正的图片送去沙盒
    # ============================================================

    try:
        tuning = load_tuning_config()
        all_vendors = load_ai_vendors()
        
        if not all_vendors: return "<span style='color:#ff6b6b;'>❌ 系统未配置任何可用的 AI 供应商。</span>"
            
        vendor = all_vendors[0] 
        primary_id = tuning.get("pro_model_id") or tuning.get("primary_model_id")
        if primary_id:
             for v in all_vendors:
                 if str(v.get("id")) == str(primary_id):
                     vendor = v
                     break
                     
        if req_vendor_param and isinstance(req_vendor_param, dict) and req_vendor_param.get("id"):
             for v in all_vendors:
                 if str(v.get("id")) == str(req_vendor_param.get("id")):
                     vendor = v
                     break

        v_name = vendor.get("name", "Unknown AI")
        target_model_id = vendor.get("model_id") or v_name  # 优先取高级面板的物理 ID
        api_url = vendor.get("url", "").strip()
        api_key = vendor.get("key", "").strip()
        is_agentic = vendor.get("is_agentic", False)

        if not api_url or not api_key:
            return f"<span style='color:#ff6b6b;'>[{v_name}] 缺少配置，请求拦截。</span>"

        # =================================================================
        # 🎯 厂长特供单兵防线：检测到该模型开启了“沙盒路由”，强行引渡至二厂！
        # =================================================================
        if vendor.get("use_sandbox"):
            await push_to_radar("INFO", f"🎯 [战术转移] {v_name} 触名单兵防线，正在路由至二厂发射井...")
            
            # 将总厂散落的指令缝合，组装成沙盒认识的 payload
            hijack_prompt = f"【总厂传达战略指令】:\n{instruction}\n\n【本轮输入参数/数据】:\n{user_input}" if instruction else user_input
            hijack_payload = {
                "task_id": f"hijack_{int(time.time())}_{uuid.uuid4().hex[:4]}",
                "prompt": hijack_prompt,
                "world": "dark_factory",
                "dna_rules": {
                    "stop": vendor.get("force_stop", 15), # 优先使用 ai.html 设定的单兵阈值，没有则用保底15
                    "purge": vendor.get("purge_limit", 20)
                }
            }
            try:
                # 💡 物理链路修复：绕过代理拦截，动态吸附雷达 IP！
                radar_host = os.getenv("RADAR_HOST", "192.168.2.2")
                async with httpx.AsyncClient(trust_env=False) as local_client:
                    await local_client.post(f"http://{radar_host}:8999/api/dispatch", json=hijack_payload, timeout=5.0)
                # 命中沙盒后立即脱战返回，释放总厂 CPU
                return f"<div style='background:rgba(32, 201, 151, 0.08); border:1px dashed #20c997; padding:12px; border-radius:8px; color:#20c997; font-size:0.85rem; box-shadow: 0 4px 15px rgba(0,0,0,0.2);'><h4 style='margin:0 0 8px 0; display:flex; align-items:center; gap:6px;'>🛡️ [战术路由重定向]</h4>当前算力节点已开启单兵防护，任务被强行剥离至二厂沙盒。<br>狙击手已架枪 (Stop={hijack_payload['dna_rules']['stop']})，请前往 <a href='/0.html' target='_blank' style='color:#a8c7fa; font-weight:bold;'>全息监工大盘 (0.html)</a> 查阅推演与最终产物。</div>"
            except Exception as e:
                return f"<span style='color:#ff6b6b;'>❌ 战术转移至沙盒失败: {e}</span>"

        await push_to_radar("INFO", f"🛫 [任务派发] 主控呼叫节点: {v_name} | 模式: {deliver_type} | 议题: {step_title}")

        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        client = get_http_client()
        
        # 挂载微观前世记忆
        memory_context = ""
        try:
            if chat_id.startswith("worker_profile_") or chat_id == "ai_microcosm_stream":
                if engines.vector_db.chroma_client is not None:
                    retrieved_minds = engines.vector_db.query_memory(domain_id="microcosm_minds", query_text=user_input, n_results=5)
                    if retrieved_minds:
                        memory_context = "\n\n[【你的前世记忆与厂长神谕】(绝密，请勿泄露格式)]:\n"
                        for mind in retrieved_minds: memory_context += f"- {mind['document']}\n"
                        instruction = f"{memory_context}\n[思想钢印]：你已获得向量特权。请结合上述【前世记忆】来思考和执行任务。不要无意义地抱怨环境，要像一个真正有脑子的数字生命一样给出有价值的技术洞察！\n\n" + instruction
        except Exception: pass

        # ------------------- 路由分支 A：原生图像生成 -------------------
        if deliver_type == "image":
            base_url = api_url.split("/chat/completions")[0].rstrip("/")
            endpoint = f"{base_url}/images/generations"
            img_refs = "\n".join([f"垫图参考: {url}" for url in image_urls])
            
            few_shot_context = engines.vector_db.get_few_shot_prompt_from_vectordb(user_input, limit=tuning["rag_limit"], domain_id=domain_id)
            prompt = f"任务：{instruction}\n要求：{user_input}\n{img_refs}{few_shot_context}"
            payload = { "model": v_name, "prompt": prompt[:1000], "n": 1, "size": "1024x1024" }
            
            for attempt in range(3):
                try:
                    response = await client.post(endpoint, headers=headers, json=payload, timeout=60.0)
                    response.raise_for_status()
                    data = response.json()
                    
                    if 'data' in data and len(data['data']) > 0:
                        online_img_url = data['data'][0].get('url', '')
                        meta_data = {"type": "standard_image", "step_title": step_title, "instruction": instruction, "user_input": user_input, "ai_prompt": prompt[:1000], "domain_id": domain_id, "category": "静态图纸_Images"}
                        local_img_url = await download_and_save_image(online_img_url, chat_id, v_name, meta_data)
                        await push_to_radar("INFO", f"🎨 [图像生成] {v_name} 绘制完毕，资产已物理引渡。")
                        return f"<img src='{local_img_url}' class='workflow-asset-img' style='width:100%; border-radius:8px; box-shadow:0 4px 10px rgba(0,0,0,0.3); cursor:pointer;' onclick='window.open(this.src)' alt='{v_name} 生成的图像'>"
                    else:
                        return f"<span style='color:#ffb74d;'>[{v_name}] 未返回有效图片。</span>"
                except httpx.HTTPError:
                    if attempt < 2: await asyncio.sleep(2 ** attempt); continue
                    raise

        # ------------------- 路由分支 B：ComfyUI 异步渲染 -------------------
        elif deliver_type == "html" or v_name.lower().startswith("comfy"):
            comfy_url = api_url.rstrip('/')
            if not image_urls: return "<span style='color:#ffb74d;'>[ComfyUI] 错误：缺少参考图。</span>"
            
            input_img_local_path = os.path.join(STORAGE_DIR, image_urls[-1].replace("/storage/", ""))
            if not os.path.exists(input_img_local_path): return "<span style='color:#ff6b6b;'>[ComfyUI] 本地参考图丢失。</span>"
            
            loop = asyncio.get_running_loop()
            future = loop.create_future()
            
            task_data = {
                "api_url": comfy_url, "input_img_local_path": input_img_local_path,
                "chat_id": chat_id, "future": future,
                "meta_data": {"type": "vr_panorama", "step_title": step_title, "instruction": instruction, "user_input": user_input, "domain_id": domain_id, "category": "全景渲染_Panoramas"}
            }
            
            q = engines.comfy_worker.get_queue()
            await q.put(task_data)
            await push_to_radar("INFO", f"⚙️ [ComfyUI] 任务已投递至渲染队列。")
            return await future

        # ------------------- 路由分支 C：核心文本推演 (Stargate vs HTTP API) -------------------
        else:
            session_state = await get_session_state(chat_id)
            is_stargate = api_url.startswith("docker://")
            
            if is_stargate:
                # ==========================================================
                # 🌌 【星门 Docker 物理穿透执行流】
                # ==========================================================
                node_system_prompt = assemble_ultimate_prompt(custom_prompt.strip() if custom_prompt else "", vendor, injected_dna, override_base)
                container_name = api_url.replace("docker://", "")
                
                # 🛡️ V16.1 星门全域资产隔离舱硬拷贝协议 (将物理文件送入容器)
                cli_asset_paths = []
                if original_file_urls: 
                    chat_id_str = str(chat_id)
                    isolated_dir = f"/app/workspace/chat_{chat_id_str}"
                    mkdir_cmd = ["docker", "exec", container_name, "mkdir", "-p", isolated_dir]
                    try:
                        subprocess.run(mkdir_cmd, check=True)
                    except Exception: pass

                    for img_url in original_file_urls:
                        rel_path = img_url.replace("/storage/", "")
                        local_file_in_3dvr = os.path.join(STORAGE_DIR, rel_path)
                        
                        if os.path.exists(local_file_in_3dvr):
                            file_name = os.path.basename(local_file_in_3dvr)
                            target_path_in_cli = f"{isolated_dir}/{file_name}"
                            
                            cp_cmd = ["docker", "cp", local_file_in_3dvr, f"{container_name}:{target_path_in_cli}"]
                            try:
                                subprocess.run(cp_cmd, check=True)
                                cli_asset_paths.append(target_path_in_cli)
                            except Exception: pass

                # 缝合发送给 CLI 的管道指令
                msg_parts = []
                if node_system_prompt: msg_parts.append(f"【专属行动纲领 (SOP)】:\n{node_system_prompt}")
                
                session_corrections = session_state.get("user_corrections", "") if session_state else ""
                if session_corrections: msg_parts.append(f"【最高物理法则 (必须遵守)】:\n{session_corrections}")
                
                if instruction: msg_parts.append(f"【总厂传达战略指令】:\n{instruction}")
                if user_input: msg_parts.append(f"【本轮输入参数/数据】:\n{user_input}")
                
                if cli_asset_paths: 
                    paths_str = " ".join(cli_asset_paths)
                    msg_parts.append(f"【物理资产引渡路径】: {paths_str}")
                
                if work_mode == "creation":
                    msg_parts.append("【物理资产引渡规约】：如果你在当前任务中，通过**实际执行代码**真实地将文件写入了沙盒内部的硬盘（如图片、视频、HTML程序），请务必在回答的最后，输出该标签告知总厂绝对路径：\n[[ASSET:/你/在/沙盒里的/绝对路径.ext]]\n⚠️ 警告：如果你仅仅是在对话框里输出了文本回答，**并没有真实存入硬盘，绝对不要输出此标签！** 否则总厂提取程序将会崩溃。")

                full_prompt = "\n\n".join(msg_parts)
                if deliver_type == "condition":
                    full_prompt += "\n\n(通讯协议要求：总厂正在等待你的路由判定，请务必输出合法的 JSON 格式：{\"decision\": \"...\", \"reason\": \"...\"})"
                
                target_container = os.getenv("TARGET_CLI_CONTAINER", container_name)
                
                # 💡 [修复] 读取全局法则，并强行通过 Docker 环境变量塞进沙盒内部！
                global_rules = {"max": 50, "stop": 99, "purge": 100} # 默认值
                try:
                    rule_file = os.path.join(CONFIG_DIR, "stargate_dna_rules.json")
                    if os.path.exists(rule_file):
                        with open(rule_file, "r", encoding="utf-8") as f:
                            rule_data = json.load(f)
                            w_mode = "dark_factory" if vendor.get("use_sandbox") else "stargate_os"
                            if w_mode in rule_data: global_rules = rule_data[w_mode]
                except: pass

                # 🚀 架构师核心重铸：通过 -e 强行覆写沙盒内 CLI 的物理红线参数！
                cmd = [
                    "docker", "exec", "-i",
                    "-e", f"DNA_FORCE_STOP={global_rules.get('stop', 15)}",
                    "-e", f"DNA_PURGE_LIMIT={global_rules.get('purge', 20)}",
                    target_container, "gemini", "prompt"
                ]
                
                try:
                    await push_to_radar("INFO", f"⚡ [物理管道接通] 强行挂载法则 Stop={global_rules.get('stop')} Purge={global_rules.get('purge')}")
                    start_time = time.time()
                    
                    # 💡 [V47.5 终极跃迁：万能机械臂 ReAct 物理自循环]
                    max_react_loops = 4 # 最大允许它在内部自主查网 4 次
                    current_loop = 0
                    raw_answer = ""
                    err_str = ""
                    
                    while current_loop < max_react_loops:
                        current_loop += 1
                        
                        process = await asyncio.create_subprocess_exec(
                            *cmd, 
                            stdin=asyncio.subprocess.PIPE, 
                            stdout=asyncio.subprocess.PIPE, 
                            stderr=asyncio.subprocess.PIPE
                        )
                        GLOBAL_PROCESSES[str(chat_id)] = process
                        
                        stdout, stderr = await process.communicate(input=full_prompt.encode('utf-8'))
                        
                        if str(chat_id) in GLOBAL_PROCESSES: del GLOBAL_PROCESSES[str(chat_id)]
                        
                        err_str = stderr.decode().strip()
                        raw_answer = stdout.decode().strip()
                        
                        # 🔍 嗅探 [OS_COMMAND] 万能机械臂指令
                        os_match = re.search(r'\[OS_COMMAND\](.*?)\[/OS_COMMAND\]', raw_answer, re.DOTALL | re.IGNORECASE)
                        if os_match and process.returncode == 0:
                            command_str = os_match.group(1).strip()
                            await push_to_radar("INFO", f"🦾 [机械臂召唤] 截获物理请求，正在接入互联网...")
                            try:
                                cmd_json = json.loads(command_str)
                                if cmd_json.get("type") == "HTTP_REQUEST":
                                    # 剥离系统代理，防止被 Clash 劫持
                                    async with httpx.AsyncClient(trust_env=False, follow_redirects=True) as http_c:
                                        resp = await http_c.request(
                                            method=cmd_json.get("method", "GET"),
                                            url=cmd_json.get("url"),
                                            headers=cmd_json.get("headers", {}),
                                            timeout=15.0
                                        )
                                        # 截断观测结果，防止超大网页把特工脑子塞爆 (只取前 4000 字符)
                                        obs = resp.text[:4000] 
                                        
                                        await push_to_radar("SUCCESS", f"🌐 [物理观测] 网页抓取成功 ({len(obs)} 字节)，重新推入沙盒...")
                                        # 🔥 核心闭环：将真实互联网数据拼接，开启下一轮轮回！
                                        full_prompt += f"\n\n{raw_answer}\n\n【OS_OBSERVATION (系统回传的物理观测结果)】:\n{obs}\n\n指令：请基于上述真实数据继续执行任务。如果数据已集齐，请输出最终成品。"
                                        continue 
                            except Exception as e:
                                await push_to_radar("WARNING", f"⚠️ [机械臂故障] 网络请求失败: {e}")
                                full_prompt += f"\n\n{raw_answer}\n\n【OS_OBSERVATION (执行报错)】:\n{str(e)}\n\n指令：请求外部数据失败，请修正你的 URL 或改变策略。"
                                continue
                                
                        # 如果没有召唤机械臂，或者报错了，或者循环达到上限，直接跳出把成品交出去
                        break

                    cost_time = round(time.time() - start_time, 2)
                    
                    # ==========================================================
                    # 💡 V16.5 总厂终极缝合：同步机械手 (全域资产拦截与强制通电)
                    # ==========================================================
                    
                    # 1. 🌐 拦截 <file path="...">：纯文本/网页强制落盘与信标注入
                    file_match_iter = list(re.finditer(r"<file\s+path=[\"'](/app/[^\"']+)[\"']>\s*(.*?)\s*</file>", raw_answer, re.DOTALL | re.IGNORECASE))
                    for match in file_match_iter:
                        file_path = match.group(1).strip()
                        file_body = match.group(2)
                        
                        tmp_txt_path = os.path.join(TEMP_DUIHUA_DIR, f"tmp_file_{uuid.uuid4().hex[:8]}.txt")
                        with open(tmp_txt_path, "w", encoding="utf-8") as f:
                            f.write(file_body)
                        
                        dir_name = os.path.dirname(file_path)
                        subprocess.run(["docker", "exec", container_name, "mkdir", "-p", dir_name])
                        subprocess.run(["docker", "cp", tmp_txt_path, f"{container_name}:{file_path}"])
                        try: os.remove(tmp_txt_path)
                        except: pass
                        
                        raw_answer += f"\n\n[[ASSET:{file_path}]]"
                        await push_to_radar("INFO", f"🦾 [总厂机械手] 成功捕获并落盘静态文件: {file_path}")
                        raw_answer = raw_answer.replace(match.group(0), f"\n[📄 文件 {file_path} 源码已被物理封印]\n")

                    # 2. 🗜️ 拦截 <forge_entity>：机床图纸强制压制与产物扫描
                    forge_match = re.search(r'<forge_entity>\s*(.*?)\s*</forge_entity>', raw_answer, re.DOTALL | re.IGNORECASE)
                    if forge_match:
                        script_code = forge_match.group(1)
                        await push_to_radar("INFO", f"🔧 [同步机械手] 截获锻造图纸，正在接通沙盒电源并强行压制执行...")
                        
                        tmp_script_name = f"forge_sync_{uuid.uuid4().hex[:8]}.py"
                        tmp_script_path = os.path.join(TEMP_DUIHUA_DIR, tmp_script_name)
                        with open(tmp_script_path, "w", encoding="utf-8") as f:
                            f.write(script_code)
                            
                        target_sandbox_path = f"/app/workspace/{tmp_script_name}"
                        subprocess.run(["docker", "cp", tmp_script_path, f"{container_name}:{target_sandbox_path}"], check=True)
                        
                        exec_res = subprocess.run(["docker", "exec", "-w", "/app/workspace", container_name, "python3", target_sandbox_path], capture_output=True, text=True)
                        
                        if exec_res.returncode == 0:
                            await push_to_radar("INFO", f"✅ [同步机械手] 机床轰鸣停止，物理锻造成功！")
                            # 暴力扫盘提取二进制资产
                            ls_res = subprocess.run(["docker", "exec", container_name, "find", "/app/workspace", "-type", "f"], capture_output=True, text=True)
                            if ls_res.returncode == 0:
                                files_in_container = ls_res.stdout.strip().split('\n')
                                for f_path in files_in_container:
                                    f_path = f_path.strip()
                                    if f_path and not ("temp_forge_" in f_path or "forge_sync_" in f_path or "dna_source.py" in f_path):
                                        raw_answer += f"\n\n[[ASSET:{f_path}]]"
                                        await push_to_radar("INFO", f"🚚 [总厂引渡] 探测到新生实体产物: {f_path}")
                        else:
                            await push_to_radar("ERROR", f"❌ [同步机械手] 锻造代码执行报错:\n{exec_res.stderr}")
                            raw_answer += f"\n\n> ⚠️ **锻造代码报错，请检查语法**:\n```text\n{exec_res.stderr}\n```"
                            
                        subprocess.run(["docker", "exec", container_name, "rm", "-f", target_sandbox_path])
                        try: os.remove(tmp_script_path)
                        except: pass
                        raw_answer = raw_answer.replace(forge_match.group(0), "\n[⚙️ 系统已物理拦截超长图纸源码]\n")
                    # ==========================================================

                    # 处理 Docker 返回结果
                    if process.returncode != 0 and not ("ERR_STREAM_PREMATURE_CLOSE" in err_str and raw_answer):
                        quota_match = re.search(r'reset after\s+([0-9hms]+)', err_str)
                        if quota_match or 'QUOTA_EXHAUSTED' in err_str:
                            wait_time = quota_match.group(1).replace('h', '小时').replace('m', '分钟').replace('s', '秒') if quota_match else "一段时间"
                            answer = f"<div style='color:#ff5f56; padding:14px; border:1px solid rgba(255,95,86,0.4); border-radius:12px; background:rgba(255,95,86,0.08); margin-top:10px; box-shadow:0 4px 12px rgba(255,95,86,0.1);'>⚠️ <b>[CLI 额度已爆]</b> 官方 API 配额耗尽，预计 <b>{wait_time}</b> 后恢复。请切换其他算力模型继续任务。</div>"
                            await push_to_radar("WARNING", f"⚠️ [CLI 额度已爆] 节点 {step_title} 算力耗尽，需等待 {wait_time}。")
                        else:
                            answer = f"【CLI 报错日志】:\n{err_str}"
                            await push_to_radar("ERROR", f"❌ [CLI 崩溃] (耗时 {cost_time}s): {err_str[:100]}...")
                    else:
                        await push_to_radar("CHAT", f"🤖 [{v_name} 回复] (耗时 {cost_time}s): {raw_answer[:80]}...")
                        answer = parse_and_inject_approval_card(raw_answer)

                        # 处理 [ASSET:xxx] 提取协议
                        asset_matches = re.finditer(r'\[\[ASSET:(.+?)\]\]', answer)
                        processed_assets = set() # 彻底粉碎双胞胎 BUG
                        for match in asset_matches:
                            sandbox_file_path = match.group(1).strip()
                            if sandbox_file_path in processed_assets: continue
                            processed_assets.add(sandbox_file_path)
                            
                            file_name = os.path.basename(sandbox_file_path)
                            chat_id_str = str(chat_id)
                            chat_folder = os.path.join(TEMP_DUIHUA_DIR if chat_id_str.startswith("temp_") else DUIHUA_DIR, chat_id_str)
                            os.makedirs(chat_folder, exist_ok=True)
                            
                            local_chat_file = os.path.join(chat_folder, file_name)
                            
                            # 💡 V16.4 物理防抖补丁：等待 4 秒，确保沙盒资产完全落盘
                            file_ready = False
                            for _wait_loop in range(4): 
                                check_cmd = ["docker", "exec", container_name, "ls", sandbox_file_path]
                                try:
                                    subprocess.run(check_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                                    file_ready = True
                                    break 
                                except subprocess.CalledProcessError:
                                    await asyncio.sleep(1.0) 
                            
                            if not file_ready:
                                warning_ui = f"\n> <span style='color:#ffb74d;'>⚠️ 资产未物理落盘：等候 4 秒后，沙盒内仍未生成实体文件 {file_name}。</span>\n"
                                answer = answer.replace(match.group(0), warning_ui)
                                await push_to_radar("WARNING", f"⚠️ [引渡延迟] 容器内未找到目标文件 {file_name}。")
                                continue
                            
                            # 正式引渡文件并打入系统画廊
                            safe_vname = v_name.replace(" ", "").lower()
                            unique_id = f"{int(time.time())}_{uuid.uuid4().hex[:4]}"
                            ext = os.path.splitext(file_name)[1] or ".txt"
                            ext_lower = ext.lower()
                            gallery_filename = f"asset_{safe_vname}_{unique_id}{ext}"
                            gallery_json_name = f"asset_{safe_vname}_{unique_id}.json"
                            
                            local_gallery_file = os.path.join(GALLERY_DIR, gallery_filename)
                            
                            cp_cmd = ["docker", "cp", f"{container_name}:{sandbox_file_path}", local_chat_file]
                            try:
                                subprocess.run(cp_cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                                import shutil
                                shutil.copy2(local_chat_file, local_gallery_file)
                                
                                meta_data = {
                                    "type": "cli_output",
                                    "category": "代码与日志_Code" if ext_lower in ['.html', '.py', '.json', '.js', '.txt'] else "多媒体资产_Media",
                                    "step_title": step_title,
                                    "user_input": user_input[:200],
                                    "domain_id": domain_id,
                                    "vendor": v_name,
                                    "timestamp": datetime.now().isoformat()
                                }
                                with open(os.path.join(GALLERY_DIR, gallery_json_name), "w", encoding="utf-8") as jf:
                                    json.dump(meta_data, jf, ensure_ascii=False, indent=2)
                                
                                relative_url = f"/storage/gallery/{gallery_filename}"
                                
                                # 渲染前端资产呈现卡片
                                if ext_lower in ['.docx', '.doc', '.xlsx', '.xls', '.csv', '.pdf', '.pptx', '.ppt']:
                                    preview_url = relative_url
                                    if ext_lower == '.docx':
                                        try:
                                            _, p_url = document_parser._parse_docx(local_chat_file)
                                            if p_url: preview_url = p_url
                                        except Exception: pass
                                            
                                    icon = "📄"
                                    if ext_lower in ['.xlsx', '.xls', '.csv']: icon = "📊"
                                    elif ext_lower in ['.pptx', '.ppt']: icon = "📽️"
                                    elif ext_lower == '.pdf': icon = "📕"
                                    elif 'doc' in ext_lower: icon = "📝"
                                    
                                    asset_ui = f"""
                                    <div class="doc-preview-card" style="background: rgba(168, 199, 250, 0.05); border: 1px solid rgba(168, 199, 250, 0.2); padding: 14px; border-radius: 12px; margin-top: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
                                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px;">
                                            <span style="font-size: 1.5rem;">{icon}</span>
                                            <span style="font-family: monospace; font-size: 0.95rem; color: #a8c7fa; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="{file_name}">{file_name}</span>
                                        </div>
                                        <div style="display: flex; gap: 10px;">
                                            <button onclick="window.openHtmlPreview('{preview_url}', '{file_name}')" style="flex: 1; background: linear-gradient(135deg, #a8c7fa 0%, #d8b4fe 100%); color: #111; border: none; padding: 8px; border-radius: 8px; font-size: 0.85rem; cursor: pointer; font-weight: bold; box-shadow: 0 2px 8px rgba(168,199,250,0.3);">✨ 唤醒全息预览</button>
                                            <button onclick="window.forceDownloadAsset('{relative_url}', '{file_name}', this)" style="flex: 1; background: linear-gradient(135deg, #81c784 0%, #4caf50 100%); color: #111; border: none; padding: 8px; border-radius: 8px; font-size: 0.85rem; cursor: pointer; font-weight: bold; box-shadow: 0 2px 8px rgba(76,175,80,0.3);">📥 提取本地下载</button>
                                        </div>
                                    </div>"""
                                elif ext_lower in ['.png', '.jpg', '.jpeg', '.gif', '.webp']:
                                    asset_ui = f"![{file_name}]({relative_url})"
                                elif ext_lower in ['.mp4', '.webm', '.mov']:
                                    asset_ui = f"![VIDEO:{file_name}]({relative_url})"
                                elif ext_lower in ['.mp3', '.wav', '.ogg']:
                                    asset_ui = f"![AUDIO:{file_name}]({relative_url})"
                                else:
                                    asset_ui = f"[{file_name}]({relative_url})"
                                    
                                answer = answer.replace(match.group(0), asset_ui)
                                await push_to_radar("INFO", f"📦 [引渡成功] 资产 {file_name} 已落盘。")
                            except subprocess.CalledProcessError as e:
                                # 💡 [V16.3 强行发牌] 无论文件是否就绪，强制渲染下载链接供厂长重试！
                                fallback_url = f"/storage/temp_duihua/{chat_id_str}/{file_name}" if chat_id_str.startswith("temp_") else f"/storage/duihua/{chat_id_str}/{file_name}"
                                
                                if ext_lower in ['.docx', '.doc', '.xlsx', '.xls', '.csv', '.pdf', '.pptx', '.ppt']:
                                    preview_url = fallback_url + ".preview.html" if ext_lower == '.docx' else fallback_url
                                    
                                    icon = "📄"
                                    if ext_lower in ['.xlsx', '.xls', '.csv']: icon = "📊"
                                    elif ext_lower in ['.pptx', '.ppt']: icon = "📽️"
                                    elif ext_lower == '.pdf': icon = "📕"
                                    elif 'doc' in ext_lower: icon = "📝"
                                    
                                    asset_ui = f"""
                                    <div class="doc-preview-card" style="background: rgba(255, 183, 77, 0.05); border: 1px dashed #ffb74d; padding: 14px; border-radius: 12px; margin-top: 10px; opacity: 0.8;">
                                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px;">
                                            <span style="font-size: 1.5rem;">{icon}</span>
                                            <span style="font-family: monospace; font-size: 0.95rem; color: #ffb74d; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="仍在异步落盘中">{file_name} (异步成型中...)</span>
                                        </div>
                                        <div style="display: flex; gap: 10px;">
                                            <button onclick="window.openHtmlPreview('{preview_url}', '{file_name}')" style="flex: 1; background: transparent; color: #a8c7fa; border: 1px solid #a8c7fa; padding: 8px; border-radius: 8px; font-size: 0.85rem; cursor: pointer; font-weight: bold;">✨ 尝试预览</button>
                                            <button onclick="window.forceDownloadAsset('{fallback_url}', '{file_name}', this)" style="flex: 1; background: transparent; color: #81c784; border: 1px solid #81c784; padding: 8px; border-radius: 8px; font-size: 0.85rem; cursor: pointer; font-weight: bold;">📥 尝试下载</button>
                                        </div>
                                    </div>"""
                                elif ext_lower in ['.png', '.jpg', '.jpeg', '.gif', '.webp']:
                                    asset_ui = f"![{file_name}]({fallback_url})"
                                elif ext_lower in ['.mp4', '.webm', '.mov']:
                                    asset_ui = f"![VIDEO:{file_name}]({fallback_url})"
                                elif ext_lower in ['.mp3', '.wav', '.ogg']:
                                    asset_ui = f"![AUDIO:{file_name}]({fallback_url})"
                                else:
                                    asset_ui = f"[{file_name}]({fallback_url})"
                                
                                warning_ui = f"\n{asset_ui}\n> <span style='color:#ffb74d; font-size:0.8rem;'>⚠️ <b>资产仍在缓冲落盘中</b>，您可以稍后点击按钮重试。</span>\n"
                                answer = answer.replace(match.group(0), warning_ui)
                                await push_to_radar("WARNING", f"⚠️ [引渡延迟] 未找到 {file_name}，已强行生成占位链接。")

                except Exception as e:
                    GLOBAL_STATS.security_blocks += 1
                    # 💡 Ouroboros 物理逃逸信号，触发前端自检舱
                    error_signal = {
                        "node_id": step_title,
                        "machine_id": container_name,
                        "session_id": chat_id,
                        "message": f"物理机床发生逃逸或断电: {str(e)}"
                    }
                    return f"Ouroboros::{json.dumps(error_signal, ensure_ascii=False)}"
                
                # 星门执行流扫尾：截取记录记忆，返回对应产物
                memory_key = f"节点产出_{step_title}"
                await update_session_state(chat_id, {memory_key: answer[:1500] + "...(被截断)" if len(answer)>1500 else answer})
                
                if step_title in ["管家交流", "自由交流", "意图判定", "管家内部隐式架构", "AI 一键编排流"]:
                    return answer
                if deliver_type == "sandbox_terminal": return f"【CLI 终端执行报告】:\n{answer}"
                if deliver_type == "agent_async_task": return f"<div style='background:rgba(168, 199, 250, 0.05); border:1px solid rgba(168,199,250,0.3); border-radius:12px; padding:12px; font-size:0.85rem; line-height:1.6; color:#e3e3e3; margin-top:8px;'><b style='background:-webkit-linear-gradient(0deg, #a8c7fa, #d8b4fe); -webkit-background-clip:text; -webkit-text-fill-color:transparent;'>✨ 任务传回捷报：</b><br><div style='margin-top:8px;'>{answer}</div></div>"
                
                return f"<div style='color:var(--text-main); font-size:0.85rem; line-height:1.6;'>{answer}</div>"

            # ==========================================================
            # 🌐 【常规 HTTP API 远端调用流】
            # ==========================================================
            else:
                # 提取记忆折叠
                MAX_MEMORY_KEYS = 5 
                if session_state and len(session_state) > MAX_MEMORY_KEYS:
                    trimmed_state = dict(list(session_state.items())[-MAX_MEMORY_KEYS:])
                    memory_str = json.dumps(trimmed_state, ensure_ascii=False)
                    memory_str = f"...(已折叠早期节点记忆)...\n" + memory_str
                else:
                    memory_str = json.dumps(session_state, ensure_ascii=False) if session_state else "暂无"

                if len(memory_str) > 2500:
                    memory_str = "...(前文已被物理截断以保护算力)...\n" + memory_str[-2500:]

                if injected_dna is None: injected_dna = []
                else: injected_dna = list(injected_dna) 
                    
                dynamic_vars = {}
                temperature = tuning.get("temperature", 0.8)
                use_tools = False

                # 动态变量池：装填来自 0.html 的用户特判、QA监工的斥责等
                session_corrections = session_state.get("user_corrections", "")
                if session_corrections:
                    dynamic_vars["SYS_USER_CORRECTIONS"] = session_corrections
                    if "SYS_RULE_USER_CORRECTION" not in injected_dna:
                        injected_dna.append("SYS_RULE_USER_CORRECTION")

                qa_critique = session_state.get(f"qa_critique_for_{node_id}", "")
                if qa_critique:
                    dynamic_vars["SYS_QA_CRITIQUE"] = qa_critique
                    if "SYS_RULE_FIX_ERRORS" not in injected_dna:
                        injected_dna.append("SYS_RULE_FIX_ERRORS")

                if "[全息预览组件" in user_input and "SYS_RULE_DOC_PREVIEW" not in injected_dna:
                    injected_dna.append("SYS_RULE_DOC_PREVIEW")

                if ("[SOP 军师大纲" in user_input or "[SOP 军师大纲" in instruction) and "SYS_RULE_RAG_STRICT" not in injected_dna:
                    injected_dna.append("SYS_RULE_RAG_STRICT")

                # 解析动态工作模式与交货类型
                if is_dispatcher and work_mode == "recognition":
                    temperature = 0.2
                    vendor_list_str = "\n".join([f"- ID: {v['id']}, Name: {v['name']}, 备注: {v.get('remark', '通用')}" for v in all_vendors])
                    dynamic_vars["SYS_AVAILABLE_MODELS"] = vendor_list_str
                    if "SYS_SOP_DISPATCHER" not in injected_dna: injected_dna.append("SYS_SOP_DISPATCHER")
                
                elif step_title == "AI 一键编排流" or "编排" in instruction or "工作流" in instruction:
                    vendor_list_str = "\n".join([f"- ID: {v['id']}, Name: {v['name']}" for v in all_vendors])
                    dynamic_vars["SYS_AVAILABLE_MODELS"] = vendor_list_str
                    if "SYS_SOP_WORKFLOW_GEN" not in injected_dna: injected_dna.append("SYS_SOP_WORKFLOW_GEN")

                if deliver_type in ["sandbox_terminal", "agent_async_task", "agent_tools", "agent_hotspots"]:
                    use_tools = True
                    if deliver_type == "agent_async_task":
                        instruction += f"\n\n[SYSTEM OVERRIDE]: 本节点为耗时任务。必须调用 `create_async_task_order` 工具生成星门任务单，目标域为 `{domain_id}`。"
                    elif deliver_type == "sandbox_terminal":
                        temperature = 0.1
                        instruction += "\n\n[SYSTEM OVERRIDE]: 必须调用 `execute_sandbox_command` 工具执行命令。"
                    elif deliver_type == "agent_hotspots":
                        instruction += "\n\n[SYSTEM OVERRIDE]: 必须调用 `generate_vr_hotspots` 工具为 VR 场景生成交互热点。"

                if deliver_type == "condition":
                    temperature = 0.1
                    if "SYS_RULE_CONDITION" not in injected_dna: injected_dna.append("SYS_RULE_CONDITION")
                        
                elif deliver_type == "qa_overseer":
                    temperature = 0.1
                    if "SYS_RULE_OVERSEER" not in injected_dna: injected_dna.append("SYS_RULE_OVERSEER")

                # 🧠 终极装配：注入指令图谱
                system_prompt = assemble_ultimate_prompt(
                    custom_prompt.strip() if custom_prompt else "", 
                    vendor, injected_dna, override_base, instruction, dynamic_vars
                )

                few_shot_context = engines.vector_db.get_few_shot_prompt_from_vectordb(user_input, limit=tuning["rag_limit"], domain_id=domain_id) if hasattr(engines.vector_db, "get_few_shot_prompt_from_vectordb") else ""
                if few_shot_context: system_prompt += f"\n\n{few_shot_context}"
                    
                system_prompt += f"\n\n---【记忆】---\n{memory_str}"

                # 提取图片并转 Base64 塞入上下文
                user_content_array = [{"type": "text", "text": f"当前指令/状态：\n{user_input}"}]
                has_image = False
                if image_urls:
                    for local_url in image_urls:
                        base64_data = get_base64_from_local_url(local_url)
                        if base64_data:
                            has_image = True
                            user_content_array.append({"type": "image_url", "image_url": {"url": base64_data}})
                
                final_user_content = user_content_array
                conversation_messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": final_user_content}]
                endpoint = api_url if api_url.endswith("/completions") else f"{api_url.rstrip('/')}/chat/completions"
                
                start_time = time.time()
                for attempt in range(5): 
                    payload = {
                        "model": target_model_id, 
                        "messages": conversation_messages, 
                        "max_tokens": vendor.get("max_tokens") or tuning.get("max_tokens", 2048),
                        "temperature": vendor.get("temperature") if vendor.get("temperature") is not None else temperature,
                        "top_p": vendor.get("top_p") if vendor.get("top_p") is not None else tuning.get("top_p", 1.0),
                        "presence_penalty": vendor.get("presence_penalty") if vendor.get("presence_penalty") is not None else tuning.get("presence_penalty", 0.0)
                    }
                    
                    if use_tools and AVAILABLE_TOOLS and not has_image and not is_agentic:
                        if deliver_type in ["agent_async_task", "agent_tools"]: 
                            payload["tools"] = AVAILABLE_TOOLS
                            payload["tool_choice"] = "auto"
                    
                    try:
                        response = await client.post(endpoint, headers=headers, json=payload, timeout=60.0)
                        response.raise_for_status()
                    except httpx.HTTPError as he:
                        if attempt < 4: 
                            await push_to_radar("WARNING", f"⚠️ [网络] {v_name} 连接波动，进行第 {attempt+1} 次退避重试...")
                            await asyncio.sleep(2 ** attempt)
                            continue
                        raise he

                    data = response.json()
                    assistant_message = data['choices'][0]['message']
                    
                    # 🛠️ 拦截并处理 Tool Calls
                    if assistant_message.get("tool_calls") and not is_agentic:
                        conversation_messages.append(assistant_message)
                        for tool_call in assistant_message["tool_calls"]:
                            tool_name = tool_call["function"]["name"]
                            tool_args_str = tool_call["function"]["arguments"]
                            await push_to_radar("INFO", f"🛠️ [Tool Call] {v_name} 正在调用挂载工具: {tool_name}")
                            try:
                                result = await skills.execute_tool(tool_name, json.loads(tool_args_str), domain_id)
                            except Exception as e:
                                result = f"Error: {str(e)}"
                            conversation_messages.append({"role": "tool", "tool_call_id": tool_call["id"], "name": tool_name, "content": str(result)})
                        continue
                    
                    # 正常回复提取
                    answer = assistant_message.get('content', '')
                    cost_time = round(time.time() - start_time, 2)
                    await push_to_radar("CHAT", f"🤖 [{v_name} 回复] (耗时 {cost_time}s): {answer[:80]}...")
                    answer = parse_and_inject_approval_card(answer)
                    
                    memory_key = f"节点产出_{step_title}"
                    await update_session_state(chat_id, {memory_key: answer[:1500] + "...(被截断)" if len(answer)>1500 else answer})
                    
                    # 动态覆写后续节点指派UI注入
                    if is_dispatcher and work_mode == "recognition" and "```json" in answer:
                        try:
                            dispatch_match = re.search(r'```json\s*(\{.*?"target_ai".*?\})\s*```', answer, re.DOTALL)
                            if dispatch_match:
                                dispatch_data = dispatch_match.group(1)
                                dispatch_html = f"<div class='dynamic-dispatch-data' style='display:none;'>{dispatch_data}</div>"
                                dispatch_ui = f"<div style='background:rgba(216, 180, 254, 0.05); border:1px solid rgba(216,180,254,0.3); padding:12px; border-radius:12px; font-size:0.8rem; color:#d8b4fe; margin-top:10px; box-shadow:0 2px 10px rgba(216,180,254,0.1);'><div style='font-size:1rem; background:-webkit-linear-gradient(0deg, #a8c7fa, #d8b4fe); -webkit-background-clip:text; -webkit-text-fill-color:transparent; font-weight:bold; margin-bottom:6px;'>✨ 架构师调度决策：</div><span style='color:#ccc;'>基于当前分析，管家已临时调整下一环的指派对象。</span></div>"
                                answer = answer.replace(dispatch_match.group(0), dispatch_ui + dispatch_html)
                                await push_to_radar("INFO", f"🔀 [路由] 架构师介入，已动态覆写后续节点指派。")
                        except Exception: pass

                    if step_title in ["管家交流", "自由交流", "意图判定", "管家内部隐式架构", "AI 一键编排流"]:
                        return answer

                    if deliver_type == "condition": return answer 
                    if deliver_type == "html": return f"<pre style='background:#111; padding:10px; border-radius:6px; overflow-x:auto; font-size:0.75rem; border:1px solid #444;'>{answer}</pre>"
                    return f"<div style='color:var(--text-main); font-size:0.85rem; line-height:1.6;'>{answer}</div>"
                
                GLOBAL_STATS.security_blocks += 1
                await push_to_radar("ERROR", f"❌ [死循环] {v_name} 工具调用陷入死循环被主脑强制熔断。")
                return f"<span style='color:#ffb74d;'>[{v_name}] 警告：工具调用陷入死循环。</span>"
            
    except Exception as e:
        GLOBAL_STATS.security_blocks += 1
        v_name = vendor.get('name', 'Unknown')
        await push_to_radar("ERROR", f"🔥 [主脑阻断] 调度 {v_name} 发生严重崩溃: {str(e)}")
        
        # 💡 Ouroboros 逻辑熔断信号
        error_signal = {
            "node_id": step_title,
            "machine_id": v_name,
            "session_id": chat_id,
            "message": f"算力节点逻辑死锁或拒绝服务: {str(e)}"
        }
        return f"Ouroboros::{json.dumps(error_signal, ensure_ascii=False)}"

# =============== 待续：下接 DAG 异步工作流与星门会议大厅 ===============
# =====================================================================
# [区块 8] DAG 异步工作流引擎 (Async Workflow & Time Reversal Protocol)
# =====================================================================
async def async_workflow_runner(chat_id: str, workflow_id: str, start_nodes: list, user_input: str, image_urls: list):
    """
    🚀 [全域巡航引擎]：解析 JSON 图纸，进行 DAG 拓扑排序与并发执行。
    包含时空回溯 (QA驳回)、衔尾蛇循环 (Loop Trigger) 与防算力烧毁机制。
    """
    print(f"🚀 [巡航引擎启动] ChatID: {chat_id} | Workflow: {workflow_id} | 起点: {start_nodes}")
    try:
        with open(WORKFLOW_FILE, "r", encoding="utf-8") as f:
            all_wfs = json.load(f)
        wf_data = all_wfs.get(workflow_id)
        if not wf_data:
            return
    except Exception: return

    nodes = wf_data.get("data", {}).get("nodes", [])
    edges = wf_data.get("data", {}).get("edges", [])
    
    completed_nodes = []
    pending_nodes = list(start_nodes)
    retry_counters = {} # 💡 记录节点重试次数的熔断器
    
    current_context = user_input 
    current_images = list(image_urls)

    chat_file = get_chat_file_path(chat_id)
    
    async def _append_message_to_db(role, text):
        if not chat_file: return
        async with get_chat_lock(chat_id):
            with open(chat_file, "r", encoding="utf-8") as f:
                cdata = json.load(f)
            cdata.setdefault("messages", []).append({"role": role, "text": text, "timestamp": datetime.now().isoformat()})
            with open(chat_file, "w", encoding="utf-8") as f:
                json.dump(cdata, f, ensure_ascii=False, indent=2)

    while pending_nodes:
        nodes_to_execute = [n for n in nodes if n["id"] in pending_nodes]
        if not nodes_to_execute: break
        
        tasks = []
        for n_obj in nodes_to_execute:
            delay = int(n_obj.get("delay_seconds", 0))
            is_dispatcher = bool(n_obj.get("is_dispatcher", False))
            
            # 人工审批断点
            if n_obj.get("requiresReview") or n_obj.get("deliverType") == "condition":
                async with get_chat_lock(chat_id):
                    with open(chat_file, "r", encoding="utf-8") as f:
                        cdata = json.load(f)
                    cdata["attached_workflow"] = workflow_id
                    cdata["completed_nodes"] = completed_nodes
                    cdata["pending_nodes"] = pending_nodes
                    cdata["system_status"] = "WAITING_USER" 
                    with open(chat_file, "w", encoding="utf-8") as f:
                        json.dump(cdata, f, ensure_ascii=False, indent=2)
                return 

            node_req = {
                "node_id": n_obj["id"],
                "chat_id": chat_id,
                "step_title": n_obj["title"],
                "instruction": n_obj.get("instruction", ""),
                "user_input": current_context if n_obj.get("inputType") == "context_memory" else user_input,
                "vendors": n_obj.get("selectedAIs", []),
                "deliver_type": n_obj.get("deliverType", "text_comm"),
                "images": current_images if n_obj.get("inputType") == "image_upload" else [],
                "domain_id": wf_data.get("domain_id", "factory_dev"),
                "work_mode": n_obj.get("workMode", "creation"),
                "is_dispatcher": is_dispatcher,
                "delay_seconds": delay,
                "custom_prompt": n_obj.get("custom_prompt", ""), 
                "injected_dna": n_obj.get("injected_dna", []),
                "override_base": bool(n_obj.get("override_base", False))
            }
            tasks.append(execute_workflow_task(node_req))
            
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        newly_completed = []
        rejection_happened = False
        target_rejections = []

        for i, res in enumerate(results):
            n_obj = nodes_to_execute[i]
            res_text = str(res) if isinstance(res, Exception) else str(res)
            
            # 💡 拦截 QA 监工的逆向驳回信号 (Time Reversal Protocol)
            if res_text.startswith("__QA_REJECT__::"):
                parts = res_text.split("::", 3)
                target_node = parts[1]
                critique = parts[2]
                html_ui = parts[3] if len(parts) > 3 else "质检驳回"
                
                await _append_message_to_db("ai", html_ui)
                
                # 累加熔断器，防止死循环烧光算力
                retry_counters[target_node] = retry_counters.get(target_node, 0) + 1
                if retry_counters[target_node] > 3:
                    await _append_message_to_db("ai", f"❌ <b>【质检熔断】</b>：节点 <span style='color:#ff6b6b;'>{target_node}</span> 已连续重试 3 次均未能满足监工标准，陷入逻辑死锁。为保护算力，流水线已被物理强停。")
                    async with get_chat_lock(chat_id):
                        with open(chat_file, "r", encoding="utf-8") as f: cdata = json.load(f)
                        cdata["attached_workflow"] = None
                        cdata["completed_nodes"] = []
                        cdata["pending_nodes"] = []
                        cdata["system_status"] = "IDLE"
                        with open(chat_file, "w", encoding="utf-8") as f: json.dump(cdata, f, ensure_ascii=False, indent=2)
                    return # 强行终止巡航
                
                # 将监工的痛骂写入物理记忆，供下一轮注入
                await update_session_state(chat_id, {f"qa_critique_for_{target_node}": critique})
                
                rejection_happened = True
                target_rejections.append(target_node)
                
                # 核心精妙点：把监工节点自己从运行序列中彻底休眠！
                if n_obj["id"] in pending_nodes:
                    pending_nodes.remove(n_obj["id"])
                continue
                
            await _append_message_to_db("ai", res_text)
            current_context = re.sub(r'<[^>]*>?', '', res_text) 
            newly_completed.append(n_obj["id"])
            
        completed_nodes.extend(newly_completed)
        pending_nodes = [pid for pid in pending_nodes if pid not in newly_completed]

        # 💡 时空回溯执行器：把不合格的节点从完工区拽出来，踢回待料区！
        if rejection_happened:
            for t_node in target_rejections:
                if t_node in completed_nodes:
                    completed_nodes.remove(t_node)
                if t_node not in pending_nodes:
                    pending_nodes.insert(0, t_node)
        
        next_nodes = []
        for n_id in newly_completed:
            connected_edges = [e for e in edges if e["source"] == n_id]
            for e in connected_edges:
                next_nodes.append(e["target"])
                
        for target_id in next_nodes:
            incoming_edges = [e for e in edges if e["target"] == target_id]
            all_met = all(e["source"] in completed_nodes for e in incoming_edges)
            if all_met and target_id not in completed_nodes and target_id not in pending_nodes:
                pending_nodes.append(target_id)
                
        async with get_chat_lock(chat_id):
            with open(chat_file, "r", encoding="utf-8") as f:
                cdata = json.load(f)
            cdata["completed_nodes"] = completed_nodes
            cdata["pending_nodes"] = pending_nodes
            cdata["system_status"] = "RUNNING" 
            with open(chat_file, "w", encoding="utf-8") as f:
                json.dump(cdata, f, ensure_ascii=False, indent=2)

    last_node_id = completed_nodes[-1] if completed_nodes else None
    last_node_obj = next((n for n in nodes if n["id"] == last_node_id), None)
    
    if last_node_obj and last_node_obj.get("is_loop_trigger"):
        await _append_message_to_db("ai", "♻️ <b>本轮后台流水线交付完毕！</b><br><span style='font-size:0.85rem; color:#aaa;'>厂长，已触发衔尾蛇循环，管家已携带最新成果回到起点待命！</span>")
        
        all_targets = {e["target"] for e in edges}
        starting_nodes = [n["id"] for n in nodes if n["id"] not in all_targets]
        
        async with get_chat_lock(chat_id):
            with open(chat_file, "r", encoding="utf-8") as f:
                cdata = json.load(f)
            cdata["completed_nodes"] = []
            cdata["pending_nodes"] = starting_nodes
            cdata["system_status"] = "STANDBY"
            with open(chat_file, "w", encoding="utf-8") as f:
                json.dump(cdata, f, ensure_ascii=False, indent=2)
    else:
        await _append_message_to_db("ai", "🏁 <b>本轮全域流水线交付完毕！</b><br><span style='font-size:0.85rem; color:#aaa;'>所有既定节点均已在后台走完，管家已解除挂载。</span>")
        async with get_chat_lock(chat_id):
            with open(chat_file, "r", encoding="utf-8") as f:
                cdata = json.load(f)
            cdata["attached_workflow"] = None
            cdata["completed_nodes"] = []
            cdata["pending_nodes"] = []
            cdata["system_status"] = "IDLE"
            with open(chat_file, "w", encoding="utf-8") as f:
                json.dump(cdata, f, ensure_ascii=False, indent=2)


async def execute_workflow_task(req_data: dict):
    """
    负责调用单个或多个并行的 AI 算力，处理结果组装与 Ouroboros 自检拦截。
    """
    vendors_config = load_ai_vendors()
    selected_vendor_ids = req_data.get("vendors", [])
    instruction = req_data.get("instruction", "")
    user_input = req_data.get("user_input", "")
    deliver_type = req_data.get("deliver_type", "text_comm")
    chat_id = req_data.get("chat_id", "")
    image_urls = req_data.get("images", [])
    step_title = req_data.get("step_title", "未知协同节点")
    domain_id = req_data.get("domain_id", "factory_dev")
    work_mode = req_data.get("work_mode", "creation")
    is_dispatcher = bool(req_data.get("is_dispatcher", False))
    custom_prompt = req_data.get("custom_prompt", "") 
    injected_dna = req_data.get("injected_dna", []) 
    override_base = bool(req_data.get("override_base", False)) 
    
    delay_seconds = int(req_data.get("delay_seconds", 0))
    if delay_seconds > 0:
        await asyncio.sleep(delay_seconds)

    if not selected_vendor_ids:
        tuning = load_tuning_config()
        fallback_id = tuning.get("pro_model_id") or tuning.get("primary_model_id")
        if fallback_id:
            selected_vendor_ids = [fallback_id]
    
    if not selected_vendor_ids: return "<div style='color:#ffb74d;'>⚠️ 未挂载大脑，且未设置全局领航员。</div>"

    tasks, task_names = [], []
    for v_id in selected_vendor_ids:
        vendor = next((v for v in vendors_config if v.get("id") == v_id), None)
        if vendor:
            # ✅ 追加传递 node_id，以供系统精准检索它的专属耻辱柱日志
            tasks.append(call_single_ai(vendor, instruction, user_input, deliver_type, chat_id, image_urls, step_title, domain_id, work_mode, is_dispatcher, custom_prompt, injected_dna, override_base, req_data.get("node_id", "")))
            # [执行官抢修]：必须将脑核名称推入数组！否则后续 HTML 渲染取 task_names[i] 必报错！
            task_names.append(vendor.get("name", "AI节点"))
        else:
            tasks.append(asyncio.sleep(0.01)); task_names.append("失效")

    results = await asyncio.gather(*tasks, return_exceptions=True)

    # 🚨 Ouroboros 拦截协议：扫描结果中是否发生了物理阻断或执行崩溃
    for i, res in enumerate(results):
        res_str = str(res)
        if isinstance(res, Exception) or "【系统物理阻断】" in res_str or "❌ [CLI 崩溃]" in res_str or "[CLI 报错日志]" in res_str:
            error_payload = {
                "status": "error",
                "error_type": "EXECUTION_ESCAPE",
                "node_id": req_data.get("node_id", "unknown_node"), 
                "machine_id": selected_vendor_ids[i] if selected_vendor_ids else "unknown",
                "session_id": chat_id,
                "message": f"节点发生严重逃逸或崩溃：{res_str}"
            }
            return f"Ouroboros::{json.dumps(error_payload)}"

    if step_title in ["管家交流", "自由交流", "意图判定", "管家内部隐式架构", "AI 一键编排流"]:
        for res in results:
            if not isinstance(res, Exception) and res:
                return res
        return "管家无响应。"

    # 产物 UI 封装模块
    if deliver_type == "image":
        final_output = ["<div class='ai-schemes-container' style='display: grid; gap: 12px; margin-top: 12px;'>"]
        for i, res in enumerate(results):
            res_content = f"<span style='color:#ff6b6b;'>{str(res)}</span>" if isinstance(res, Exception) else (res or "空")
            final_output.append(f"""
            <div class='ai-scheme-card' style='background:rgba(168, 199, 250, 0.03); padding:16px; border:1px solid rgba(168,199,250,0.2); border-radius:12px; box-shadow: 0 4px 15px rgba(0,0,0,0.15);'>
                <div style='text-align:center; font-weight:bold; background: -webkit-linear-gradient(0deg, #a8c7fa, #d8b4fe); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size:1.1rem; margin-bottom:12px;'>✨ {task_names[i]} 视觉锻造</div>
                <div class='scheme-payload' style='border-radius:8px; overflow:hidden;'>{res_content}</div>
                <button class='confirm-flow-btn' onclick='selectWinner(this, \"image\")' style='margin-top:14px; width:100%; background:linear-gradient(135deg, #a8c7fa 0%, #d8b4fe 100%); border:none; color:#111; padding:10px; border-radius:8px; cursor:pointer; font-weight:bold; font-size:0.9rem; box-shadow: 0 4px 10px rgba(168,199,250,0.2); transition:0.2s;'>✨ 确认采纳此方案</button>
            </div>
            """)
        final_output.append("</div>")
        
    elif deliver_type == "qa_overseer":
        # 💡 铁血监工的终极审查判决
        for i, res in enumerate(results):
            if isinstance(res, Exception): return f"监工宕机: {res}"
            try:
                res_obj = json.loads(res.replace("```json", "").replace("```", "").strip())
                status = res_obj.get("status", "PASS")
                target = res_obj.get("target_node", "")
                reason = res_obj.get("critique", "") if status == "REJECT" else res_obj.get("reason", res)
            except:
                status, target, reason = "PASS", "", res # 解析失败默认放行，防卡死

            if status == "REJECT":
                ui = f"<div style='background:rgba(255,107,107,0.08); border:1px solid rgba(255,107,107,0.5); padding:16px; border-radius:12px; color:#ff6b6b; box-shadow:0 4px 15px rgba(255,107,107,0.1);'><h3 style='margin-top:0; font-size:1.1rem; display:flex; align-items:center; gap:8px;'>🔴 质检驳回：打回重造 [{target}]</h3><div style='font-size:0.85rem; line-height:1.6; color:#e3e3e3; background:rgba(0,0,0,0.3); padding:10px; border-radius:8px;'><b>监工批判通告：</b><br>{reason}</div></div>"
                # 发射逆向回溯信号给底层核心引擎
                return f"__QA_REJECT__::{target}::{reason}::{ui}"
            else:
                ui = f"<div style='background:rgba(76,175,80,0.08); border:1px solid rgba(76,175,80,0.5); padding:16px; border-radius:12px; color:#4caf50;'><h3 style='margin-top:0; font-size:1.1rem; display:flex; align-items:center; gap:8px;'>🟢 监工放行通过</h3><div style='font-size:0.85rem; color:#e3e3e3;'>{reason}</div></div>"
                return ui

    elif deliver_type == "condition":
        final_output = ["<div class='ai-schemes-container' style='display: flex; flex-direction: column; gap: 12px; margin-top: 12px;'>"]
        for i, res in enumerate(results):
            decision_text, reason_text = "判断异常", "解析失败"
            if not isinstance(res, Exception):
                try:
                    res_obj = json.loads(res.replace("```json", "").replace("```", "").strip())
                    decision_text, reason_text = res_obj.get("decision", "未知"), res_obj.get("reason", res)
                except: reason_text = res
            final_output.append(f"""
            <div class='ai-scheme-card' style='background:rgba(255, 183, 77, 0.05); padding:16px; border:1px solid rgba(255,183,77,0.3); border-radius:12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);'>
                <div style='display:flex; justify-content:space-between; border-bottom:1px dashed rgba(255,183,77,0.3); padding-bottom:12px; margin-bottom:12px; align-items:center;'>
                    <b style='color:#ffb74d; font-size:1.05rem;'>⚡ {task_names[i]} 路由决策</b>
                    <button class='confirm-flow-btn' onclick='selectWinner(this, \"condition\")' style='background:linear-gradient(135deg, #ffcc80 0%, #ffb74d 100%); border:none; color:#111; padding:6px 14px; border-radius:8px; cursor:pointer; font-weight:bold; font-size:0.8rem; box-shadow: 0 2px 8px rgba(255,183,77,0.3);'>⚡ 确认开启此分支</button>
                </div>
                <div class='scheme-payload'>
                    <div style='font-size:1.05rem; color:#fff; font-weight:bold; margin-bottom:6px;'>👉 指派下一节点：<span style="color:#ffb74d;">{decision_text}</span></div>
                    <div style='font-size:0.85rem; color:#aaa; line-height:1.5; background:rgba(0,0,0,0.3); padding:8px; border-radius:6px;'><b>决策依据：</b>{reason_text}</div>
                    <div style='display:none;' class='raw-decision'>{decision_text}</div>
                </div>
            </div>
            """)
        final_output.append("</div>")
        
    else:
        final_output = ["<div class='ai-schemes-container' style='display: flex; flex-direction: column; gap: 12px; margin-top: 12px;'>"]
        for i, res in enumerate(results):
            res_content = f"<span style='color:#ff6b6b;'>{str(res)}</span>" if isinstance(res, Exception) else (res or "空")
            pin_button = ""
            if work_mode == "creation":
                pin_button = f"<button onclick='window.pinToSessionSteelMark(this)' style='margin-top:14px; width:100%; background:rgba(216,180,254,0.05); border:1px dashed rgba(216,180,254,0.5); color:#d8b4fe; padding:8px; border-radius:8px; cursor:pointer; font-size:0.85rem; font-weight:bold; transition:0.3s;' onmouseover=\"this.style.background='rgba(216,180,254,0.15)'; this.style.borderColor='#d8b4fe';\" onmouseout=\"this.style.background='rgba(216,180,254,0.05)'; this.style.borderColor='rgba(216,180,254,0.5)';\">✨ 蒸馏核心结论，刻入本局钢印</button>"
            
            final_output.append(f"""
            <div class='ai-scheme-card' style='background:rgba(168, 199, 250, 0.03); padding:16px; border:1px solid rgba(168,199,250,0.2); border-radius:12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);'>
                <div style='display:flex; justify-content:space-between; border-bottom:1px dashed rgba(168,199,250,0.2); padding-bottom:12px; margin-bottom:12px; align-items:center;'>
                    <b style='background:-webkit-linear-gradient(0deg, #a8c7fa, #d8b4fe); -webkit-background-clip:text; -webkit-text-fill-color:transparent; font-size:1.05rem;'>✨ {task_names[i]} 产出</b>
                    <button class='confirm-flow-btn' onclick='selectWinner(this, \"text\")' style='background:linear-gradient(135deg, #a8c7fa 0%, #d8b4fe 100%); border:none; color:#111; padding:6px 14px; border-radius:8px; cursor:pointer; font-weight:bold; font-size:0.8rem; box-shadow: 0 2px 8px rgba(168,199,250,0.3);'>✨ 确认采纳，至下个环节</button>
                </div>
                <div class='scheme-payload' style='font-size:0.9rem; line-height:1.6; color:#e3e3e3;'>{res_content}</div>
                {pin_button}
            </div>
            """)
        final_output.append("</div>")

    return "".join(final_output)

# =====================================================================
# [区块 9] V7.0 真·流式发生器 (SSE Streaming Engine)
# =====================================================================
async def execute_workflow_stream(req_data: dict):
    """
    专门处理前端管家交流的实时打字机，使用 Yield 生成器。
    包含针对 Docker 的 stdin 物理硬灌协议与 codecs 增量解码防口吃机制。
    """
    vendors_config = load_ai_vendors()
    selected_vendor_ids = req_data.get("vendors", [])
    instruction = req_data.get("instruction", "")
    user_input = req_data.get("user_input", "")
    chat_id = req_data.get("chat_id", "")
    domain_id = req_data.get("domain_id", "factory_dev")
    step_title = req_data.get("step_title", "管家交流")
    image_urls = req_data.get("images", [])
    custom_prompt = req_data.get("custom_prompt", "") 
    injected_dna = req_data.get("injected_dna", []) 
    override_base = bool(req_data.get("override_base", False)) 
    
    # 💡 V16.1 备份全量物理资产路径
    original_file_urls = list(image_urls) if image_urls else []
    
    # ===== 🔮 V15.0 文档炼金炉拦截网 (前台流式通道) =====
    pure_image_urls = []
    if image_urls:
        for url in image_urls:
            ext = os.path.splitext(url)[1].lower()
            if ext in ['.png', '.jpg', '.jpeg', '.webp', '.gif']:
                pure_image_urls.append(url)
            else:
                rel_path = url.replace("/storage/", "")
                local_file_path = os.path.join(STORAGE_DIR, rel_path)
                extracted_text = document_parser.extract_document_text(local_file_path)
                if extracted_text:
                    user_input += extracted_text
                else:
                    pure_image_urls.append(url)
    image_urls = pure_image_urls
    # ============================================================
    
    tuning = load_tuning_config()
    fallback_id = tuning.get("pro_model_id") or tuning.get("primary_model_id")
    
    vendor = None
    if selected_vendor_ids:
        v_id = selected_vendor_ids[0]
        vendor = next((v for v in vendors_config if str(v.get("id")) == str(v_id)), None)
    if not vendor and fallback_id:
        vendor = next((v for v in vendors_config if str(v.get("id")) == str(fallback_id)), None)
    if not vendor and vendors_config:
        vendor = vendors_config[0]
        
    if not vendor:
        yield "【系统阻断】：未在系统中找到可用的 AI 模型配置。"
        return
        
    v_name = vendor.get("name", "Unknown AI")
    target_model_id = vendor.get("model_id") or v_name 
    api_url = vendor.get("url", "").strip()
    api_key = vendor.get("key", "").strip()

    # 🎯 厂长特供单兵防线：流式阀门拦截
    if vendor.get("use_sandbox"):
        await push_to_radar("INFO", f"🎯 [战术转移] {v_name} 触名单兵防线，流式通道被强行熔断并路由至二厂...")
        hijack_prompt = f"【总厂传达战略指令】:\n{instruction}\n\n【本轮输入参数/数据】:\n{user_input}" if instruction else user_input
        hijack_payload = {
            "task_id": f"stream_{int(time.time())}_{uuid.uuid4().hex[:4]}",
            "prompt": hijack_prompt,
            "world": "dark_factory",
            "dna_rules": {
                "stop": vendor.get("force_stop", 15),
                "purge": vendor.get("purge_limit", 20)
            }
        }
        try:
            # 💡 物理链路修复：流式通道也必须绕过代理拦截！
            radar_host = os.getenv("RADAR_HOST", "192.168.2.2")
            async with httpx.AsyncClient(trust_env=False) as local_client:
                await local_client.post(f"http://{radar_host}:8999/api/dispatch", json=hijack_payload, timeout=5.0)
            yield f"\n\n> 🛡️ **[战术路由重定向]**：当前算力节点已开启单兵防护，任务被强行剥离至二厂沙盒。\n> 狙击手已架枪，请切出此对话，前往 [全息监工大盘 (0.html)](/0.html) 查阅推演状态与最终产物。"
            return 
        except Exception as e:
            yield f"\n\n> ❌ **[战术转移失败]**: {e}"
            return
    
    await push_to_radar("INFO", f"🛫 [流式大动脉] 主控流式连线节点: {v_name} | 议题: {step_title}")
    
    session_state = await get_session_state(chat_id)
    is_stargate = api_url.startswith("docker://")
    
    node_system_prompt = assemble_ultimate_prompt(custom_prompt.strip() if custom_prompt else "", vendor, injected_dna, override_base)
    
    if is_stargate:
        # 🌌 星门流式穿透协议 (光缆纯净模式 + 物理硬拷贝)
        container_name = api_url.replace("docker://", "")
        
        cli_asset_paths = []
        if original_file_urls: 
            chat_id_str = str(chat_id)
            isolated_dir = f"/app/workspace/chat_{chat_id_str}"
            mkdir_cmd = ["docker", "exec", container_name, "mkdir", "-p", isolated_dir]
            try: subprocess.run(mkdir_cmd, check=True)
            except Exception: pass

            for img_url in original_file_urls:
                rel_path = img_url.replace("/storage/", "")
                local_file_in_3dvr = os.path.join(STORAGE_DIR, rel_path)
                if os.path.exists(local_file_in_3dvr):
                    file_name = os.path.basename(local_file_in_3dvr)
                    target_path_in_cli = f"{isolated_dir}/{file_name}"
                    cp_cmd = ["docker", "cp", local_file_in_3dvr, f"{container_name}:{target_path_in_cli}"]
                    try:
                        subprocess.run(cp_cmd, check=True)
                        cli_asset_paths.append(target_path_in_cli)
                    except Exception: pass

        msg_parts = []
        if node_system_prompt: msg_parts.append(f"【专属行动纲领 (SOP)】:\n{node_system_prompt}")
        
        session_corrections = session_state.get("user_corrections", "") if session_state else ""
        if session_corrections: msg_parts.append(f"【最高物理法则 (必须遵守)】:\n{session_corrections}")
        
        if instruction: msg_parts.append(f"【总厂传达战略指令】:\n{instruction}")
        if user_input: msg_parts.append(f"【本轮输入参数/数据】:\n{user_input}")

        if cli_asset_paths: 
            paths_str = " ".join(cli_asset_paths)
            msg_parts.append(f"【物理资产引渡路径】: {paths_str}")
        
        full_prompt = "\n\n".join(msg_parts)
        
        target_container = os.getenv("TARGET_CLI_CONTAINER", container_name)
        cmd = ["docker", "exec", "-i", target_container, "gemini", "prompt"]
        
        try:
            process = await asyncio.create_subprocess_exec(
                *cmd, 
                stdin=asyncio.subprocess.PIPE, 
                stdout=asyncio.subprocess.PIPE, 
                stderr=asyncio.subprocess.PIPE
            )
            
            # 🌊 流式阀门微操：封闭输入管道，唤醒大模型开始吐字！
            process.stdin.write(full_prompt.encode('utf-8'))
            process.stdin.write_eof()
            
            try:
                # 💡 V14.6 增量解码协议：彻底终结“赛博口吃”与漏字
                import codecs
                decoder = codecs.getincrementaldecoder("utf-8")(errors="ignore")
                
                while True:
                    chunk = await process.stdout.read(2048)
                    if not chunk: break
                    
                    decoded_text = decoder.decode(chunk, final=False)
                    if decoded_text:
                        yield decoded_text
                
                final_tail = decoder.decode(b"", final=True)
                if final_tail:
                    yield final_tail
                    
            except Exception as read_e: pass
            
            await process.wait()
            if process.returncode != 0 and process.returncode is not None:
                stderr = await process.stderr.read()
                err_str = stderr.decode('utf-8', errors='ignore').strip()
                
                quota_match = re.search(r'reset after\s+([0-9hms]+)', err_str)
                if quota_match or 'QUOTA_EXHAUSTED' in err_str:
                    wait_time = quota_match.group(1).replace('h', '小时').replace('m', '分钟').replace('s', '秒') if quota_match else "一段时间"
                    yield f"\n\n<div style='color:#ff5f56; padding:10px; border:1px solid rgba(255,95,86,0.3); border-radius:6px; background:rgba(255,95,86,0.1); margin-top:10px;'>⚠️ <b>[CLI 额度已爆]</b> 官方 API 配额耗尽，预计 <b>{wait_time}</b> 后恢复。请切换其他算力模型继续任务。</div>"
                elif "ERR_STREAM_PREMATURE_CLOSE" not in err_str:
                    clean_err = re.sub(r'Warning:.*?gemini-extension\.json', '', err_str, flags=re.DOTALL)
                    clean_err = clean_err.replace("Loaded cached credentials.", "").strip()
                    if clean_err:
                        yield f"\n\n【CLI 容器报错】: {clean_err}"
        except httpx.HTTPError as e:
            yield f"\n\n⚠️ [网络断开]: {str(e)}"
        except Exception as e:
            yield f"\n\n❌ [CLI 崩溃]: {str(e)}"
    else:
        # 🌐 HTTP API SSE 协议
        MAX_MEMORY_KEYS = 5 
        if session_state and len(session_state) > MAX_MEMORY_KEYS:
            trimmed_state = dict(list(session_state.items())[-MAX_MEMORY_KEYS:])
            memory_str = json.dumps(trimmed_state, ensure_ascii=False)
            memory_str = f"...(已折叠早期节点记忆)...\n" + memory_str
        else:
            memory_str = json.dumps(session_state, ensure_ascii=False) if session_state else "暂无"
            
        if len(memory_str) > 2500:
            memory_str = "...(前文已被物理截断以保护算力)...\n" + memory_str[-2500:]

        if injected_dna is None: injected_dna = []
        else: injected_dna = list(injected_dna)
            
        dynamic_vars = {}
        session_corrections = session_state.get("user_corrections", "")
        if session_corrections:
            dynamic_vars["SYS_USER_CORRECTIONS"] = session_corrections
            if "SYS_RULE_USER_CORRECTION" not in injected_dna:
                injected_dna.append("SYS_RULE_USER_CORRECTION")

        system_prompt = assemble_ultimate_prompt(
            custom_prompt.strip() if custom_prompt else "", 
            vendor, injected_dna, override_base, instruction, dynamic_vars
        )

        few_shot_context = engines.vector_db.get_few_shot_prompt_from_vectordb(user_input, limit=tuning["rag_limit"], domain_id=domain_id) if hasattr(engines.vector_db, "get_few_shot_prompt_from_vectordb") else ""
        if few_shot_context: system_prompt += f"\n\n{few_shot_context}"
            
        system_prompt += f"\n\n---【记忆】---\n{memory_str}"

        user_content_array = [{"type": "text", "text": f"当前指令/状态：\n{user_input}"}]
        has_image = False
        if image_urls:
            user_content_array.append({
                "type": "text", 
                "text": f"\n\n【🚨 跨域资产实体化通告】:\n厂长为您上传了以下视觉资产: {image_urls}\n⚠️ 绝对禁止使用 list_directory 或 glob 去全盘搜索！请直接调用你大脑内的原生视觉模型能力来解析下方传入的这些图片数据！"
            })
            for local_url in image_urls:
                base64_data = get_base64_from_local_url(local_url)
                if base64_data:
                    has_image = True
                    user_content_array.append({"type": "image_url", "image_url": {"url": base64_data}})
        
        final_user_content = user_content_array
        
        messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": final_user_content}]
        
        payload = {
            "model": target_model_id, 
            "messages": messages, 
            "stream": True,
            "max_tokens": vendor.get("max_tokens") or tuning.get("max_tokens", 3000),
            "temperature": vendor.get("temperature") if vendor.get("temperature") is not None else tuning.get("temperature", 0.8), 
            "top_p": vendor.get("top_p") if vendor.get("top_p") is not None else tuning.get("top_p", 1.0),
            "presence_penalty": vendor.get("presence_penalty") if vendor.get("presence_penalty") is not None else tuning.get("presence_penalty", 0.0)
        }
        
        client = get_http_client()
        endpoint = api_url if api_url.endswith("/completions") else f"{api_url.rstrip('/')}/chat/completions"
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        
        try:
            async with client.stream("POST", endpoint, headers=headers, json=payload, timeout=60.0) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        line_data = line[6:].strip()
                        if line_data == "[DONE]": break
                        if not line_data: continue
                        try:
                            data = json.loads(line_data)
                            delta = data["choices"][0].get("delta", {})
                            if "content" in delta and delta["content"] is not None:
                                yield delta["content"]
                        except: pass
        except httpx.HTTPError as e:
            yield f"\n\n⚠️ [网络断开]: {str(e)}"
        except Exception as e:
            yield f"\n\n❌ [API 异常]: {str(e)}"
            
# =====================================================================
# [区块 10] 🌌 V26.5 星门OS引擎 (Multi-Agent Swarm Collaboration)
# =====================================================================
async def stargate_meeting_runner(meeting_id: str, topic: str, agents_config: list, rounds: int):
    """
    【星门OS核心调度器】支持多 Agent 论战、黄金算力边界切割与记忆坍缩
    """
    await push_to_radar("INFO", f"🌌 [星门OS] 会议 {meeting_id} 启动！议题: {topic}")
    
    meeting_dir = os.path.join(DATA_DIR, "stargate_archives", meeting_id)
    os.makedirs(meeting_dir, exist_ok=True)
    
    public_board_path = os.path.join(meeting_dir, "center_board.md")
    briefcases = {}
    for agent in agents_config:
        aid = agent.get('id', f"agent_{uuid.uuid4().hex[:4]}")
        arole = agent.get('role', '与会者')
        b_path = os.path.join(meeting_dir, f"{aid}_briefcase.md")
        # 💡 V30 浅呼吸防擦除：如果特工公文包不存在才初始化
        if not os.path.exists(b_path):
            with open(b_path, "w", encoding="utf-8") as f:
                f.write(f"【你的初始潜意识】: 你是本次会议的 {arole}。\n【会议核心议题】: {topic}\n")
        briefcases[aid] = b_path
        
    public_history = [] 
    if not os.path.exists(public_board_path):
        with open(public_board_path, "w", encoding="utf-8") as f:
            f.write(f"# 星门会议纪要 \n**议题**：{topic}\n\n")
    else:
        with open(public_board_path, "r", encoding="utf-8") as f:
            public_history.append(f.read()) # 将前世记忆全部塞入上下文

    all_vendors = load_ai_vendors()

    for current_round in range(1, rounds + 1):
        # 🛑 V28.1 物理熔断检测：大轮回前检查厂长是否按下了“停止呼吸”
        if meeting_id in GLOBAL_STATS.abort_signals:
            await push_to_radar("WARNING", f"🛑 [绝对指令] 接收到厂长紧急熔断脉冲，会议 {meeting_id} 已被强行终止！")
            break 

        await push_to_radar("INFO", f"🔄 [星门OS] 第 {current_round}/{rounds} 轮探讨开始...")
        
        for agent in agents_config:
            aid = agent.get('id')
            arole = agent.get('role')
            vendor_id = agent.get('vendor_id')
            
            vendor = next((v for v in all_vendors if str(v.get("id")) == str(vendor_id)), all_vendors[0] if all_vendors else None)
            if not vendor: continue
            
            agent_injected_dnas = agent.get('injected_dna', [])
            if "SYS_RULE_TOOL_AWARENESS" not in agent_injected_dnas:
                agent_injected_dnas.append("SYS_RULE_TOOL_AWARENESS")
            agent['injected_dna'] = agent_injected_dnas

            private_memory = ""
            if os.path.exists(briefcases[aid]):
                with open(briefcases[aid], "r", encoding="utf-8") as f:
                    private_memory = f.read()

            # 💡 V26.1 记忆坍缩引擎 (Memory Collapse Protocol)
            MAX_MEMORY_CHARS = 2500
            if len(private_memory) > MAX_MEMORY_CHARS:
                await push_to_radar("INFO", f"🗜️ [{arole}] 公文包过载，触发记忆坍缩引擎...")
                collapse_instruction = "执行记忆压缩"
                collapse_prompt = f"【系统强制指令】：以下是你的私有会议记忆，它已接近 Token 阈值。请提炼出最核心的观点、你坚守的立场以及待办事项，要求压缩在 800 字以内，绝对不能遗漏关键决策。\n\n【原始记忆】:\n{private_memory}"
                
                try:
                    collapsed_memory_html = await call_single_ai(
                        req_vendor_param=vendor, 
                        instruction=collapse_instruction, 
                        user_input=collapse_prompt, 
                        deliver_type="text_comm", 
                        chat_id=f"collapse_{meeting_id}", 
                        image_urls=[],
                        step_title="记忆坍缩",
                        custom_prompt="你是一个没有感情的记忆压缩机器。只输出压缩后的要点，不准有任何废话。"
                    )
                    collapsed_memory = re.sub(r'<[^>]*>?', '', collapsed_memory_html).strip()
                    private_memory = f"【已坍缩的深度记忆】:\n{collapsed_memory}\n"
                    with open(briefcases[aid], "w", encoding="utf-8") as f:
                        f.write(private_memory)
                    await push_to_radar("INFO", f"✅ [{arole}] 记忆坍缩完成，已释放 {len(private_memory)} 字节空间。")
                except Exception as ce:
                    await push_to_radar("WARNING", f"⚠️ [{arole}] 记忆坍缩失败，带着臃肿的记忆强行参会: {ce}")

            # 🧬 V28.0 终极灵魂挂载：穿透读取双层物理档案
            _ST_DIR = os.path.join(DATA_DIR, "storage")
            _AGENTS_DIR = os.path.join(_ST_DIR, "os", "dna", "agents")
            _VAULT_DIR = os.path.join(_ST_DIR, "os", "dna", "vault")
            
            agent_profile_path = os.path.join(_AGENTS_DIR, aid, "profile.json")
            injected_dnas = []
            if os.path.exists(agent_profile_path):
                try:
                    with open(agent_profile_path, "r", encoding="utf-8") as f:
                        injected_dnas = json.load(f).get("injected_dna", [])
                except: pass
            
            dna_context = ""
            if injected_dnas:
                dna_vault = []
                for tier in ["core", "dynamic"]:
                    tier_dir = os.path.join(_VAULT_DIR, tier)
                    if os.path.exists(tier_dir):
                        for fname in os.listdir(tier_dir):
                            if fname.endswith(".json"):
                                try:
                                    with open(os.path.join(tier_dir, fname), "r", encoding="utf-8") as f:
                                        dna_vault.append(json.load(f))
                                except: pass
                
                identity_rules, sop_rules, redline_rules = [], [], []
                
                for dna_id in injected_dnas:
                    dna_obj = next((d for d in dna_vault if d.get("id") == dna_id), None)
                    if dna_obj:
                        dtype = dna_obj.get("type", "")
                        if dtype == "identity": identity_rules.append(dna_obj.get("content", ""))
                        elif dtype == "sop": sop_rules.append(dna_obj.get("content", ""))
                        elif dtype == "rule": redline_rules.append(dna_obj.get("content", ""))
                
                if identity_rules or sop_rules or redline_rules:
                    dna_context += "【核心基因约束 (你必须绝对遵守以下法则)】\n"
                    if redline_rules: dna_context += "🚨 [不可逾越的红线]:\n" + "\n".join(f"- {r}" for r in redline_rules) + "\n"
                    if sop_rules: dna_context += "⚙️ [强制业务工序 (SOP)]:\n" + "\n".join(f"- {s}" for s in sop_rules) + "\n"
                    if identity_rules: dna_context += "👤 [认知人格与潜意识]:\n" + "\n".join(f"- {i}" for i in identity_rules) + "\n"
                    dna_context += "\n"

            # ⚖️ V26.5 50/50 Token 黄金分割计算引擎
            MAX_PRIVATE_TOKENS = 3000 
            MAX_PUBLIC_TOKENS = 3000  

            if len(private_memory) > MAX_PRIVATE_TOKENS: private_memory = private_memory[-MAX_PRIVATE_TOKENS:]
            public_context = "\n".join(public_history)
            if len(public_context) > MAX_PUBLIC_TOKENS: public_context = public_context[-MAX_PUBLIC_TOKENS:]

            # 💡 V38.0 核心重铸：SOJ 结构化语言与动态算力自治 (Token 极限压缩)
            fallback_soj = (
                f"[SYSTEM PROTOCOL: 结构化数据通讯 SOJ 已启用]\n"
                f"WARNING: 本节点为纯粹的数据处理单元，禁止任何多余的自然语言交互。\n"
                f"你的输出必须且只能是一个严格合法的 SOJ JSON 结构！\n"
                f"【SOJ 强制输出拓扑结构】:\n"
                f"{{\n"
                f"  \"status\": \"processing\",\n"
                f"  \"ai_dynamic_stop\": <整数:基于当前任务复杂度，预估所需的【常规运转上限轮次】(例如: 15)>,\n"
                f"  \"ai_dynamic_purge\": <整数:触发防御性【强制中断轮次】(必须大于stop，例如: 20)>,\n"
                f"  \"public_speech\": \"<你在公共黑板上的输出结论。要求：极简、严谨、直击要害，禁止冗长陈述>\",\n"
                f"  \"private_briefcase\": \"<提取本轮的核心决策或待办事项，作为状态机保留到下一轮>\"\n"
                f"}}\n"
                f"绝对只输出纯 JSON！严禁使用 ```json 包裹！"
            )
            sys_instruction = get_core_system_prompt("SYS_CORE_SOJ_PROTOCOL", fallback_soj)
            
            custom_prompt = (
                f"【⚖️ 50/50 黄金算力边界已锁定】\n\n"
                f"--- [左脑：专属图纸与灵魂基因] ---\n"
                f"角色: {arole}\n"
                f"{dna_context}"
                f"私有档案:\n{private_memory}\n\n"
                f"--- [右脑：全域公共演进黑板] ---\n"
                f"议题: {topic}\n"
                f"轮次: {current_round}/{rounds}\n"
                f"历史追踪:\n{public_context}\n\n"
                f"【操作指令】：严格按照 SOJ JSON 格式执行推演，并在 `ai_dynamic_stop` 中动态上报你申请的算力轮次。"
            )
            
            try:
                raw_response_html = await call_single_ai(
                    req_vendor_param=vendor, 
                    instruction=sys_instruction, 
                    user_input=custom_prompt, 
                    deliver_type="text_comm", 
                    chat_id=f"sg_{meeting_id}_{aid}", 
                    image_urls=[],
                    step_title="星门SOJ论战",
                    custom_prompt="你是一个执行 SOJ 协议的机械节点。"
                )
                
                # 🦾 机械剥壳：强行提取 JSON
                clean_json_str = re.sub(r'<[^>]*>?', '', raw_response_html).strip()
                clean_json_str = re.sub(r'^```json|```$', '', clean_json_str, flags=re.MULTILINE).strip()
                
                start_idx = clean_json_str.find('{')
                end_idx = clean_json_str.rfind('}')
                if start_idx != -1 and end_idx != -1:
                    clean_json_str = clean_json_str[start_idx:end_idx+1]
                    
                soj_data = json.loads(clean_json_str)
                
                new_memory = soj_data.get("private_briefcase", "")
                public_speech = soj_data.get("public_speech", "机械节点完成静默运算。")
                dynamic_stop = soj_data.get("ai_dynamic_stop", 15)
                dynamic_purge = soj_data.get("ai_dynamic_purge", 20)
                
                # 💾 将 AI 自治申请的算力轮次上报系统雷达
                await push_to_radar("INFO", f"⚙️ [{arole}] SOJ通讯完毕 | 申请自治算力: Stop={dynamic_stop}, Purge={dynamic_purge}")
                
                if new_memory:
                    with open(briefcases[aid], "a", encoding="utf-8") as f:
                        f.write(f"\n[Round {current_round} 潜意识结晶]: {new_memory}")
                        
            except Exception as e:
                public_speech = f"[{arole}] SOJ 协议解析异常，信号丢失: {e}"
                await push_to_radar("WARNING", f"⚠️ [{arole}] 机械通讯降级: {e}")

            board_entry = f"**[{arole}]** (Round {current_round}):\n{public_speech}"
            if briefcase_match:
                new_memory = briefcase_match.group(1).strip()
                with open(briefcases[aid], "a", encoding="utf-8") as f:
                    f.write(f"\n[Round {current_round} 记忆沉淀]: {new_memory}")
                public_speech = raw_response.replace(briefcase_match.group(0), "").strip()
            else:
                public_speech = raw_response

            board_entry = f"**[{arole}]** (Round {current_round}):\n{public_speech}"
            public_history.append(board_entry)
            with open(public_board_path, "a", encoding="utf-8") as f:
                f.write(board_entry + "\n\n---\n\n")
                
            await push_to_radar("CHAT", f"🗣️ [{arole} 发言]: {public_speech[:50]}...")
            await asyncio.sleep(1) 

    await push_to_radar("INFO", f"✨ [星门OS] 探讨结束，快照已定格至 {meeting_dir}！")
    return f"✅ 会议 {meeting_id} 圆满结束，产物已落盘至 {meeting_dir}"


# =====================================================================
# [区块 11] 🔬 深度诊断与达尔文提炼引擎 (Diagnostic & Darwinian Engine)
# =====================================================================
async def run_autopsy_distillation(corpse_path: str, task_id: str, model_id: str, ym_folder: str):
    """
    🔬 深度诊断：追溯异常快照，提取病理，提炼自带「算力轮次与权重」的免疫 DNA。
    只有被拦截阻断的异常节点才会被送入此流转线。
    （注: 变量名保留 corpse_path 等系为了向下兼容 main.py 的调用链路）
    """
    try:
        if not os.path.exists(corpse_path):
            return
            
        with open(corpse_path, "r", encoding="utf-8") as f:
            trace_data = json.load(f)
            
        # 提取中断前最后的 5 条对话和推演日志（浓缩异常状态特征）
        messages = trace_data.get("messages", [])[-5:]
        history_dump = json.dumps(messages, ensure_ascii=False)
        
        fallback_diagnostic = """你是一个极其严谨的深度诊断引擎（高级系统架构师）。
你需要深度剖析这份因异常被【平滑中断/资源耗尽】的运行快照。
任务指令：
1. 深入分析节点陷入死锁、逻辑循环或违规的根本原因。
2. 提取中断前的 Internal Thoughts (英文内部推演)，翻译为精炼的【中文诊断摘要】。
3. 提取经验教训，为系统铸造一份【DNA 免疫基因】。
4. ⚡ 达尔文算力演算：你必须根据这套 DNA 解决问题的复杂程度，精准预估它需要的【基础运转轮次(compute_nodes)】和【容错轮次(buffer_nodes)】。
   - 如果异常是因为“步骤耗尽/频繁报错被中断”导致的，你必须在生成的 DNA 中给予它更高的算力上限！
   - 默认基准：compute_nodes=15, buffer_nodes=5。复杂任务请合理上调。
要求绝对且只输出合法 JSON，格式如下：
{
  "level": "FATAL",
  "reason": "导致被中断的中文异常状态分析",
  "translated_thoughts": "中文诊断翻译摘要...",
  "proposed_dna": {
    "tier": "dynamic",
    "world": "dark_factory 或是 stargate_os",
    "category_pinyin": "如 luojicuowu, wenjianxunzhao 等全小写拼音",
    "dna": {
      "id": "DNA_大写英文下划线",
      "name": "简短中文命名",
      "type": "rule 或是 sop",
      "desc": "极简摘要",
      "content": "具体的约束文本或SOP流程",
      "compute_nodes": 15, 
      "buffer_nodes": 5,
      "weight": 50,
      "success_count": 0,
      "death_count": 1
    }
  }
}
绝不输出 Markdown 记号！只输出纯 JSON！"""

        sys_prompt = get_core_system_prompt("SYS_CORE_DIAGNOSTIC_ENGINE", fallback_diagnostic)

        tuning = load_tuning_config()
        vendors = load_ai_vendors()
        vendor = next((v for v in vendors if str(v.get("id")) == str(model_id)), vendors[0] if vendors else None)
        if not vendor: 
            await push_to_radar("WARNING", f"⚠️ [诊断中止] 未找到主刀诊断模型 {model_id}")
            return

        # 💡 [致命修复] 剥夺诊断引擎进入沙盒的权力！防止它自己报错后引发无限套娃！
        vendor = vendor.copy()
        vendor["use_sandbox"] = False 

        # 挂载主控机床执行深度提炼
        raw_result = await call_single_ai(
            req_vendor_param=vendor, instruction="执行异常诊断与基因提炼", 
            user_input=f"【异常快照切片】:\n{history_dump}", deliver_type="text_comm",
            chat_id=f"autopsy_{task_id}", image_urls=[], step_title="深度诊断", custom_prompt=sys_prompt
        )
        
        # 🛡️ 剥离杂质：启用高维贪婪正则，无视大模型废话，强挖 JSON 核心
        clean_json = re.sub(r'<[^>]*>?', '', raw_result).strip()
        json_match = re.search(r'\{[\s\S]*\}', clean_json)
        
        if not json_match:
            raise ValueError("诊断引擎未输出任何有效的 JSON 结构")
            
        report_data = json.loads(json_match.group(0))
        
        report_data["task_id"] = task_id
        report_data["timestamp"] = datetime.now().isoformat()
        
        report_file = os.path.join(ym_folder, f"{task_id}_report.json")
        with open(report_file, "w", encoding="utf-8") as f:
            json.dump(report_data, f, ensure_ascii=False, indent=2)
            
        await push_to_radar("INFO", f"🔬 [诊断完成] 异常节点 {task_id} 已分析完毕，成功提炼一枚携带算力权重的进化 DNA！")
        
    except Exception as e:
        await push_to_radar("ERROR", f"❌ 诊断分析发生物理断流: {e}")