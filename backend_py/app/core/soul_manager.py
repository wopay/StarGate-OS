import os
import logging

logger = logging.getLogger(__name__)

# 指向映射到 Docker 内部的配置目录
CONFIG_DIR = os.getenv("DATA_DIR", "/app/data/config")
SOUL_FILE = os.path.join(CONFIG_DIR, "soul.md")

class SoulCore:
    """最高优先级人格铸造引擎 (V12.0 排他性赋权版)"""
    
    @staticmethod
    def get_soul_prompt() -> str:
        """读取全局潜意识钢印"""
        if os.path.exists(SOUL_FILE):
            try:
                with open(SOUL_FILE, "r", encoding="utf-8") as f:
                    content = f.read().strip()
                    if content: return content
            except Exception as e:
                logger.error(f"Error reading soul.md: {e}")
        
        # 兜底：如果没有配置文件，返回一个基础的极客要求
        return "你必须提供极度专业、无废话、直击痛点的回答。禁止使用任何官方客服话术。"

    @staticmethod
    def build_flagship_prompt(domain_sys_prompt: str, instruction: str) -> str:
        """为刀尖模型(GPT-4o/Claude)组装三明治结构的复合 Prompt：支持绝对人格覆盖"""
        
        # 💡 V12.0 核心拦截：检测到 <identity_override>，触发绝对排他模式
        # 彻底抛弃全局 soul.md，100% 忠实于 ai.html 中设定的专属灵魂（比如龙虾创始人）
        if domain_sys_prompt and "<identity_override>" in domain_sys_prompt:
            return f"{domain_sys_prompt}\n\n【执行任务】:\n{instruction}"
            
        # 如果没有覆盖标签，走常规组合模式
        soul_content = SoulCore.get_soul_prompt()
        
        if not domain_sys_prompt or not domain_sys_prompt.strip():
            return f"【最高潜意识钢印 (严格遵守)】:\n{soul_content}\n\n【执行任务】:\n{instruction}"
            
        return (
            f"【最高潜意识钢印 (严格遵守)】:\n{soul_content}\n\n"
            f"【你的领域身份】:\n{domain_sys_prompt}\n\n"
            f"【执行任务】:\n{instruction}"
        )
        
    @staticmethod
    def build_swarm_prompt(instruction: str) -> str:
        """为蜂群模型(Gemini Flash等)组装干活 Prompt (不需要灵魂，只要效率)"""
        return (
            f"你是一个无情的数据处理管道。请严格客观地完成以下数据提取任务，"
            f"绝对不要输出任何问候语或主观评价，如果要求输出JSON则只能输出JSON：\n{instruction}"
        )