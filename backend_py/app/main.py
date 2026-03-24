#!/usr/bin/env python3
"""
⚙️ 黑灯工厂 - 核心大动脉中枢 (main.py / V29.0 满血重铸版)
特性：Ouroboros 自愈、星门 OS 多智能体、碎片化 DNA 基因库、边缘发声引擎。
"""

import os
os.environ["HF_ENDPOINT"] = "https://hf-mirror.com"
import sys
import json
import shutil
import uuid
import time
import asyncio
import random 
import httpx  
import hashlib 
import subprocess
import mimetypes
import shlex
import re
from datetime import datetime
from collections import defaultdict

mimetypes.init()
mimetypes.add_type('text/html', '.html')
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('application/javascript', '.js')

# 👇 【外挂组件】：挂载 Edge-TTS 微软发声引擎
try:
    import edge_tts
except ImportError:
    print("⚠️ 尚未检测到 edge-tts 引擎，API 发声通道将物理熔断。请执行 pip install edge-tts")
    edge_tts = None

from fastapi import FastAPI, HTTPException, UploadFile, File, Request, Form, BackgroundTasks
from pydantic import BaseModel
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

# ⚠️ 1. 必须【先】把当前目录挂载到系统物理路径！
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# 💡 2. 然后再导入自定义的同级物理模块！
from api_caliper import router as caliper_router
from ai_services import execute_workflow_task, async_workflow_runner, execute_workflow_stream, stargate_meeting_runner
import ai_services

# =====================================================================
# [区块 1] 限流防御与全局状态矩阵
# =====================================================================
try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded
    HAS_SLOWAPI = True
    limiter = Limiter(key_func=get_remote_address)
except ImportError:
    HAS_SLOWAPI = False
    print("⚠️ 尚未安装 slowapi，API 限流防刷盾牌未激活。")
    class DummyLimiter:
        def limit(self, *args, **kwargs):
            def decorator(func): return func
            return decorator
    limiter = DummyLimiter()

class SystemStats:
    """系统宏观探针数据"""
    active_tasks = 0      
    security_blocks = 0  

# 联通 ai_services 的物理仪表盘
ai_services.GLOBAL_STATS.active_tasks = SystemStats.active_tasks
ai_services.GLOBAL_STATS.security_blocks = SystemStats.security_blocks

# =====================================================================
# [区块 2] 大动脉初始化与路由挂载
# =====================================================================
app = FastAPI(title="AI VR Backend API (Stargate OS)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🔌 全域子扇区路由挂载专区 (Router Zone)
app.include_router(caliper_router) # [V40] 挂载量天尺计划独立路由

if HAS_SLOWAPI:
    app.state.limiter = limiter
    async def custom_rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
        SystemStats.security_blocks += 1 
        return _rate_limit_exceeded_handler(request, exc)
    app.add_exception_handler(RateLimitExceeded, custom_rate_limit_exceeded_handler)

# =====================================================================
# [区块 3] 物理空间注浆与全域路径锚定
# =====================================================================
DATA_DIR = os.getenv("DATA_DIR", "/app/data")
WEBROOT_DIR = os.path.join(DATA_DIR, "webroot")
STORAGE_DIR = os.path.join(DATA_DIR, "storage")
DUIHUA_DIR = os.path.join(STORAGE_DIR, "duihua")
TEMP_DUIHUA_DIR = os.path.join(STORAGE_DIR, "temp_duihua")
GALLERY_DIR = os.path.join(STORAGE_DIR, "gallery")
VECTOR_DB_DIR = os.path.join(DATA_DIR, "vectordb") 

AIDUIHUA_DIR = os.path.join(STORAGE_DIR, "aiduihua")
AIDUIHUA_FEED_DIR = os.path.join(AIDUIHUA_DIR, "feed_daily") 
AIDUIHUA_MINDS_DIR = os.path.join(AIDUIHUA_DIR, "minds")     

CONFIG_DIR = os.path.join(DATA_DIR, "config")
AI_CONFIG_FILE = os.path.join(CONFIG_DIR, "ai_core.json")
WORKFLOWS_FILE = os.path.join(CONFIG_DIR, "workflows.json")
DNA_VAULT_FILE = os.path.join(CONFIG_DIR, "dna_vault.json")

WORKERS_REGISTRY_FILE = os.path.join(CONFIG_DIR, "microcosm_workers.json")
DAEMON_STATE_FILE = os.path.join(CONFIG_DIR, "microcosm_state.json")

TTS_DIR = os.path.join(STORAGE_DIR, "tts") # 注册 TTS 音频物理存储路径
STARGATE_ARCHIVES_DIR = os.path.join(DATA_DIR, "stargate_archives") # 星门圆桌快照目录

# 🚀 批量物理注浆
for d in [WEBROOT_DIR, STORAGE_DIR, DUIHUA_DIR, TEMP_DUIHUA_DIR, CONFIG_DIR, GALLERY_DIR, VECTOR_DB_DIR, AIDUIHUA_DIR, AIDUIHUA_FEED_DIR, AIDUIHUA_MINDS_DIR, TTS_DIR, STARGATE_ARCHIVES_DIR]:
    os.makedirs(d, exist_ok=True)

# 🧬 V28.0 模块化基因与时空档案馆目录映射
OS_ROOT_DIR = os.path.join(STORAGE_DIR, "os")
CURRENT_YM = f"{datetime.now().strftime('%y')}-{datetime.now().month}"
NEW_ARCHIVES_DIR = os.path.join(OS_ROOT_DIR, CURRENT_YM, "archives")

DNA_BASE_DIR = os.path.join(OS_ROOT_DIR, "dna")
DNA_VAULT_DIR = os.path.join(DNA_BASE_DIR, "vault")
DNA_CORE_DIR = os.path.join(DNA_VAULT_DIR, "core")       # 黑灯工厂绝对基石
DNA_DYNAMIC_DIR = os.path.join(DNA_VAULT_DIR, "dynamic") # AI炼金混沌衍生
DNA_AGENTS_DIR = os.path.join(DNA_BASE_DIR, "agents")

for d in [DNA_VAULT_DIR, DNA_CORE_DIR, DNA_DYNAMIC_DIR, DNA_AGENTS_DIR, NEW_ARCHIVES_DIR]:
    os.makedirs(d, exist_ok=True)

chat_file_locks = defaultdict(asyncio.Lock)

# =====================================================================
# [区块 4] 🧠 向量引擎初始化 (带厂长专属硬熔断开关)
# =====================================================================
# 💡 厂长专属物理开关：False 为彻底关闭（释放 800MB 内存），True 为重新开启
ENABLE_VECTOR_DB_SWITCH = True

try:
    if not ENABLE_VECTOR_DB_SWITCH:
        raise ImportError("厂长已手动切断向量引擎电源，释放内存")
        
    print("🧠 [VectorDB] 正在启动 ChromaDB 认知引擎...")
    import chromadb
    from chromadb.utils import embedding_functions
    
    # 🛡️ 核心修复：必须先在此处宣告全局变量的存在！
    HAS_CHROMADB = True
    
    chroma_client = chromadb.PersistentClient(path=VECTOR_DB_DIR)
    LOCAL_MODEL_PATH = os.path.join(CONFIG_DIR, "models", "paraphrase-multilingual-MiniLM-L12-v2")
    
    if os.path.exists(LOCAL_MODEL_PATH) and os.path.exists(os.path.join(LOCAL_MODEL_PATH, "config.json")):
        print("📦 [VectorDB] 检测到本地离线模型，正在直接从硬盘装载大脑...")
        emb_fn = embedding_functions.SentenceTransformerEmbeddingFunction(model_name=LOCAL_MODEL_PATH)
    else:
        print("🌐 [VectorDB] 未找到完整的本地模型，尝试从网络在线下载...")
        emb_fn = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="paraphrase-multilingual-MiniLM-L12-v2")
        
    import engines.vector_db
    engines.vector_db.chroma_client = chroma_client
    engines.vector_db.emb_fn = emb_fn
    engines.vector_db.gallery_collection = chroma_client.get_or_create_collection(name="knowledge_base_design_vr", embedding_function=emb_fn)
    
    print(f"✅ [VectorDB] 知识库维度空间映射完毕！引擎已具备无限领域动态隔离能力。")

except ImportError as e:
    # 🛡️ 拦截切断电源的信号
    HAS_CHROMADB = False
    print(f"⚠️ [VectorDB] 语义检索飞轮未激活 ({e})。")
except Exception as e:
    # 🛡️ 拦截其他致命启动报错
    HAS_CHROMADB = False
    print(f"❌ [VectorDB] 引擎启动致命异常: {e}")

# =====================================================================
# [区块 5] 🚀 后台任务守护进程与生命周期
# =====================================================================
ENABLE_COMFYUI_WATCHER = int(os.getenv("ENABLE_COMFYUI_WATCHER", "0")) 
COMFYUI_URL = os.getenv("COMFYUI_URL", "http://127.0.0.1:8188")
COMFYUI_RESTART_CMD = os.getenv("COMFYUI_RESTART_CMD", "docker restart comfyui")

MICROCOSM_ENABLED = True # 蜂群全局开关

async def comfyui_health_watcher():
    if not ENABLE_COMFYUI_WATCHER: return
    print(f"🛡️ [Watcher] 算力引擎守护已启动，监控地址: {COMFYUI_URL}")
    fail_count = 0
    while True:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{COMFYUI_URL}/system_stats")
                if resp.status_code == 200: fail_count = 0
                else: fail_count += 1
        except Exception: fail_count += 1

        if fail_count >= 3:
            print("🚨 [Watcher] 警告：ComfyUI 连续无响应，触发熔断重启！")
            os.system(COMFYUI_RESTART_CMD)
            if hasattr(ai_services, "clear_stuck_queue"): await ai_services.clear_stuck_queue()
            fail_count = 0
            await asyncio.sleep(60) 
        await asyncio.sleep(30)

async def gentle_cleanup_temp_chats():
    while True:
        try:
            now = time.time()
            if os.path.exists(TEMP_DUIHUA_DIR):
                for folder in os.listdir(TEMP_DUIHUA_DIR):
                    folder_path = os.path.join(TEMP_DUIHUA_DIR, folder)
                    if os.path.isdir(folder_path):
                        if now - os.path.getctime(folder_path) > 86400: shutil.rmtree(folder_path)
        except: pass
        await asyncio.sleep(3600)

async def microcosm_daemon_loop():
    global MICROCOSM_ENABLED
    print("🌌 [Daemon Heart] 蜂群意识流已切入慢速巡航模式 (3 min/tick)...")
    while True:
        await asyncio.sleep(180)
        if not MICROCOSM_ENABLED: continue
            
        try:
            workers = {}
            if os.path.exists(WORKERS_REGISTRY_FILE):
                with open(WORKERS_REGISTRY_FILE, "r", encoding="utf-8") as f: workers = json.load(f)
            
            state = {"last_mob_time": 0, "workers_last_time": {}}
            if os.path.exists(DAEMON_STATE_FILE):
                with open(DAEMON_STATE_FILE, "r", encoding="utf-8") as f: state = json.load(f)
                    
            now = time.time()
            tasks_to_dispatch = []
            
            if now - state.get("last_mob_time", 0) >= 86400:
                tasks_to_dispatch.append(("mob", None))
                state["last_mob_time"] = now
                
            for wid, worker_info in workers.items():
                freq_mins = int(worker_info.get("freq", 60))
                last_time = state["workers_last_time"].get(wid, 0)
                if now - last_time >= freq_mins * 60:
                    tasks_to_dispatch.append(("managed", worker_info))
                    if "workers_last_time" not in state: state["workers_last_time"] = {}
                    state["workers_last_time"][wid] = now
                    
            if tasks_to_dispatch:
                with open(DAEMON_STATE_FILE, "w", encoding="utf-8") as f: json.dump(state, f, ensure_ascii=False)
                for t_type, w_data in tasks_to_dispatch:
                    if hasattr(ai_services, "generate_inner_thought"):
                        asyncio.create_task(ai_services.generate_inner_thought(t_type, w_data))
        except Exception as e: print(f"⚠️ [Daemon Heart] 心跳轮询异常: {e}")

@app.on_event("startup")
async def combined_startup_event():
    asyncio.create_task(gentle_cleanup_temp_chats())
    asyncio.create_task(ai_services.comfyui_worker())
    asyncio.create_task(comfyui_health_watcher())
    asyncio.create_task(microcosm_daemon_loop())
# =====================================================================
# [区块 6] 📝 核心数据模型 (Pydantic Schemas)
# =====================================================================
class ChatCreate(BaseModel):
    first_message: str | None = None
    is_temp: bool = False
    domain_id: str | None = None 

class MessageAppend(BaseModel):
    role: str
    text: str
    timestamp: str | None = None 

class WorkflowStatusUpdate(BaseModel):
    workflow_id: str | None = None
    completed_nodes: list[str] = []
    pending_nodes: list[str] = []
    system_status: str | None = "IDLE" 

class WorkflowExecuteReq(BaseModel):
    chat_id: str
    step_title: str
    instruction: str
    user_input: str
    vendors: list[str] = []
    deliver_type: str
    images: list[str] = [] 
    domain_id: str = "factory_dev"
    delay_seconds: int = 0  
    work_mode: str = "creation"
    is_dispatcher: bool = False

class SessionStateUpdate(BaseModel):
    updates: dict

class WorkflowApproveReq(BaseModel):
    workflow_data: dict

class AsyncWorkflowStartReq(BaseModel):
    chat_id: str
    workflow_id: str
    start_nodes: list[str]
    user_input: str
    image_urls: list[str] = []

class StargateMeetingStartReq(BaseModel):
    meeting_id: str
    topic: str
    agents_config: list
    rounds: int = 3

class AIWorkerUpdateReq(BaseModel):
    workers: dict

class MemoryPayload(BaseModel):
    id: str
    text: str
    mem_type: str = "sop" 

class DnaUpdateModel(BaseModel):
    name: str | None = None
    desc: str | None = None
    content: str | None = None
    type: str | None = None  
    compute_nodes: int | None = None
    buffer_nodes: int | None = None
    weight: int | None = None

# =====================================================================
# [区块 7] 🐍 Ouroboros 衔尾蛇自愈协议特权 API
# =====================================================================
# 💡 安全探测：防止 ai_services 模块因环境问题未加载成功导致主干道崩溃
if hasattr(ai_services, "get_chat_logs_impl"):
    app.get("/api/diagnostics/logs/{session_id}", summary="【自检通道】读取底层快照")(ai_services.get_chat_logs_impl)

if hasattr(ai_services, "apply_auto_patch_impl"):
    app.post("/api/workflow/auto_patch", summary="【三库联动】物理热更新基因槽")(ai_services.apply_auto_patch_impl)

# =====================================================================
# [区块 8] ⚙️ AI 核心配置与工作流图纸 CRUD
# =====================================================================
@app.get("/api/config/ai")
def get_ai_config():
    if not os.path.exists(AI_CONFIG_FILE): return {}
    with open(AI_CONFIG_FILE, "r", encoding="utf-8") as f: return json.load(f)

@app.post("/api/config/ai")
def save_ai_config(config: dict):
    with open(AI_CONFIG_FILE, "w", encoding="utf-8") as f: json.dump(config, f, ensure_ascii=False, indent=2)
    return {"status": "ok"}

@app.get("/api/config/workflows")
def get_workflows():
    if not os.path.exists(WORKFLOWS_FILE): return {}
    with open(WORKFLOWS_FILE, "r", encoding="utf-8") as f: return json.load(f)

@app.post("/api/config/workflows")
def save_workflow(wf_entry: dict):
    current_data = {}
    if os.path.exists(WORKFLOWS_FILE):
        try:
            with open(WORKFLOWS_FILE, "r", encoding="utf-8") as f: current_data = json.load(f)
        except: current_data = {}
    entry_id = wf_entry.get("id")
    if not entry_id or entry_id not in current_data: entry_id = f"wf_{uuid.uuid4().hex[:8]}"
    if "id" in wf_entry: del wf_entry["id"]
    
    if "domain_id" not in wf_entry:
        wf_entry["domain_id"] = wf_entry.get("data", {}).get("domain_id", "factory_dev")

    current_data[entry_id] = wf_entry
    with open(WORKFLOWS_FILE, "w", encoding="utf-8") as f: json.dump(current_data, f, ensure_ascii=False, indent=2)
    return {"status": "ok", "id": entry_id}

@app.delete("/api/config/workflows/{wf_id}")
def delete_workflow(wf_id: str):
    if not os.path.exists(WORKFLOWS_FILE): raise HTTPException(status_code=404)
    with open(WORKFLOWS_FILE, "r", encoding="utf-8") as f: current_data = json.load(f)
    if wf_id in current_data:
        del current_data[wf_id]
        with open(WORKFLOWS_FILE, "w", encoding="utf-8") as f: json.dump(current_data, f, ensure_ascii=False, indent=2)
        return {"status": "ok"}
    raise HTTPException(status_code=404)

@app.post("/api/workflow/approve")
def approve_and_mount_workflow(req: WorkflowApproveReq):
    current_data = {}
    if os.path.exists(WORKFLOWS_FILE):
        try:
            with open(WORKFLOWS_FILE, "r", encoding="utf-8") as f: current_data = json.load(f)
        except: current_data = {}
    wf_entry = req.workflow_data
    entry_id = wf_entry.get("id")
    if not entry_id or entry_id not in current_data: entry_id = f"wf_{uuid.uuid4().hex[:8]}"
    wf_entry["id"] = entry_id
    if "name" not in wf_entry: wf_entry["name"] = f"CLI 生成的智能流_{datetime.now().strftime('%m%d_%H%M')}"
    
    if "domain_id" not in wf_entry:
        wf_entry["domain_id"] = wf_entry.get("data", {}).get("domain_id", "factory_dev")

    current_data[entry_id] = wf_entry
    with open(WORKFLOWS_FILE, "w", encoding="utf-8") as f: json.dump(current_data, f, ensure_ascii=False, indent=2)
    return {"status": "ok", "workflow_id": entry_id, "name": wf_entry["name"]}

@app.get("/api/config/soul")
def get_soul_config():
    try:
        soul_file_path = os.path.join(CONFIG_DIR, "soul.md")
        if os.path.exists(soul_file_path):
            with open(soul_file_path, "r", encoding="utf-8") as f: return {"content": f.read()}
        return {"content": ""}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/config/soul")
def save_soul_config(content: str = Form(...)):
    try:
        soul_file_path = os.path.join(CONFIG_DIR, "soul.md")
        with open(soul_file_path, "w", encoding="utf-8") as f: f.write(content)
        return {"status": "ok"}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

# =====================================================================
# [区块 9] 🧬 碎片化 DNA 基因库全栈 API (V28 演进版)
# =====================================================================
# 💡 [修复] 接收 0.html 传来的大盘机床法则
@app.post("/api/config/dna")
async def save_global_dna_rules(req: dict):
    rules_file = os.path.join(CONFIG_DIR, "stargate_dna_rules.json")
    with open(rules_file, "w", encoding="utf-8") as f:
        json.dump(req, f, ensure_ascii=False, indent=2)
    return {"status": "ok"}

@app.get("/api/config/dna")
async def get_dna_config():
    """【全量基因载入】扫描 core 和 dynamic 目录下的所有切片"""
    vault = []
    
    # 兼容老版数据：将单体库自动分裂
    if os.path.exists(DNA_VAULT_DIR):
        for filename in os.listdir(DNA_VAULT_DIR):
            old_path = os.path.join(DNA_VAULT_DIR, filename)
            if filename.endswith(".json") and os.path.isfile(old_path):
                try: shutil.move(old_path, os.path.join(DNA_CORE_DIR, filename))
                except: pass

    for tier in ["core", "dynamic"]:
        tier_dir = os.path.join(DNA_VAULT_DIR, tier)
        if os.path.exists(tier_dir):
            for filename in os.listdir(tier_dir):
                if filename.endswith(".json"):
                    try:
                        with open(os.path.join(tier_dir, filename), "r", encoding="utf-8") as f:
                            dna_obj = json.load(f)
                            dna_obj["tier"] = tier
                            vault.append(dna_obj)
                    except: pass
                    
    if not vault and os.path.exists(DNA_VAULT_FILE):
        try:
            with open(DNA_VAULT_FILE, "r", encoding="utf-8") as f:
                vault = json.load(f).get("vault", [])
                for dna in vault:
                    if dna.get("id"):
                        with open(os.path.join(DNA_CORE_DIR, f"{dna['id']}.json"), "w", encoding="utf-8") as wf:
                            json.dump(dna, wf, ensure_ascii=False, indent=2)
        except: pass
        
    return {"vault": sorted(vault, key=lambda x: str(x.get("id") or "")) if vault else []}

@app.get("/api/config/dna_index")
async def get_dna_index():
    """【全息微 Token 索引】只返回基因菜单与摘要，剔除冗余 content"""
    vault_index = []
    for tier in ["core", "dynamic"]:
        tier_dir = os.path.join(DNA_VAULT_DIR, tier)
        if os.path.exists(tier_dir):
            for filename in os.listdir(tier_dir):
                if filename.endswith(".json"):
                    try:
                        with open(os.path.join(tier_dir, filename), "r", encoding="utf-8") as f:
                            dna_obj = json.load(f)
                            vault_index.append({
                                "id": dna_obj.get("id"), "name": dna_obj.get("name"),
                                "type": dna_obj.get("type"), "desc": dna_obj.get("desc", "未提供摘要说明"),
                                "tier": tier
                            })
                    except: pass
    return {"index": sorted(vault_index, key=lambda x: str(x.get("id") or ""))}

@app.put("/api/config/dna/{tier}/{dna_id}")
async def update_dna_slice(tier: str, dna_id: str, payload: DnaUpdateModel):
    """【基因覆写与创建】定向修改或创建硬盘中的碎片化基因切片，并同步达尔文矩阵"""
    if tier not in ["core", "dynamic"]:
        raise HTTPException(status_code=400, detail="非法的物理层级")
    
    tier_dir = os.path.join(DNA_VAULT_DIR, tier)
    os.makedirs(tier_dir, exist_ok=True) 
    target_path = os.path.join(tier_dir, f"{dna_id}.json")
    
    try:
        dna_obj = {"id": dna_id, "tier": tier}
        if os.path.exists(target_path):
            with open(target_path, "r", encoding="utf-8") as f:
                dna_obj = json.load(f)
                
        if payload.name is not None: dna_obj["name"] = payload.name
        if payload.desc is not None: dna_obj["desc"] = payload.desc
        if payload.content is not None: dna_obj["content"] = payload.content
        if payload.type is not None: dna_obj["type"] = payload.type
        
        # 💡 厂长专属权限：手动注入配额与权重
        if payload.compute_nodes is not None: dna_obj["compute_nodes"] = payload.compute_nodes
        if payload.buffer_nodes is not None: dna_obj["buffer_nodes"] = payload.buffer_nodes
        if payload.weight is not None: dna_obj["weight"] = payload.weight
        
        with open(target_path, "w", encoding="utf-8") as f:
            json.dump(dna_obj, f, ensure_ascii=False, indent=2)
            
        # ⚡ [绝对核心]：向达尔文向量培养皿发送同步脉冲！防脑裂！
        if HAS_CHROMADB:
            try:
                import engines.vector_db
                engines.vector_db.darwin_matrix.add_or_update_dna(dna_id, dna_obj)
            except Exception as e:
                print(f"⚠️ [VectorDB] 达尔文矩阵同步异常: {e}")
                
        return {"status": "ok", "message": f"基因 {dna_id} 已成功物理落盘并同步至达尔文矩阵"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 🛡️ 物理除障：已为您粉碎冗余的 delete 重影！
@app.delete("/api/config/dna/{tier}/{dna_id}")
async def delete_dna_slice(tier: str, dna_id: str):
    """【物理抹除】从硬盘彻底销毁指定的基因切片，并通告达尔文引擎"""
    if tier not in ["core", "dynamic"]:
        raise HTTPException(status_code=400, detail="非法的物理层级")
    
    target_path = os.path.join(DNA_VAULT_DIR, tier, f"{dna_id}.json")
    if os.path.exists(target_path):
        try:
            os.remove(target_path)
            
            # ⚡ [绝对核心]：从达尔文矩阵中物理抹除该基因序列！
            if HAS_CHROMADB:
                try:
                    import engines.vector_db
                    engines.vector_db.darwin_matrix.punish_and_drop(dna_id, is_fatal=True)
                except Exception as e:
                    print(f"⚠️ [VectorDB] 达尔文矩阵抹除异常: {e}")
                    
            return {"status": "ok"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    raise HTTPException(status_code=404, detail="未找到该基因切片")
    
# =====================================================================
# [区块 9.5] 🚀 核心算力调度与工作流执行 API (V8 活塞引擎)
# =====================================================================
# 💡 [1号安全总监防线：3333端口发射兜底网] 
# 确保 xx.html 传来的复盘请求能无损落入底层 inbox，防 404 熔断！
class DispatchPayload(BaseModel):
    task_id: str = None
    target_node: str = None 
    world: str = "stargate_os"
    prompt: str = ""
    tier: str = "swarm"
    use_tools: bool = True
    domain_role: str = "factory_dev"
    specific_urls: list = []
    injected_dna: list = [] 
    dna_rules: dict = {"stop": 5, "purge": 10}
    is_autopsy_replay: bool = False
    case_id: str = None
    temporary_dna_patch: dict = None

@app.post("/api/dispatch")
async def dispatch_stargate_task(payload: DispatchPayload):
    """【总厂兜底发射井】统筹 3333 端口接收到的所有高维指令与复盘幽灵"""
    ai_services.GLOBAL_STATS.active_tasks += 1
    try:
        task_id = payload.task_id or f"TASK_{int(time.time())}_{uuid.uuid4().hex[:4]}"
        
        # 将 Pydantic 模型转为字典，注入任务流水号
        task_data = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()
        task_data['task_id'] = task_id
        
        # 物理落盘至二厂的共享收件箱！
        inbox_dir = os.path.join(STORAGE_DIR, "inbox")
        os.makedirs(inbox_dir, exist_ok=True)
        target_path = os.path.join(inbox_dir, f"{task_id}.json")
        
        import aiofiles
        async with aiofiles.open(target_path, "w", encoding="utf-8") as f:
            await f.write(json.dumps(task_data, ensure_ascii=False, indent=2))
            
        logging.getLogger(__name__).info(f"📥 [发射井兜底] 成功接管 3333 端口指令，已推入物理磁道: {task_id}")
        return {"status": "dispatched", "task_id": task_id}
    except Exception as e:
        logging.getLogger(__name__).error(f"❌ [发射井兜底] 降维落盘失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        ai_services.GLOBAL_STATS.active_tasks = max(0, ai_services.GLOBAL_STATS.active_tasks - 1)

@app.get("/api/system/status")
def get_system_status():
    return {"status": "ok", "active_tasks": ai_services.GLOBAL_STATS.active_tasks, "comfyui_queue": ai_services.GLOBAL_STATS.comfyui_queue}

@app.post("/api/workflow/execute")
@limiter.limit("15/minute")
async def execute_workflow_node(request: Request, req: WorkflowExecuteReq):
    ai_services.GLOBAL_STATS.active_tasks += 1
    try:
        req_data = req.model_dump() if hasattr(req, "model_dump") else req.dict()
        ai_response_html = await execute_workflow_task(req_data)
        if req.step_title in ["管家交流", "自由交流", "意图判定", "管家内部隐式架构", "AI 一键编排流"]:
            return {"status": "ok", "answer": ai_response_html}
        return {"status": "ok", "answer": f"✅ <b>推演完毕：{req.step_title}</b><br><hr style='border:none; border-top:1px dashed #444; margin:10px 0;'>{ai_response_html}"}
    except Exception as e:
        SystemStats.security_blocks += 1
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        ai_services.GLOBAL_STATS.active_tasks = max(0, ai_services.GLOBAL_STATS.active_tasks - 1)

@app.post("/api/workflow/stream")
@limiter.limit("15/minute")
async def execute_workflow_node_stream(request: Request, req: WorkflowExecuteReq):
    ai_services.GLOBAL_STATS.active_tasks += 1
    
    async def event_generator():
        try:
            req_data = req.model_dump() if hasattr(req, "model_dump") else req.dict()
            async for chunk in execute_workflow_stream(req_data):
                yield f"data: {json.dumps({'chunk': chunk})}\n\n".encode('utf-8')
            
            yield f"data: [DONE]\n\n".encode('utf-8')
        except Exception as e:
            SystemStats.security_blocks += 1
            yield f"data: {json.dumps({'error': str(e)})}\n\n".encode('utf-8')
        finally:
            ai_services.GLOBAL_STATS.active_tasks = max(0, ai_services.GLOBAL_STATS.active_tasks - 1)
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/api/workflow/start_background")
async def start_background_workflow(background_tasks: BackgroundTasks, req: AsyncWorkflowStartReq):
    ai_services.GLOBAL_STATS.active_tasks += 1 
    try:
        _, file_path = get_chat_file_path(req.chat_id)
        if file_path:
            async with chat_file_locks[req.chat_id]:
                with open(file_path, "r", encoding="utf-8") as f: cdata = json.load(f)
                cdata["attached_workflow"] = req.workflow_id
                cdata["pending_nodes"] = req.start_nodes
                cdata["system_status"] = "RUNNING"
                with open(file_path, "w", encoding="utf-8") as f: json.dump(cdata, f, ensure_ascii=False, indent=2)
        background_tasks.add_task(async_workflow_runner, req.chat_id, req.workflow_id, req.start_nodes, req.user_input, req.image_urls)
        return {"status": "ok", "message": "Background cruise engine ignited."}
    except Exception as e:
        ai_services.GLOBAL_STATS.active_tasks = max(0, ai_services.GLOBAL_STATS.active_tasks - 1)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sandbox/task")
async def inject_sandbox_task(request: Request):
    """【机床直连物理落盘】"""
    try:
        task_data = await request.json()
        task_id = task_data.get("task_id", f"auto_task_{int(time.time())}")
        
        shared_inbox_dir = os.path.join(STORAGE_DIR, "inbox")
        os.makedirs(shared_inbox_dir, exist_ok=True)
        
        file_path = os.path.join(shared_inbox_dir, f"{task_id}.json")
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(task_data, f, ensure_ascii=False, indent=2)
            
        return {"status": "ok", "msg": f"图纸已落入共享存储区，等待 Lucky 摆渡！"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class TTSRequest(BaseModel):
    text: str
    voice: str = "zh-CN-YunxiNeural" 
    rate: str = "+0%"
    pitch: str = "+0Hz"

@app.post("/api/tts/generate")
async def generate_tts_audio(payload: TTSRequest):
    """【发声中枢】：将 AI 生成的纯文本压制为微软高保真音频"""
    if edge_tts is None:
        raise HTTPException(status_code=500, detail="发声引擎离线：未安装 edge-tts")
    try:
        clean_text = re.sub(r'<[^>]*>', '', payload.text) 
        clean_text = re.sub(r'```.*?```', '', clean_text, flags=re.DOTALL) 
        clean_text = clean_text.replace('*', '').replace('#', '').strip()
        
        if not clean_text:
            return {"status": "error", "msg": "文本清洗后为空，无需发声"}

        filename = f"tts_voice_{uuid.uuid4().hex[:8]}.mp3"
        file_path = os.path.join(TTS_DIR, filename)

        communicate = edge_tts.Communicate(clean_text, payload.voice, rate=payload.rate, pitch=payload.pitch)
        await communicate.save(file_path)

        return {"status": "success", "url": f"/storage/tts/{filename}"}
    except Exception as e:
        import traceback
        traceback.print_exc() 
        raise HTTPException(status_code=500, detail=f"TTS 声带撕裂: {str(e)}")
        
# =====================================================================
# [区块 10] 💬 全域对话与时空档案寻址引擎 (Chat & Session)
# =====================================================================
async def update_chat_meta_bg(chat_id: str, first_message: str):
    """🤖 入口级 AI 档案管理员（后台异步执行，不阻塞 UI）"""
    clean_msg = re.sub(r'\[.*?\]|【.*?】|你是二厂长.*?代码。|物理图纸.*?代码！', '', first_message, flags=re.DOTALL).strip()
    if not clean_msg: return

    title = clean_msg[:8]
    domain = "综合通用"

    try:
        from ai_services import load_ai_vendors, get_http_client
        vendors = load_ai_vendors()
        if vendors:
            vendor = vendors[0]  
            api_url = vendor.get("url", "").rstrip("/")
            api_key = vendor.get("key", "")
            v_name = vendor.get("name", "")

            if api_url and not api_url.startswith("docker://"):
                sys_prompt = """你是一个全能的私人档案管理员。请阅读用户的首句话，提取其核心意图并输出严格的JSON格式：\n{"title": "小于8个字的极简精炼概括", "domain_id": "必须从以下类别中选一: [生活助手, 知识探索, 工作效率, 创意灵感, 技术开发, 情感交流, 综合通用]"}\n注意：只输出纯JSON，不要带任何Markdown代码块，不要废话！"""
                
                payload = {
                    "model": v_name, 
                    "messages": [{"role": "system", "content": sys_prompt}, {"role": "user", "content": clean_msg[:300]}],
                    "max_tokens": 50, "temperature": 0.2
                }
                
                client = get_http_client()
                endpoint = f"{api_url}/chat/completions" if not api_url.endswith("/completions") else api_url
                resp = await client.post(endpoint, headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}, json=payload, timeout=8.0)
                
                if resp.status_code == 200:
                    ans = resp.json()['choices'][0]['message'].get('content', '').strip()
                    ans = re.sub(r'```json|```', '', ans).strip() 
                    meta = json.loads(ans)
                    title = meta.get("title", title)[:12]
                    domain = meta.get("domain_id", domain)
    except Exception as e:
        print(f"⚠️ [档案管理员] 归档异常，使用备用基础策略: {e}")

    _, file_path = get_chat_file_path(chat_id)
    if file_path:
        async with chat_file_locks[chat_id]:
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                data["title"] = title
                data["domain_id"] = domain
                with open(file_path, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
            except: pass

def get_chat_list():
    chats = []
    if not os.path.exists(DUIHUA_DIR): return chats
    for folder_name in os.listdir(DUIHUA_DIR):
        folder_path = os.path.join(DUIHUA_DIR, folder_name)
        if os.path.isdir(folder_path) and folder_name.isdigit():
            json_files = [f for f in os.listdir(folder_path) if f.endswith(".json")]
            if json_files:
                try:
                    with open(os.path.join(folder_path, json_files[0]), "r", encoding="utf-8") as f:
                        data = json.load(f)
                        chats.append({
                            "id": int(folder_name), 
                            "title": data.get("title", "未命名设计"),
                            "date": data.get("date", ""), 
                            "domain_id": data.get("domain_id", "综合通用"), 
                            "json_name": json_files[0]
                        })
                except: pass
    return sorted(chats, key=lambda x: x["id"])

def get_chat_file_path(chat_id: str):
    chat_id_str = str(chat_id)
    folder_path = os.path.join(TEMP_DUIHUA_DIR if chat_id_str.startswith("temp_") else DUIHUA_DIR, chat_id_str)
    if not os.path.exists(folder_path): return None, None
    json_files = [f for f in os.listdir(folder_path) if f.endswith(".json")]
    if not json_files: return folder_path, None
    return folder_path, os.path.join(folder_path, json_files[0])

@app.get("/api/chats")
def list_chats(): return {"status": "ok", "data": get_chat_list()}

@app.post("/api/chats")
def create_chat(chat: ChatCreate, background_tasks: BackgroundTasks):
    date_str = datetime.now().strftime("%Y%m%d")
    
    clean_msg = re.sub(r'\[.*?\]|【.*?】|你是二厂长.*?严禁废话。', '', chat.first_message or "", flags=re.DOTALL).strip()
    fallback_title = clean_msg[:12] + "..." if clean_msg and len(clean_msg) > 12 else (clean_msg or "新档案")
    
    if chat.is_temp:
        new_id = f"temp_{uuid.uuid4().hex[:8]}"
        new_folder = os.path.join(TEMP_DUIHUA_DIR, new_id)
    else:
        chats = get_chat_list()
        new_id = str(1 if not chats else chats[-1]["id"] + 1)
        new_folder = os.path.join(DUIHUA_DIR, new_id)
        
    os.makedirs(new_folder, exist_ok=True)
    json_name = f"{date_str}.json"
    
    new_chat_data = {
        "id": new_id, "title": fallback_title, "date": date_str, "is_temp": chat.is_temp,
        "domain_id": chat.domain_id or "综合通用", 
        "attached_workflow": None, "completed_nodes": [], "pending_nodes": [], "system_status": "IDLE",         
        "messages": [], "session_state": {} 
    }
    
    with open(os.path.join(new_folder, json_name), "w", encoding="utf-8") as f: 
        json.dump(new_chat_data, f, ensure_ascii=False, indent=2)
        
    if chat.first_message:
        background_tasks.add_task(update_chat_meta_bg, new_id, chat.first_message)
        
    return {"status": "ok", "data": new_chat_data}

@app.get("/api/chats/{chat_id}")
async def load_chat(chat_id: str):
    _, file_path = get_chat_file_path(chat_id)
    if not file_path: raise HTTPException(status_code=404)
    try:
        with open(file_path, "r", encoding="utf-8") as f: return {"status": "ok", "data": json.load(f)}
    except Exception as e: raise HTTPException(status_code=500, detail=f"文件读取失败: {str(e)}")

@app.put("/api/chats/{chat_id}")
async def update_chat_title(chat_id: str, chat: ChatCreate):
    _, file_path = get_chat_file_path(chat_id)
    if not file_path: raise HTTPException(status_code=404)
    async with chat_file_locks[chat_id]:
        with open(file_path, "r", encoding="utf-8") as f: data = json.load(f)
        if chat.first_message: data["title"] = chat.first_message 
        with open(file_path, "w", encoding="utf-8") as f: json.dump(data, f, ensure_ascii=False, indent=2)
    return {"status": "ok"}

@app.delete("/api/chats/{chat_id}")
def delete_chat(chat_id: str):
    folder_path, _ = get_chat_file_path(chat_id)
    if folder_path and os.path.exists(folder_path):
        shutil.rmtree(folder_path)
        if chat_id in chat_file_locks: del chat_file_locks[chat_id]
        return {"status": "ok"}
    raise HTTPException(status_code=404)

@app.post("/api/chats/{chat_id}/messages")
async def append_message(chat_id: str, msg: MessageAppend):
    _, file_path = get_chat_file_path(chat_id)
    if not file_path: raise HTTPException(status_code=404)
    
    actual_timestamp = msg.timestamp or datetime.now().isoformat()
    
    async with chat_file_locks[chat_id]:
        try:
            with open(file_path, "r", encoding="utf-8") as f: data = json.load(f)
            data["messages"].append({
                "role": msg.role, 
                "text": msg.text,
                "timestamp": actual_timestamp 
            })
            with open(file_path, "w", encoding="utf-8") as f: json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e: raise HTTPException(status_code=500, detail="写入文件冲突或失败")
    return {"status": "ok"}

@app.post("/api/chats/{chat_id}/session")
async def update_session_state(chat_id: str, state: SessionStateUpdate):
    _, file_path = get_chat_file_path(chat_id)
    if not file_path: raise HTTPException(status_code=404)
    async with chat_file_locks[chat_id]:
        try:
            with open(file_path, "r", encoding="utf-8") as f: data = json.load(f)
            if "session_state" not in data: data["session_state"] = {}
            data["session_state"].update(state.updates)
            with open(file_path, "w", encoding="utf-8") as f: json.dump(data, f, ensure_ascii=False, indent=2)
            return {"status": "ok", "session_state": data["session_state"]}
        except Exception as e: raise HTTPException(status_code=500, detail="写入 Session 冲突")

@app.post("/api/chats/{chat_id}/upload")
async def upload_user_image(chat_id: str, file: UploadFile = File(...)):
    chat_id_str = str(chat_id)
    if chat_id_str.startswith("temp_"):
        folder_path = os.path.join(TEMP_DUIHUA_DIR, chat_id_str)
        web_prefix = f"/storage/temp_duihua/{chat_id_str}"
    else:
        folder_path = os.path.join(DUIHUA_DIR, chat_id_str)
        web_prefix = f"/storage/duihua/{chat_id_str}"
    os.makedirs(folder_path, exist_ok=True)
    
    ext = os.path.splitext(file.filename)[1] or ".jpg"
    new_filename = f"user_upload_{int(time.time())}_{uuid.uuid4().hex[:4]}{ext}"
    file_location = os.path.join(folder_path, new_filename)
    
    with open(file_location, "wb") as f: f.write(await file.read())
    file_url = f"{web_prefix}/{new_filename}"
    return {"status": "ok", "url": file_url}

@app.post("/api/chats/{chat_id}/workflow")
async def update_chat_workflow(chat_id: str, status: WorkflowStatusUpdate):
    _, file_path = get_chat_file_path(chat_id)
    if not file_path: raise HTTPException(status_code=404)
    async with chat_file_locks[chat_id]:
        try:
            with open(file_path, "r", encoding="utf-8") as f: data = json.load(f)
            data["attached_workflow"] = status.workflow_id
            data["completed_nodes"] = status.completed_nodes
            data["pending_nodes"] = status.pending_nodes
            if status.system_status: data["system_status"] = status.system_status
            with open(file_path, "w", encoding="utf-8") as f: json.dump(data, f, ensure_ascii=False, indent=2)
            return {"status": "ok"}
        except Exception as e: raise HTTPException(status_code=500, detail="写入工作流状态冲突")

# 💡 V17 核心升级：时间线回档 (真正的时光机)
class RollbackRequest(BaseModel):
    target_text: str

@app.post("/api/chats/{chat_id}/rollback")
async def rollback_chat(chat_id: str, req: RollbackRequest):
    _, chat_file = get_chat_file_path(chat_id)
    if not chat_file or not os.path.exists(chat_file):
        return {"status": "error", "msg": "找不到该项目的记忆切片"}
        
    with open(chat_file, "r", encoding="utf-8") as f:
        chat_data = json.load(f)
        
    messages = chat_data.get("messages", [])
    target = req.target_text.strip()
    cut_index = -1
    
    for i in range(len(messages)-1, -1, -1):
        msg = messages[i]
        txt = ""
        if msg.get("type") == "user":
            content = msg.get("content", [])
            if content and isinstance(content[0], dict):
                txt = content[0].get("text", "").strip()
        elif msg.get("role") == "user":
            txt = msg.get("text", "").strip()
            
        if txt and (target in txt or txt in target):
            cut_index = i
            break
                    
    if cut_index != -1:
        chat_data["messages"] = messages[:cut_index]
        with open(chat_file, "w", encoding="utf-8") as f:
            json.dump(chat_data, f, ensure_ascii=False, indent=2)
            
    return {"status": "ok", "cut_index": cut_index}


# =====================================================================
# [区块 11] 🖼️ 物理画廊与资产引渡中心 (Gallery)
# =====================================================================
@app.get("/api/gallery")
def get_gallery_assets():
    assets = []
    if not os.path.exists(GALLERY_DIR): return {"status": "ok", "data": assets}
    for filename in os.listdir(GALLERY_DIR):
        if filename.endswith(".json"):
            meta_path = os.path.join(GALLERY_DIR, filename)
            try:
                with open(meta_path, "r", encoding="utf-8") as f: meta_data = json.load(f)
                img_name = filename.replace(".json", ".png")
                img_path = os.path.join(GALLERY_DIR, img_name)
                if os.path.exists(img_path):
                    assets.append({"filename": img_name, "image_url": f"/storage/gallery/{img_name}", "meta": meta_data})
            except Exception: pass
    assets.sort(key=lambda x: x["meta"].get("timestamp", ""), reverse=True)
    return {"status": "ok", "data": assets}

@app.delete("/api/gallery/{filename}")
def delete_gallery_asset(filename: str):
    if not filename.endswith(".png"): raise HTTPException(status_code=400, detail="格式错误")
    img_path = os.path.join(GALLERY_DIR, filename)
    json_path = os.path.join(GALLERY_DIR, filename.replace(".png", ".json"))
    target_domain = "factory_dev"
    if os.path.exists(json_path):
        try:
            with open(json_path, "r", encoding="utf-8") as f: target_domain = json.load(f).get("domain_id", "factory_dev")
        except: pass
    if os.path.exists(img_path): os.remove(img_path)
    if os.path.exists(json_path): os.remove(json_path)
    if HAS_CHROMADB:
        try:
            import engines.vector_db
            engines.vector_db.remove_memory(target_domain, filename)
        except Exception: pass
    return {"status": "ok"}

@app.post("/api/gallery/upload")
async def manual_upload_gallery(file: UploadFile = File(...), domain_id: str = Form("factory_dev"), category: str = Form("未分类"), user_input: str = Form(""), instruction: str = Form("人工录入")):
    ext = os.path.splitext(file.filename)[1] or ".png"
    unique_id = f"{int(time.time())}_{uuid.uuid4().hex[:4]}"
    img_name = f"asset_manual_{unique_id}{ext}"
    img_path = os.path.join(GALLERY_DIR, img_name)
    json_path = os.path.join(GALLERY_DIR, f"asset_manual_{unique_id}.json")

    with open(img_path, "wb") as f: f.write(await file.read())

    timestamp = datetime.now().isoformat()
    meta_data = {
        "type": "manual_upload", "domain_id": domain_id, "category": category, 
        "step_title": "人工知识库注入", "instruction": instruction, "user_input": user_input,
        "vendor": "Admin", "timestamp": timestamp, "weight": 1.5  
    }
    with open(json_path, "w", encoding="utf-8") as f: json.dump(meta_data, f, ensure_ascii=False, indent=2)

    if HAS_CHROMADB and user_input.strip():
        try:
            import engines.vector_db
            engines.vector_db.add_memory(domain_id=domain_id, memory_id=img_name, document=f"分类:{category}。需求:{user_input}", metadata={"category": category, "weight": 1.5, "image_url": f"/storage/gallery/{img_name}", "timestamp": timestamp, "domain_id": domain_id})
        except: pass
    return {"status": "ok", "filename": img_name}

# =====================================================================
# [区块 12] 🧠 向量记忆矩阵管理 API (Vector DB)
# =====================================================================
@app.get("/api/memory/{domain_id}")
async def get_memories(domain_id: str, mem_type: str = "sop"):
    try:
        from engines.vector_db import get_dual_collections
        sop_col, intel_col = get_dual_collections(domain_id)
        target_col = sop_col if mem_type == "sop" else intel_col
        
        if not target_col: 
            return {"status": "error", "msg": "向量集合未初始化"}
        
        results = target_col.get()
        memories = []
        if results and results.get('ids'):
            for i in range(len(results['ids'])):
                memories.append({
                    "id": results['ids'][i],
                    "text": results['documents'][i],
                    "metadata": results['metadatas'][i] if results.get('metadatas') else {}
                })
        return {"status": "ok", "data": memories}
    except Exception as e:
        return {"status": "error", "msg": str(e)}

@app.post("/api/memory/{domain_id}")
async def add_memory(domain_id: str, payload: MemoryPayload):
    try:
        from engines.vector_db import add_memory
        add_memory(domain_id, payload.id, payload.text, {"source": "boss_ui"}, is_intel=(payload.mem_type == 'intel'))
        return {"status": "ok", "msg": "记忆已烙印"}
    except Exception as e:
        return {"status": "error", "msg": str(e)}

@app.delete("/api/memory/{domain_id}/{mem_id}")
async def delete_memory(domain_id: str, mem_id: str, mem_type: str = "sop"):
    try:
        from engines.vector_db import get_dual_collections
        sop_col, intel_col = get_dual_collections(domain_id)
        target_col = sop_col if mem_type == "sop" else intel_col
        target_col.delete(ids=[mem_id])
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "msg": str(e)}
# =====================================================================
# [区块 13] 🌌 星门议会引擎 (Stargate OS & OmniBreath)
# =====================================================================

class AgentRecruitReq(BaseModel):
    agent_id: str
    role: str
    vendor_id: str | None = None
    injected_dna: list = []

@app.post("/api/stargate/agent/recruit")
async def recruit_stargate_agent(req: AgentRecruitReq):
    """【生命体物理档案独立落盘与动态热更 (V28 纯净版)】"""
    agent_dir = os.path.join(DNA_AGENTS_DIR, req.agent_id)
    os.makedirs(agent_dir, exist_ok=True)
    
    profile_path = os.path.join(agent_dir, "profile.json")
    profile_data = {
        "agent_id": req.agent_id, "role": req.role, 
        "vendor_id": req.vendor_id, "injected_dna": req.injected_dna,
        "updated_time": datetime.now().isoformat(), "status": "alive"
    }
    if os.path.exists(profile_path):
        try:
            with open(profile_path, "r", encoding="utf-8") as f:
                profile_data["birth_time"] = json.load(f).get("birth_time", profile_data["updated_time"])
        except: profile_data["birth_time"] = profile_data["updated_time"]
    else:
        profile_data["birth_time"] = profile_data["updated_time"]

    with open(profile_path, "w", encoding="utf-8") as f:
        json.dump(profile_data, f, ensure_ascii=False, indent=2)

    # 🛡️ 强行开辟 50% 永久记忆库！
    permanent_memory_path = os.path.join(agent_dir, "memory.md")
    if not os.path.exists(permanent_memory_path):
        with open(permanent_memory_path, "w", encoding="utf-8") as mf:
            mf.write(f"【{req.role} 的底层永久记忆库】\n---\n这里记录了你在此前所有轮回中不可磨灭的经验与法则。\n\n")
            
    return {"status": "ok", "path": agent_dir, "message": f"Agent {req.agent_id} profile synced"}

class DnaForgeReq(BaseModel):
    prompt: str
    vendor_id: str

@app.post("/api/stargate/dna/forge")
async def forge_stargate_dna(req: DnaForgeReq):
    """【专属创世引擎：动态基石版】"""
    try:
        from ai_services import load_ai_vendors, call_single_ai
        import re
        import uuid
        
        vendors = load_ai_vendors()
        vendor = next((v for v in vendors if str(v.get("id")) == req.vendor_id), None)
        if not vendor: 
            raise HTTPException(status_code=400, detail="未找到指定的算力脑核")

        # 💡 架构解耦：设定兜底神谕，优先由 get_core_system_prompt 从外部控制台动态热加载
        fallback_instruction = """你是一个顶级星门系统架构师。请根据造物主的需求，一次性为AI设计一个完整的【三位一体灵魂图谱】。
要求：
1. 必须且只能输出一个包含 3 个 JSON 对象的数组 (List)。
2. 这3个对象分别代表：认知人格(type:"identity")、工序大纲(type:"sop")、绝对红线(type:"rule")。
3. 每个对象必须包含：id (大写英文下划线), name (简短中文), type, desc (20字以内极简摘要), content (详细约束规则)。
4. 【核心协同机制】：在 'identity' 对象的 content 文本中，必须使用 {{宏变量}} 的语法，将你生成的 'sop' 的 id 和 'rule' 的 id 嵌入进去！例如："你必须遵守 {{SYS_HACKER_RULE}}，执行 {{SYS_HACKER_SOP}}"。
5. 绝对只输出纯 JSON 数组字符串！严禁使用 ```json 标记，严禁附带任何解释文本。"""
        
        # 假设已在同文件全局作用域定义了此动态加载器
        sys_instruction = get_core_system_prompt("SYS_CORE_ARCHITECT", fallback_instruction)
        
        user_input_text = f"【造物主神谕】：\n{req.prompt}\n\n请直接输出合法的 JSON 数组对象。"

        raw_answer_html = await call_single_ai(
            req_vendor_param=vendor, instruction="启动创世推演",
            user_input=user_input_text, deliver_type="text_comm",
            chat_id=f"dna_forge_{uuid.uuid4().hex[:8]}", image_urls=[],
            step_title="创世引擎", custom_prompt=sys_instruction
        )
        
        # 🛡️ 物理防弹衣：强行正则提取 JSON 数组，无视大模型可能附加的废话或 markdown
        clean_answer = re.sub(r'<[^>]*>?', '', raw_answer_html).strip()
        json_match = re.search(r'\[[\s\S]*\]', clean_answer)
        
        if not json_match:
            raise ValueError("算力脑核未能返回标准的 JSON 数组结构。")
            
        return {"status": "ok", "data": json_match.group(0)}
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"创世推演受阻: {str(e)}")

@app.post("/api/stargate/start")
async def start_stargate_meeting(background_tasks: BackgroundTasks, req: StargateMeetingStartReq):
    """【星门启航】厂长下发会议议题，后台切入多智能体轮舞探讨"""
    ai_services.GLOBAL_STATS.active_tasks += 1
    try:
        # 将会议调度器推入后台独立进程，绝不阻塞主线程
        background_tasks.add_task(stargate_meeting_runner, req.meeting_id, req.topic, req.agents_config, req.rounds)
        return {"status": "ok", "message": f"星门 {req.meeting_id} 已开启，各部门 AI 正在入场就座..."}
    except Exception as e:
        ai_services.GLOBAL_STATS.active_tasks = max(0, ai_services.GLOBAL_STATS.active_tasks - 1)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/stargate/abort/{meeting_id}")
async def abort_stargate_meeting(meeting_id: str):
    """【紧急熔断】一键切断指定星门的算力呼吸 (厂长特权)"""
    # 💡 局部引入，绝对杜绝循环导入死锁！
    import ai_services 
    ai_services.GLOBAL_STATS.abort_signals.add(meeting_id)
    return {"status": "ok", "message": f"熔断脉冲已成功发射至星门 {meeting_id}"}

class OmniBreathReq(BaseModel):
    command: str
    current_meeting_id: str | None = None
    vendor_id: str

@app.post("/api/stargate/omni_breath")
async def stargate_omni_breath_router(req: OmniBreathReq, background_tasks: BackgroundTasks):
    """【无界呼吸引擎】听懂人类语言，自动坍缩为深呼吸(重铸)或浅呼吸(微调延续)"""
    try:
        from ai_services import load_ai_vendors, call_single_ai, stargate_meeting_runner, GLOBAL_STATS
        vendors = load_ai_vendors()
        vendor = next((v for v in vendors if str(v.get("id")) == req.vendor_id), vendors[0] if vendors else None)
        if not vendor: raise HTTPException(status_code=400, detail="算力脑核离线")

        router_sys_prompt = """你是一个全域宇宙架构师。请分析造物主的自然语言指令。
判断这是要【摧毁重建/全新议题】(DEEP)，还是要【对现有团队进行微调/施加新规则/延续历史讨论】(SHALLOW)。
要求：
1. 必须输出合法 JSON 对象：{"intent": "DEEP"或"SHALLOW", "reason": "判定理由", "extracted_rule": "如果是浅呼吸，将造物主的话提炼为AI绝对红线指令，深呼吸则为空", "new_topic": "如果是深呼吸，提取出的新会议核心议题"}
2. 绝对只输出纯 JSON，不带 markdown。"""

        router_input = f"【造物主神谕】：{req.command}\n【当前会议状态】：{'存在活跃星门 ' + req.current_meeting_id if req.current_meeting_id else '当前虚空，无活跃会议'}"
        
        raw_intent = await call_single_ai(
            req_vendor_param=vendor, instruction="意图坍缩", user_input=router_input, 
            deliver_type="text_comm", chat_id="omni_router", image_urls=[], step_title="意图嗅探", custom_prompt=router_sys_prompt
        )
        
        intent_json = re.sub(r'<[^>]*>?', '', raw_intent).strip()
        intent_data = json.loads(intent_json)
        intent = intent_data.get("intent", "DEEP")
        
        if intent == "SHALLOW" and req.current_meeting_id:
            # 🌬️ 【浅呼吸：神谕打补丁 + 延续会议】
            new_rule = intent_data.get("extracted_rule", "")
            if new_rule:
                rule_id = f"DYN_RULE_{uuid.uuid4().hex[:6].upper()}"
                rule_obj = {"id": rule_id, "name": "造物主神谕", "type": "rule", "desc": new_rule[:15]+"...", "content": new_rule, "tier": "dynamic"}
                
                tier_dir = os.path.join(DNA_VAULT_DIR, "dynamic")
                os.makedirs(tier_dir, exist_ok=True)
                with open(os.path.join(tier_dir, f"{rule_id}.json"), "w", encoding="utf-8") as f:
                    json.dump(rule_obj, f, ensure_ascii=False, indent=2)
                
                # 穿透寻找当前会议的特工，强行焊入新基因
                meeting_dir = os.path.join(STARGATE_ARCHIVES_DIR, req.current_meeting_id)
                agents_config = []
                if os.path.exists(meeting_dir):
                    for file_name in os.listdir(meeting_dir):
                        if file_name.endswith("_briefcase.md"):
                            aid = file_name.replace("_briefcase.md", "")
                            profile_path = os.path.join(DNA_AGENTS_DIR, aid, "profile.json")
                            if os.path.exists(profile_path):
                                try:
                                    with open(profile_path, "r", encoding="utf-8") as f: p_data = json.load(f)
                                    if rule_id not in p_data.get("injected_dna", []):
                                        p_data.setdefault("injected_dna", []).append(rule_id)
                                    with open(profile_path, "w", encoding="utf-8") as wf: json.dump(p_data, wf, ensure_ascii=False, indent=2)
                                    agents_config.append(p_data)
                                except: pass
                                
                if agents_config:
                    GLOBAL_STATS.active_tasks += 1
                    background_tasks.add_task(stargate_meeting_runner, req.current_meeting_id, f"延续指令：{req.command}", agents_config, 2)
                    return {"status": "ok", "action": "SHALLOW", "message": f"浅呼吸触发：已向全体存活特工注入神谕钢印，星门正重燃。({intent_data.get('reason')})"}
            return {"status": "error", "message": "浅呼吸未能提取有效规则"}

        else:
            # 🫁 【深呼吸：全自动一键创世】
            new_topic = intent_data.get("new_topic", req.command)
            deep_sys = """你是一个全域宇宙架构师。请根据用户的【核心议题】，自动规划出最适合解决该议题的【多智能体团队阵容】（2-3个特工）。
要求：
1. 输出合法 JSON 数组，每个对象代表一个特工：{"role": "角色名", "dnas": [{"id": "全大写下划线", "name": "简短中文", "type": "identity/sop/rule", "desc": "极简摘要", "content": "详细法则，identity必须用{{}}引用同伴的id"}]}
2. 每个特工必须且只能包含 identity, sop, rule 3个基因。绝对只输出纯 JSON 数组！"""
            
            raw_team_html = await call_single_ai(
                req_vendor_param=vendor, instruction="深呼吸创世推演", user_input=f"【议题】：{new_topic}\n请直接输出阵容JSON数组。", 
                deliver_type="text_comm", chat_id="deep_breath_team", image_urls=[], step_title="创世引擎", custom_prompt=deep_sys
            )
            team_data = json.loads(re.sub(r'<[^>]*>?', '', raw_team_html).strip())
                
            agents_config = []
            for agent in team_data:
                aid = f"agent_{uuid.uuid4().hex[:6].upper()}"
                role = agent.get("role", "未知特工")
                injected_dnas = []
                for dna in agent.get("dnas", []):
                    dna_id = dna.get("id", f"DNA_{uuid.uuid4().hex[:6].upper()}")
                    dna.update({"id": dna_id, "tier": "dynamic"})
                    injected_dnas.append(dna_id)
                    tier_dir = os.path.join(DNA_VAULT_DIR, "dynamic")
                    os.makedirs(tier_dir, exist_ok=True)
                    with open(os.path.join(tier_dir, f"{dna_id}.json"), "w", encoding="utf-8") as f: json.dump(dna, f, ensure_ascii=False, indent=2)
                
                agent_dir = os.path.join(DNA_AGENTS_DIR, aid)
                os.makedirs(agent_dir, exist_ok=True)
                profile_data = {"agent_id": aid, "role": role, "vendor_id": req.vendor_id, "injected_dna": injected_dnas, "updated_time": datetime.now().isoformat(), "status": "alive"}
                with open(os.path.join(agent_dir, "profile.json"), "w", encoding="utf-8") as f: json.dump(profile_data, f, ensure_ascii=False, indent=2)
                agents_config.append(profile_data)
                
            meeting_id = f"SG_{uuid.uuid4().hex[:6].upper()}"
            GLOBAL_STATS.active_tasks += 1
            background_tasks.add_task(stargate_meeting_runner, meeting_id, new_topic, agents_config, 3)
            return {"status": "ok", "action": "DEEP", "message": f"深呼吸触发：已自动招募 {len(agents_config)} 名特工并开辟新星门！", "meeting_id": meeting_id}

    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# =====================================================================
# [区块 14] 📂 阿卡什记录馆与微观蜂群档案 (Archives)
# =====================================================================
@app.get("/api/stargate/archives")
def get_stargate_archives():
    """【阿卡什记录馆】拉取所有历史会议快照"""
    archives = []
    if os.path.exists(STARGATE_ARCHIVES_DIR):
        for folder in os.listdir(STARGATE_ARCHIVES_DIR):
            f_path = os.path.join(STARGATE_ARCHIVES_DIR, folder)
            if os.path.isdir(f_path):
                ctime = os.path.getctime(f_path)
                archives.append({
                    "meeting_id": folder,
                    "timestamp": ctime,
                    "date": datetime.fromtimestamp(ctime).strftime("%Y-%m-%d %H:%M:%S")
                })
    return {"status": "ok", "data": sorted(archives, key=lambda x: x["timestamp"], reverse=True)}

@app.get("/api/stargate/archives/{meeting_id}")
def get_stargate_meeting_details(meeting_id: str):
    """【会议纪要查阅】穿透读取特定会议的公共黑板与各 AI 的私有公文包"""
    meeting_dir = os.path.join(STARGATE_ARCHIVES_DIR, meeting_id)
    if not os.path.exists(meeting_dir):
        raise HTTPException(status_code=404, detail="会议档案不存在或已被物理销毁")
        
    details = {"center_board": "", "briefcases": {}}
    
    board_path = os.path.join(meeting_dir, "center_board.md")
    if os.path.exists(board_path):
        with open(board_path, "r", encoding="utf-8") as f:
            details["center_board"] = f.read()
            
    for file_name in os.listdir(meeting_dir):
        if file_name.endswith("_briefcase.md"):
            agent_id = file_name.replace("_briefcase.md", "")
            with open(os.path.join(meeting_dir, file_name), "r", encoding="utf-8") as f:
                details["briefcases"][agent_id] = f.read()
                
    return {"status": "ok", "data": details}

@app.delete("/api/stargate/archives/{meeting_id}")
def delete_stargate_archive(meeting_id: str):
    """【物理抹除】彻底销毁指定会议的所有痕迹"""
    meeting_dir = os.path.join(STARGATE_ARCHIVES_DIR, meeting_id)
    if os.path.exists(meeting_dir):
        shutil.rmtree(meeting_dir)
        return {"status": "ok"}
    raise HTTPException(status_code=404, detail="未找到目标档案")

@app.get("/api/microcosm/history")
def get_microcosm_history():
    today_str = datetime.now().strftime("%Y%m%d")
    file_path = os.path.join(AIDUIHUA_FEED_DIR, f"feed_{today_str}.json")
    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except: pass
    return []

@app.get("/api/microcosm/workers")
def get_microcosm_workers():
    if os.path.exists(WORKERS_REGISTRY_FILE):
        try:
            with open(WORKERS_REGISTRY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except: pass
    return {}

@app.post("/api/microcosm/workers")
def save_microcosm_workers(req: AIWorkerUpdateReq):
    with open(WORKERS_REGISTRY_FILE, "w", encoding="utf-8") as f:
        json.dump(req.workers, f, ensure_ascii=False, indent=2)
    return {"status": "ok"}

@app.post("/api/microcosm/force_thought")
async def force_microcosm_thought(req: dict):
    t_type = req.get("type", "mob")
    ai_data = req.get("aiData")
    if hasattr(ai_services, "generate_inner_thought"):
        asyncio.create_task(ai_services.generate_inner_thought(t_type, ai_data))
    return {"status": "ok", "message": "Force thought dispatched."}

@app.post("/api/microcosm/toggle")
def toggle_microcosm(req: dict):
    global MICROCOSM_ENABLED
    action = req.get("action")
    if action == "start":
        MICROCOSM_ENABLED = True
        return {"status": "ok", "message": "蜂群排队领任务已开启"}
    elif action == "stop":
        MICROCOSM_ENABLED = False
        return {"status": "ok", "message": "已切断所有蜂群排队任务，停止消耗算力"}
    return {"status": "error", "message": "未知指令"}

@app.get("/api/audit/stats")
def get_audit_stats():
    asset_count = 0
    if os.path.exists(GALLERY_DIR):
        asset_count = len([f for f in os.listdir(GALLERY_DIR) if not f.endswith(".json")])
    return {"status": "ok", "assets": asset_count, "blocks": SystemStats.security_blocks}

# =====================================================================
# [区块 15] 📡 基础设施：雷达中继、健康检查与底盘挂载
# =====================================================================
@app.get("/api/radar/stream")
async def proxy_radar_stream():
    """【雷达中继代理】将沙盒 SSE 数据流无损透传至主控前台"""
    target_url = "http://192.168.2.2:8999/stream"
    async def event_generator():
        try:
            async with httpx.AsyncClient(timeout=None) as client:
                async with client.stream("GET", target_url) as response:
                    async for chunk in response.aiter_raw():
                        yield chunk
        except Exception as e:
            SystemStats.security_blocks += 1
            yield f"data: [主脑警告] ❌ 雷达连接断开: {str(e)}\n\n".encode('utf-8')
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/api/health")
def health_check(): return {"status": "ok"}

# =====================================================================
# ⚡ 达尔文结算中心、尸检法医总署与天基 EMP 接收塔
# =====================================================================

# 🩻 尸检太平间与新基因池路径注浆
ERROR_ARCHIVE_DIR = os.path.join(STORAGE_DIR, "Error")
AIDNA_DIR = os.path.join(STORAGE_DIR, "aidna")
os.makedirs(ERROR_ARCHIVE_DIR, exist_ok=True)
os.makedirs(AIDNA_DIR, exist_ok=True)

# 尸检守护进程全局状态
AUTOPSY_DAEMON_STATE = {"enabled": False, "model_id": ""}

# 👇 尸检引擎控制路由
@app.post("/api/audit/autopsy/toggle")
def toggle_autopsy_daemon(req: dict):
    AUTOPSY_DAEMON_STATE["enabled"] = req.get("enabled", False)
    AUTOPSY_DAEMON_STATE["model_id"] = req.get("model_id", "")
    return {"status": "ok", "state": AUTOPSY_DAEMON_STATE}

@app.get("/api/audit/autopsy/reports")
def get_autopsy_reports():
    reports = []
    for year in os.listdir(ERROR_ARCHIVE_DIR):
        year_path = os.path.join(ERROR_ARCHIVE_DIR, year)
        if not os.path.isdir(year_path): continue
        for month in os.listdir(year_path):
            month_path = os.path.join(year_path, month)
            if not os.path.isdir(month_path): continue
            for f in os.listdir(month_path):
                # 💡 核心修复：同时拉取待审批的 report 和已归档的 approved
                if f.endswith("_report.json") or f.endswith("_approved.json"):
                    try:
                        with open(os.path.join(month_path, f), "r", encoding="utf-8") as jf:
                            data = json.load(jf)
                            data["is_approved"] = f.endswith("_approved.json")
                            data["file_name"] = f
                            
                            # 🛡️ [2号防线]：数据降维展平！完美兼容前端 r.proposed_dna.world 的读取
                            if "generations" in data and len(data["generations"]) > 0:
                                latest = data["generations"][-1]
                                if "proposed_dna" not in data: data["proposed_dna"] = {}
                                # 绝对不覆盖 world 等外层属性，只更新内层 dna
                                data["proposed_dna"]["dna"] = latest.get("proposed_dna", {})
                                data["reason"] = latest.get("death_reason", data.get("reason", ""))
                                data["translated_thoughts"] = latest.get("thoughts_dump", "")
                            
                            reports.append(data)
                    except: pass
    return {"status": "ok", "data": sorted(reports, key=lambda x: x.get("timestamp", ""), reverse=True)}

from typing import Optional

class AutopsyRoundPayload(BaseModel):
    case_id: str
    status: str 
    output: str
    thoughts_dump: str
    proposed_dna: Optional[dict] = None  # 🚨 致命修复：沙盒不回传 DNA，必须设为可选！

@app.post("/api/audit/autopsy/append_round")
def append_autopsy_round(payload: AutopsyRoundPayload):
    """【2号独家：沙盒复盘战报接收端】动态追加世代，就地更新病历"""
    report_path = None
    for root, _, files in os.walk(ERROR_ARCHIVE_DIR):
        if f"{payload.case_id}_report.json" in files:
            report_path = os.path.join(root, f"{payload.case_id}_report.json")
            break
            
    if not report_path: raise HTTPException(404, "尸检档案已丢失")
        
    with open(report_path, "r", encoding="utf-8") as f: report_data = json.load(f)
        
    if "generations" not in report_data:
        report_data["generations"] = [{
            "round": 0,
            "death_reason": report_data.get("reason", "初始暴毙"),
            "thoughts_dump": report_data.get("translated_thoughts", "无记录"),
            "proposed_dna": report_data.get("proposed_dna", {}).get("dna", {}) if report_data.get("proposed_dna") else {}
        }]
        
    new_round = len(report_data["generations"])
    
    # 🚨 致命修复：继承上一代的抗体基因
    current_dna = payload.proposed_dna if payload.proposed_dna else report_data["generations"][-1].get("proposed_dna", {})

    report_data["generations"].append({
        "round": new_round,
        "death_reason": "复盘成功存活" if payload.status == "success" else f"复盘再次暴毙: {payload.output[:200]}",
        "thoughts_dump": payload.thoughts_dump,
        "proposed_dna": current_dna
    })
    
    report_data["status"] = "pending_test" if payload.status == "success" else "test_failed"
    
    with open(report_path, "w", encoding="utf-8") as f: json.dump(report_data, f, ensure_ascii=False, indent=2)
    return {"status": "success", "round": new_round}

@app.post("/api/audit/autopsy/approve/{task_id}")
def approve_autopsy_dna(task_id: str):
    """【2号独家：绝对裁决】校验沙盒存活状态，提取最新抗体入库"""
    report_path = None
    for root, _, files in os.walk(ERROR_ARCHIVE_DIR):
        if f"{task_id}_report.json" in files:
            report_path = os.path.join(root, f"{task_id}_report.json")
            break
    if not report_path: raise HTTPException(404, "尸检报告不存在或已审批入库")
    
    with open(report_path, "r", encoding="utf-8") as f: report_data = json.load(f)
    
    # 🛡️ 强制存活校验防线
    generations = report_data.get("generations", [])
    if not generations:
        raise HTTPException(403, "缺乏世代复盘数据，禁止盲目入库！请先送入沙盒执行抗体测试。")
        
    latest_gen = generations[-1]
    if latest_gen.get("death_reason") != "复盘成功存活":
        raise HTTPException(403, f"🚨 拒绝入库！最新抗体补丁 (Round {latest_gen.get('round')}) 未通过测试。死因：{latest_gen.get('death_reason')}")
        
    dna_core = latest_gen.get("proposed_dna")
    if not dna_core or not dna_core.get("content"):
        raise HTTPException(400, "最新世代中未提取到有效的 DNA 序列。")
        
    # 复用原本的归类与提取逻辑，保障老生态
    category = "qita"
    if report_data.get("proposed_dna") and report_data["proposed_dna"].get("category_pinyin"):
        category = report_data["proposed_dna"]["category_pinyin"]
        
    cat_dir = os.path.join(AIDNA_DIR, category)
    os.makedirs(cat_dir, exist_ok=True)
    
    dna_id = dna_core.get("id", f"DNA_{uuid.uuid4().hex[:6].upper()}")
    dna_core["id"] = dna_id
    
    # 注入达尔文存活初始属性
    dna_core.setdefault("weight", 50)
    dna_core.setdefault("compute_nodes", 15)
    dna_core.setdefault("buffer_nodes", 5)
    dna_core.setdefault("success_count", 0)
    dna_core.setdefault("death_count", 0)
    
    with open(os.path.join(cat_dir, f"{dna_id}.json"), "w", encoding="utf-8") as f:
        json.dump(dna_core, f, ensure_ascii=False, indent=2)
        
    tier = dna_core.get("tier", "dynamic")
    target_vault = os.path.join(DNA_VAULT_DIR, tier)
    os.makedirs(target_vault, exist_ok=True)
    with open(os.path.join(target_vault, f"{dna_id}.json"), "w", encoding="utf-8") as f:
        json.dump(dna_core, f, ensure_ascii=False, indent=2)
        
    # 盖章归档
    report_data["is_approved"] = True
    report_data["generated_dna_id"] = dna_id
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report_data, f, ensure_ascii=False, indent=2)
        
    os.rename(report_path, report_path.replace("_report.json", "_approved.json"))
    return {"status": "ok", "message": "处方DNA已入库，病历已归档！"}

@app.delete("/api/audit/autopsy/reports/{file_name}")
def delete_autopsy_report(file_name: str):
    """【厂长特权】手动销毁无价值的垃圾处方档案"""
    for root, _, files in os.walk(ERROR_ARCHIVE_DIR):
        if file_name in files:
            os.remove(os.path.join(root, file_name))
            return {"status": "ok"}
    raise HTTPException(404, "文件不存在")

# 👇 达尔文生死结算 API
class DnaEvolutionReq(BaseModel):
    dna_ids: list[str]
    is_success: bool
    nodes_consumed: int

@app.post("/api/config/dna/evolve")
async def evolve_dna_matrix(req: DnaEvolutionReq):
    """⚔️ 达尔文算力引擎：生死结算，优胜劣汰"""
    evolution_logs = []
    
    for dna_id in req.dna_ids:
        target_path = None
        for tier in ["core", "dynamic"]:
            p = os.path.join(DNA_VAULT_DIR, tier, f"{dna_id}.json")
            if os.path.exists(p):
                target_path = p
                break
                
        if not target_path: continue
        
        try:
            with open(target_path, "r", encoding="utf-8") as f:
                dna = json.load(f)
                
            dna.setdefault("success_count", 0)
            dna.setdefault("death_count", 0)
            dna.setdefault("weight", 50)
            dna.setdefault("compute_nodes", 15)
            dna.setdefault("buffer_nodes", 5)
            
            old_weight = dna["weight"]
            
            if req.is_success:
                dna["success_count"] += 1
                dna["weight"] += 2  
                if req.nodes_consumed < dna["compute_nodes"]:
                    dna["compute_nodes"] = max(5, dna["compute_nodes"] - 1)
            else:
                dna["death_count"] += 1
                dna["weight"] -= 5  
                if req.nodes_consumed >= (dna["compute_nodes"] + dna["buffer_nodes"]):
                    dna["buffer_nodes"] += 3
                    
            dna["weight"] = max(0, min(100, dna["weight"]))
            
            with open(target_path, "w", encoding="utf-8") as f:
                json.dump(dna, f, ensure_ascii=False, indent=2)
                
            evolution_logs.append(f"{dna_id}: W({old_weight}->{dna['weight']}) N({dna['compute_nodes']})")
        except Exception: pass
        
    if evolution_logs:
        print(f"🧬 [达尔文引擎] 基因图谱进化: {', '.join(evolution_logs)}")
        
    return {"status": "ok", "logs": evolution_logs}

# 👇 升级版天基 EMP：真·内存级物理斩杀与尸检分流
@app.get("/api/stargate/emp_strike")
async def trigger_emp_strike(task_id: str, background_tasks: BackgroundTasks):
    """⚡ 天基 EMP 2.0 (Necromancer Purge)：内存级进程斩杀！"""
    import logging
    logger = logging.getLogger("uvicorn.error")
    destroyed = 0
    
    logger.error(f"🛰️ [天基雷达] 接收到 Necromancer 故障公民，目标: {task_id}")

    # 💡 [真·物理斩杀]：直接调用 ai_services 中保存的进程指针进行 kill！绝对有效！
    import ai_services
    if hasattr(ai_services, "GLOBAL_PROCESSES") and task_id in ai_services.GLOBAL_PROCESSES:
        try:
            ai_services.GLOBAL_PROCESSES[task_id].kill()
            logger.error(f"🎯 [精确制导] 已拔掉 {task_id} 的物理电源 (SIGKILL)！")
            destroyed += 1
            del ai_services.GLOBAL_PROCESSES[task_id]
        except Exception as e:
            logger.error(f"❌ 拔除电源失败: {e}")

    # 🔬 异常诊断拦截与资源释放分流
    # 💡 核心修复：拔除硬编码死链接，动态寻址当前任务的物理切片
    folder_path, target_file = get_chat_file_path(task_id)
    
    if target_file and os.path.exists(target_file):
        try:
            if AUTOPSY_DAEMON_STATE["enabled"] and AUTOPSY_DAEMON_STATE["model_id"]:
                ym_folder = os.path.join(ERROR_ARCHIVE_DIR, str(datetime.now().year), str(datetime.now().month))
                os.makedirs(ym_folder, exist_ok=True)
                # 将 _corpse 降维修改为 _trace (追溯快照)
                trace_path = os.path.join(ym_folder, f"{task_id}_trace.json")
                shutil.move(target_file, trace_path)
                
                background_tasks.add_task(ai_services.run_autopsy_distillation, trace_path, task_id, AUTOPSY_DAEMON_STATE["model_id"], ym_folder)
                logger.warning(f"🔬 [诊断引擎] 异常任务 {task_id} 已平稳隔离至分析区，启动深度溯源...")
            else:
                os.remove(target_file)
            logger.warning(f"♻️ [资源回收] 成功释放异常节点状态缓存: {target_file}")
        except Exception: pass
        
    # 返回状态由 necromancer_purged 净化为 anomaly_cleared
    return {"status": "anomaly_cleared", "processes_destroyed": destroyed}

# ⚠️ 必须放在文件最底部：挂载静态文件与兜底路由
app.mount("/storage", StaticFiles(directory=STORAGE_DIR), name="storage")

# 💡 V3.1 防宕机补丁：确保目录存在后再挂载，防止 RuntimeError
WORKSPACE_DIR = "/app/workspace"
os.makedirs(WORKSPACE_DIR, exist_ok=True)
app.mount("/workspace", StaticFiles(directory=WORKSPACE_DIR), name="workspace")

# ⚠️ 根目录挂载必须在所有路由定义的最后！否则会拦截 API 请求！
if os.path.exists(os.path.join(WEBROOT_DIR, "index.html")):
    app.mount("/", StaticFiles(directory=WEBROOT_DIR, html=True), name="webroot")

@app.exception_handler(404)
async def custom_404_handler(_, __):
    index_path = os.path.join(WEBROOT_DIR, "index.html")
    if os.path.exists(index_path): return FileResponse(index_path)
    return JSONResponse(status_code=404, content={"error": "Frontend missing. 请确认前端打包文件已注入 webroot。"})

# ==================== 大动脉缝合完毕 ====================