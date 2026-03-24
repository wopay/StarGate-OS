import os
import json
import asyncio
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

async def execute_sandbox_command(cmd: str, container_name: str = "sandbox_node_01") -> str:
    """【具身技能】在独立的 Docker 沙盒中执行 Shell 命令"""
    logger.info(f"💻 [数字具身] 正在沙盒 {container_name} 中执行命令...")
    
    # 强制将命令限制在指定的沙盒容器中执行，保护宿主机(NAS)绝对安全
    safe_cmd = f"docker exec {container_name} sh -c '{cmd}'"
    
    try:
        process = await asyncio.create_subprocess_shell(
            safe_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()
        
        output = stdout.decode()
        error = stderr.decode()
        
        result = ""
        if output:
            result += f"【标准输出】:\n{output}\n"
        if error:
            result += f"【错误日志】:\n{error}\n"
            
        # 如果日志太长（比如 npm install），截取头尾，防止 Token 爆炸
        if len(result) > 4000:
            result = result[:2000] + "\n...\n[日志过长已物理折叠]\n...\n" + result[-2000:]
            
        return result if result.strip() else "命令执行成功，终端无输出反馈。"
    except Exception as e:
        return f"【系统错误】：沙盒连接失败或命令崩溃: {str(e)}"


# 👇 核心新增：星门异步任务调度器 (Mode C 双语模式)
async def create_async_task_order(target_domain: str, task_quota: str, execution_prompt: str, specific_urls: list = None) -> str:
    """
    【异步任务分发】主脑向后台 CLI 节点 (VM-2) 下发长耗时数据处理任务。
    这是一个非阻塞调用，写入 JSON 任务单后立即返回，绝不卡死前端。
    """
    logger.info(f"📜 [异步任务调度] 正在创建星门任务单... 目标领域: {target_domain}, 算力额度: {task_quota}")
    
    # 任务单保存在共享目录中 (NAS 星门挂载点)
    tasks_dir = os.path.join(os.getenv("DATA_DIR", "/app/data"), "config", "async_tasks")
    os.makedirs(tasks_dir, exist_ok=True)
    
    task_id = f"task_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    task_payload = {
        "task_id": task_id,
        "target_domain": target_domain,
        "task_quota": task_quota, # low, medium, high
        "execution_prompt": execution_prompt,
        "specific_urls": specific_urls or [],
        "status": "pending",
        "issued_at": datetime.now().isoformat()
    }
    
    task_path = os.path.join(tasks_dir, f"{task_id}.json")
    
    try:
        with open(task_path, "w", encoding="utf-8") as f:
            json.dump(task_payload, f, ensure_ascii=False, indent=2)
            
        # 💡 模式 C：英文定义状态边界，中文阐述下一步要求，强制 AI 输出纯中文
        return (f"[Task Created Successfully]: 异步任务单 `{task_id}` 已成功挂载至星门队列。\n"
                f"[Next Step]: 后台 Worker Agent (CLI 节点) 将以 [{task_quota}] 级别的算力额度独立处理该任务，完成后会自动注入知识库。\n"
                f"[Action Required]: 请立即用简短的中文向厂长汇报任务已转交后台，让厂长无需等待，可以继续安排其他工作。")
    except Exception as e:
        logger.error(f"任务单创建失败: {e}")
        return f"[System Error]: 异步任务单创建失败，存储路径异常: {str(e)}"