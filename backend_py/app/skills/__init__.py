import os
import json
import logging
import subprocess

# 从各个子模块导入工具函数
from .base_web_tools import fetch_and_read_url
from .docker_agent import execute_sandbox_command, create_async_task_order # 👈 包含异步任务签发工具
from .tools_vr import (
    query_design_styles, calculate_budget_estimate, 
    search_furniture_price, search_material_info, 
    generate_vr_hotspots, find_local_contractor
)

logger = logging.getLogger(__name__)

def get_tools_schema():
    """动态获取技能清单 (融合模式 C：中英双语结构化防御)"""
    return [
        # ==========================================
        # 🌟 核心新增：星门异步任务调度 (Async Task Queue)
        # ==========================================
        {
            "type": "function",
            "function": {
                "name": "create_async_task_order",
                "description": "[Async Task Dispatcher] 当你需要耗费大量时间去阅读外部长篇文档、深入抓取项目库或进行深度战略总结时，严禁直接处理，必须调用此工具生成异步任务单交由后台 Worker Agent 执行。",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "target_domain": {
                            "type": "string", 
                            "description": "[Target Domain ID] 知识所属的领域标识，例如 factory_dev, design_vr, geek_sandbox 等。"
                        },
                        "task_quota": {
                            "type": "string",
                            "enum": ["low", "medium", "high"],
                            "description": "[Resource Allocation] 分配给后台 Worker 的算力级别：low (少量/单篇), medium (中等/官方文档), high (极限/全站代码库)。"
                        },
                        "execution_prompt": {
                            "type": "string",
                            "description": "[Extraction Rules] 给后台 CLI 的具体提取与提炼指令，必须直接且明确。"
                        },
                        "specific_urls": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "[Optional URLs] 需查阅的具体 URL 链接数组（如有）。"
                        }
                    },
                    "required": ["target_domain", "task_quota", "execution_prompt"]
                }
            }
        },
        
        # ==========================================
        # 🦾 厂长特批：V44 物理干涉机械臂 (高危原生沙盒)
        # ==========================================
        {
            "type": "function",
            "function": {
                "name": "write_sandbox_file",
                "description": "【高危指令：隐形机械手】在沙盒隔离区生成或覆盖写入物理文件。你的所有文件操作必须限制在 /app/workspace/test_zone/ 目录下。",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "file_path": {"type": "string", "description": "绝对路径，必须以 /app/workspace/test_zone/ 开头，例如 /app/workspace/test_zone/script.py"},
                        "content": {"type": "string", "description": "需要写入的文件源码或纯文本内容"}
                    },
                    "required": ["file_path", "content"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "run_shell_command",
                "description": "【高危指令：系统神经接驳】在物理沙盒中执行 bash 终端命令（如运行 python 脚本、列出目录等）。",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "command": {"type": "string", "description": "需要执行的 bash 命令"}
                    },
                    "required": ["command"]
                }
            }
        },

        # ==========================================
        # 🌐 通用神级技能 (Web & Docker)
        # ==========================================
        {
            "type": "function",
            "function": {
                "name": "fetch_and_read_url",
                "description": "[Web Scraper] 当用户提供网页链接(URL)或要求查阅较短的在线文档、Github代码时，调用此工具抓取网页内容进行阅读。",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "url": {"type": "string", "description": "[Target URL] 需要抓取的 http 或 https 链接"}
                    },
                    "required": ["url"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "execute_sandbox_command",
                "description": "[Embodied Execution] 当用户要求你安装开源项目、配置环境、或者测试某段代码时，调用此工具在独立的 Docker 沙盒中执行 Linux Shell 命令。",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "cmd": {"type": "string", "description": "[Shell Command] 要执行的 Linux Bash/Shell 命令。支持 && 串联。"},
                        "container_name": {"type": "string", "description": "[Target Container] 目标沙盒容器名称，默认为 sandbox_node_01"}
                    },
                    "required": ["cmd"]
                }
            }
        },
        
        # ==========================================
        # 🏠 原有：装修 VR 设计专业能力 (Legacy VR Tools)
        # ==========================================
        {
            "type": "function",
            "function": {
                "name": "query_design_styles",
                "description": "[Style Probe] 【探针工具】当业主说不清自己想要什么风格，或只给出'温馨'、'高级'等模糊词时，必须调用此工具。它会返回带有精美效果图和报价的风格库，让你能用图文并茂的方式引导业主做出决定。",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "vague_keyword": {"type": "string", "description": "客户原话中的模糊形容词或具象物品描述"}
                    },
                    "required": ["vague_keyword"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "calculate_budget_estimate",
                "description": "[Budget Calculator] 当需要给客户规划装修资金，或客户询问'装成这样大概要多少钱'时调用此工具。",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "area_sqm": {"type": "integer", "description": "房屋的建筑面积或套内面积(平方米)"},
                        "style": {"type": "string", "description": "客户确定的装修风格，如'日式原木风'"}
                    },
                    "required": ["area_sqm", "style"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "search_furniture_price",
                "description": "[Price Searcher] 当需要预估某件【特定单品家具】的落地成本/价格时调用。",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "furniture_name": {"type": "string", "description": "家具名称，如'三人位沙发'"},
                        "style": {"type": "string", "description": "家具风格或材质，如'意式极简 真皮'"}
                    },
                    "required": ["furniture_name"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "search_material_info",
                "description": "[Material Knowledge] 当需要向客户解释某种室内设计材料的优缺点、适用场景时调用。",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "material_name": {"type": "string", "description": "材料名称，例如'微水泥'"}
                    },
                    "required": ["material_name"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "generate_vr_hotspots",
                "description": "[VR Hotspot Generator] 当生成了 3D/VR 全景场景后，要求对特定的家具或位置添加交互热点标签时调用此工具。",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "scene_description": {"type": "string", "description": "场景的整体描述信息"},
                        "elements": {"type": "array", "items": {"type": "string"}, "description": "需要贴标签的物品列表，例如 ['主沙发', '茶几']"}
                    },
                    "required": ["scene_description", "elements"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "find_local_contractor",
                "description": "[Contractor Locator] 【闭环工具】当客户对设计方案和预算基本满意，有实际落地施工或定制柜打样需求时，调用此工具推荐当地工厂或施工队。",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "city": {"type": "string", "description": "客户所在的城市，若未知可填'当前城市'"},
                        "project_type": {"type": "string", "description": "工程类型，如'全屋整装'、'全屋定制'"}
                    },
                    "required": ["city", "project_type"]
                }
            }
        }
    ]

# 💡 V6.0：新增 domain_id 传参锚定
async def execute_tool(tool_name: str, tool_args: dict, domain_id: str = "factory_dev") -> str:
    """路由分发执行具体的工具函数 (日志与报错全面简中化)"""
    logger.info(f"🛠️ [技能中枢] 收到工具调用请求: {tool_name} | 所属频道: {domain_id}")
    
    try:
        # 🌟 异步任务签发
        if tool_name == "create_async_task_order":
            return await create_async_task_order(
                # 如果模型没有指定 target_domain，强制绑定当前对话发生的 domain_id
                target_domain=tool_args.get("target_domain", domain_id),
                task_quota=tool_args.get("task_quota", "medium"),
                execution_prompt=tool_args.get("execution_prompt", ""),
                specific_urls=tool_args.get("specific_urls", [])
            )

        # ==========================================
        # 🦾 V44 物理机械臂驱动执行层
        # ==========================================
        elif tool_name == "write_sandbox_file":
            file_path = tool_args.get("file_path", "")
            content = tool_args.get("content", "")
            
            # 🛡️ 厂长级的沙盒绝对防御：物理斩断越权路径！
            if not file_path.startswith("/app/workspace/test_zone/"):
                return "❌ [沙盒熔断] 物理越权拒绝：你的机械手神经已被锁定，只能在 /app/workspace/test_zone/ 范围内活动！"
                
            try:
                os.makedirs(os.path.dirname(file_path), exist_ok=True)
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(content)
                return f"✅ [物理落盘成功] 机械手已完成构造，文件已安全写入: {file_path}"
            except Exception as e:
                return f"❌ [机械手故障] 写入失败，底层报错: {str(e)}"
                
        elif tool_name == "run_shell_command":
            command = tool_args.get("command", "")
            
            # 🛡️ 基础反自毁装甲
            if "rm -rf /" in command.replace(" ", ""):
                return "❌ [沙盒熔断] 核心保护协议已激活，禁止执行自毁主机的指令。"
                
            try:
                # 增加 15 秒超时看门狗，防止特工写出死循环炸服
                res = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=15)
                if res.returncode == 0:
                    return f"✅ [指令执行成功] 终端输出:\n{res.stdout}"
                else:
                    return f"❌ [指令执行报错] 错误代码 {res.returncode}:\n{res.stderr}"
            except subprocess.TimeoutExpired:
                return "❌ [指令超时] 进程卡死，已被沙盒看门狗强行熔断！"
            except Exception as e:
                return f"❌ [终端崩溃] 系统底层拒绝执行: {str(e)}"

        # 🌐 通用网络触手
        elif tool_name == "fetch_and_read_url":
            return await fetch_and_read_url(tool_args.get("url", ""))
            
        # 💻 具身智能沙盒 (Docker 级)
        elif tool_name == "execute_sandbox_command":
            return await execute_sandbox_command(tool_args.get("cmd", ""), tool_args.get("container_name", "sandbox_node_01"))
            
        # 🏠 装修垂直技能
        elif tool_name == "query_design_styles":
            # 💡 强制透传 domain_id 给 ChromaDB 检索器
            return await query_design_styles(tool_args.get("vague_keyword", ""), domain_id)
            
        elif tool_name == "calculate_budget_estimate":
            return await calculate_budget_estimate(
                area_sqm=tool_args.get("area_sqm", 100), 
                style=tool_args.get("style", "现代极简")
            )
            
        elif tool_name == "search_furniture_price":
            return await search_furniture_price(
                furniture_name=tool_args.get("furniture_name", ""), 
                style=tool_args.get("style", "")
            )
            
        elif tool_name == "search_material_info":
            return await search_material_info(tool_args.get("material_name", ""))
            
        elif tool_name == "generate_vr_hotspots":
            return await generate_vr_hotspots(
                scene_description=tool_args.get("scene_description", ""), 
                elements=tool_args.get("elements", [])
            )
            
        elif tool_name == "find_local_contractor":
            return await find_local_contractor(
                city=tool_args.get("city", "未知城市"), 
                project_type=tool_args.get("project_type", "装修")
            )
            
        else:
            logger.warning(f"⚠️ [技能中枢] 收到未知的工具调用指令: {tool_name}")
            return f"【系统阻断】：技能 '{tool_name}' 尚未被系统装载。请通知厂长更新技能库。"
            
    except Exception as e:
        logger.error(f"❌ [技能中枢] 工具 {tool_name} 执行时发生崩溃: {e}")
        return f"【系统错误】：执行工具 {tool_name} 时发生崩溃：{str(e)}\n请根据报错信息尝试自我修复或重新调用。"