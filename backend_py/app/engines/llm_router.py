import os
import json
import httpx
import logging
import asyncio
import shlex
from core.soul_manager import SoulCore
from skills import get_tools_schema, execute_tool

logger = logging.getLogger(__name__)

# 💡 [奇点战役：引入纳秒级内存穿透缓存，彻底终结高频 I/O 阻塞！]
_config_cache = {}
_config_mtime = 0

def get_api_config():
    """获取最新系统的配置字典 (纳秒级内存缓存版)"""
    global _config_cache, _config_mtime
    config_path = os.path.join(os.getenv("DATA_DIR", "/app/data/config"), "ai_core.json")
    if not os.path.exists(config_path): 
        return {}
    try:
        current_mtime = os.path.getmtime(config_path)
        # 只有当厂长物理修改了文件时，才重新读取硬盘，否则直接从内存光速返回！
        if current_mtime != _config_mtime:
            with open(config_path, "r", encoding="utf-8") as f:
                _config_cache = json.load(f)
            _config_mtime = current_mtime
        return _config_cache
    except Exception as e:
        logger.error(f"读取 AI 配置失败: {e}")
        return _config_cache

def get_vendor_by_id(config, target_id):
    """在分类或平铺列表中找到对应 ID 的模型配置"""
    if "categories" in config:
        for cat in config["categories"]:
            for node in cat.get("nodes", []):
                if str(node.get("id")) == str(target_id):
                    return node
    elif "vendors" in config:
            for v in config["vendors"]:
                if str(v.get("id")) == str(target_id):
                    return v
    return None

# 💡 奇点进化：接收前端 0.html 的 dna_rules，打通多级动态租约
async def _call_model_internal(vendor: dict, tier: str, instruction: str, context_data: str, use_tools: bool, domain_role: str, dna_rules: dict = None):
    """
    【V7.0 真·流式引擎】底层的单一模型调用器 (Async Generator)
    支持 🌐 HTTP SSE 流式解析 与 🌌 Docker stdout 字节级流式穿透
    """
    if dna_rules is None: dna_rules = {}
    
    # ⚖️ 动态生命树：ai.html(机房硬改) > 0.html(总控指派) > 默认10轮
    node_purge = vendor.get("purge_limit")
    global_purge = dna_rules.get("purge")
    active_purge = int(node_purge) if node_purge not in [None, ""] else (int(global_purge) if global_purge not in [None, ""] else 10)
    
    # 💡 根据允许的斩杀轮次，按 "1轮=60秒" 动态分配最大存活时间
    dynamic_timeout = float(active_purge * 60)
    logger.info(f"⏱️ [动态租约] 已为该节点挂载 {dynamic_timeout}s 物理生命锁 (Purge Limit: {active_purge})")
    
    api_url = vendor.get("url", "").rstrip("/")
    api_key = vendor.get("key", "")
    model_name = vendor.get("name", "默认模型")
    is_agentic = vendor.get("is_agentic", False)  
    
    # ==========================================
    # 🌌 Docker 星门流式穿透协议 (字节级截获)
    # ==========================================
    if api_url.startswith("docker://"):
        container_name = api_url.replace("docker://", "")
        logger.info(f"🌌 [StarGate Stream] 启动纯净物理星门流式通道: {container_name}")
        
        msg_parts = []
        if instruction:
            msg_parts.append(f"【节点任务指令】:\n{instruction}")
        if context_data:
            msg_parts.append(f"{context_data}")
            
        full_prompt = "\n\n".join(msg_parts)
        safe_prompt = shlex.quote(full_prompt)
        cmd = f"docker exec {container_name} gemini -p {safe_prompt}"
        
        try:
            process = await asyncio.create_subprocess_shell(
                cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            
            # 💡 核心强化：实时读取容器的 stdout 字节流，加入抗断连机制
            try:
                while True:
                    # 扩大缓冲区块，减少碎片带来的 I/O 压力
                    chunk = await process.stdout.read(64) 
                    if not chunk:
                        break
                    yield chunk.decode('utf-8', errors='replace')
            except Exception as read_e:
                # 捕获 ERR_STREAM_PREMATURE_CLOSE 等异常，不让其抛出中断 SSE
                logger.warning(f"⚠️ [StarGate] 容器流式读取提前结束 (Premature close): {read_e}")
                
            # 🛡️ 舱壁隔离：使用动态租约 (dynamic_timeout) 替代裸奔的 wait()
            try:
                await asyncio.wait_for(process.wait(), timeout=dynamic_timeout)
            except asyncio.TimeoutError:
                try: process.kill() 
                except: pass
                logger.error(f"💀 [算力熔断] 星门容器执行超时 ({dynamic_timeout}s)，已被天基武器物理拔管！")
                yield f"\n\n【系统物理阻断】：星门容器执行超时 ({dynamic_timeout}s 动态租约耗尽)，该僵尸进程已被击毙。"
                return
            
            # 容错处理：如果发生错误且不是简单的提前关闭
            if process.returncode != 0 and process.returncode is not None:
                stderr = await process.stderr.read()
                error_msg = stderr.decode('utf-8', errors='replace').strip()
                
                # 过滤掉无害的凭据加载日志，只暴露真正的错误
                if "ERR_STREAM_PREMATURE_CLOSE" not in error_msg and "Loaded cached credentials" not in error_msg:
                    logger.error(f"星门通讯报错: {error_msg}")
                    yield f"\n\n【CLI 容器执行警告】: {error_msg}"
                
        except Exception as e:
            logger.error(f"❌ 星门调用异常: {str(e)}")
            raise e
        return

    # ==========================================
    # 🌐 标准 HTTP API 流式协议 (Server-Sent Events)
    # ==========================================
    
    if tier == "swarm":
        logger.info(f"🐝 [路由调度] 触发蜂群流式任务 -> 模型: {model_name}")
        temperature = 0.1
        system_prompt = SoulCore.build_swarm_prompt(instruction)
        user_message = f"【待处理数据】:\n{context_data}"
    else:
        logger.info(f"🗡️ [路由调度] 触发刀尖流式任务 -> 模型: {model_name}")
        temperature = 0.8
        system_prompt = SoulCore.build_flagship_prompt(domain_role, instruction)
        user_message = f"【高价值情报或上下文指令】:\n{context_data}"

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    
    payload = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ],
        "temperature": temperature,
        "max_tokens": 3000
    }
    
    endpoint = f"{api_url}/chat/completions" if not api_url.endswith("/completions") else api_url

    # 🛠️ 【工具调用保护分支】
    if use_tools and not is_agentic:
        tools = get_tools_schema()
        if tools:
            logger.info(f"🛠️ [{model_name}] 包含工具挂载，采用防崩溃安全协议...")
            payload["tools"] = tools
            payload["tool_choice"] = "auto"
            payload["stream"] = False
            
            yield "⚡ *[系统底层] 正在连接外部工具池，研判技能决策中...*\n\n"
            
            async with httpx.AsyncClient(timeout=90.0) as client:
                response = await client.post(endpoint, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                message = data['choices'][0]['message']
                
                if message.get("tool_calls"):
                    tool_call = message["tool_calls"][0]
                    t_name = tool_call["function"]["name"]
                    t_args_str = tool_call["function"]["arguments"]
                    yield f"⚡ *[系统底层] 已锁定技能 `[{t_name}]`，正在跨域执行...*\n\n"
                    try:
                        args_dict = json.loads(t_args_str)
                        # 🛡️ 舱壁隔离：动态算力租约管控外部工具耗时
                        result = await asyncio.wait_for(
                            execute_tool(t_name, args_dict, domain_role), 
                            timeout=dynamic_timeout
                        )
                        yield f"【工具 {t_name} 执行结果】:\n{result}"
                    except asyncio.TimeoutError:
                        logger.error(f"💀 [算力熔断] 工具 {t_name} 执行超时 ({dynamic_timeout}s)，已被物理拔管！")
                        yield f"\n\n【系统物理阻断】：\n工具 {t_name} 执行超时 ({dynamic_timeout}s 动态租约耗尽)。特工滥用算力，强制熔断。"
                    except Exception as e:
                        yield f"【系统错误日志】:\n尝试执行工具 {t_name} 时遭遇异常，请检查参数：{str(e)}"
                    return
                else:
                    yield message.get("content", "⚠️ 模型已响应，但未返回任何有效文本。")
                    return

    # 🚀 【纯文本真·流式输出主干道】
    payload["stream"] = True
    
    async with httpx.AsyncClient(timeout=90.0) as client:
        async with client.stream("POST", endpoint, headers=headers, json=payload) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    line_data = line[6:].strip()
                    if line_data == "[DONE]":
                        break
                    if not line_data:
                        continue
                    try:
                        data = json.loads(line_data)
                        delta = data["choices"][0].get("delta", {})
                        if "content" in delta and delta["content"] is not None:
                            yield delta["content"]
                    except Exception:
                        pass 

async def route_task(task_payload: dict):
    """
    【V7.0 全息双轨容灾路由器】 (Async Generator)
    """
    tier = task_payload.get("tier", "swarm")
    instruction = task_payload.get("instruction", "")
    context_data = task_payload.get("context_data", "")
    use_tools = task_payload.get("use_tools", False)
    domain_role = task_payload.get("domain_role", "factory_dev") 
    
    # 💡 从前端 0.html 的任务指派中提取 DNA 法则 (包含 stop/purge)
    dna_rules = task_payload.get("dna_rules", {})
    
    config = get_api_config()
    if not config:
        yield "【系统阻断】：未找到系统 AI 配置文件，请联系厂长。"
        return
        
    # 🧠 1. 动态智能选型
    target_id = None
    if tier == "swarm":
        target_id = config.get("swarm_model_id") or config.get("flash_model_id") or config.get("primary_model_id")
    else:
        target_id = config.get("pro_model_id") or config.get("primary_model_id")

    primary_vendor = get_vendor_by_id(config, target_id) if target_id else None

    if not primary_vendor:
        all_v = []
        if "categories" in config:
            for c in config["categories"]: all_v.extend(c.get("nodes", []))
        elif "vendors" in config: all_v = config["vendors"]
        if all_v: primary_vendor = all_v[0]

    if not primary_vendor:
        yield "【系统阻断】：未在系统中找到可用的 AI 模型配置，请前往调度中心设置。"
        return

    # 🚀 2. 尝试呼叫首发引擎 (轨道 A)
        try:
            # 💡 透传 dna_rules 给底层驱动器
            async for chunk in _call_model_internal(primary_vendor, tier, instruction, context_data, use_tools, domain_role, dna_rules):
                yield chunk
                
        except Exception as e:
            # 🚨 3. 轨道 A 崩溃！触发容灾降级！(轨道 B)
            fallback_id = primary_vendor.get("fallback_id")
            logger.error(f"💥 [路由警报] 轨道 A [{primary_vendor.get('name')}] 失去响应: {e}")
            
            if not fallback_id:
                yield f"\n\n【系统阻断】：首选 AI 模型失去响应，且未配置备用大脑。底层报错: {str(e)}"
                return
                
            fallback_vendor = get_vendor_by_id(config, fallback_id)
            if not fallback_vendor:
                yield f"\n\n【系统阻断】：首选 AI 模型失去响应，且设定的备用大脑 ({fallback_id}) 未找到！"
                return
                
            logger.warning(f"🚑 [容灾启动] 轨道 B：紧急唤醒替补引擎 [{fallback_vendor.get('name')}] 接管任务！")
            yield f"\n\n`[⚠️ 首选引擎断连，已自动降级至备用算力 ({fallback_vendor.get('name')}) 接管...]`\n\n"
            
            try:
                # 💡 透传 dna_rules 给底层驱动器
                async for chunk in _call_model_internal(fallback_vendor, tier, instruction, context_data, use_tools, domain_role, dna_rules):
                    yield chunk
            except Exception as fallback_e:
                yield f"\n\n【灾难性错误】：主干与备用 AI 双轨均告瘫痪，请检查网络或账户余额。底层报错: {str(fallback_e)}"