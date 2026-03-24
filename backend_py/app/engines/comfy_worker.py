import os
import json
import httpx
import asyncio
import ai_services  # 延迟导入主路由以复用基础函数

MAX_COMFYUI_CONCURRENCY = 1

_comfyui_task_queue = None
_comfyui_semaphore = None

def get_queue():
    global _comfyui_task_queue
    if _comfyui_task_queue is None:
        _comfyui_task_queue = asyncio.Queue()
    return _comfyui_task_queue

def get_semaphore():
    global _comfyui_semaphore
    if _comfyui_semaphore is None:
        _comfyui_semaphore = asyncio.Semaphore(MAX_COMFYUI_CONCURRENCY)
    return _comfyui_semaphore

async def clear_stuck_queue():
    """熔断机制：一键清空堆积任务"""
    queue = get_queue()
    cleared_count = 0
    while not queue.empty():
        try:
            task_data = queue.get_nowait()
            if not task_data["future"].done():
                task_data["future"].set_result(
                    "<span style='color:#ffb74d;'>⚠️ [系统保护] 渲染引擎发生显存溢出正在重启，您的生图任务已被自动中止。</span>"
                )
            queue.task_done()
            cleared_count += 1
        except asyncio.QueueEmpty:
            break
    print(f"🧹 [Queue] 熔断机制生效：已清理 {cleared_count} 个积压的生图/VR任务。")

async def process_comfyui_task(task_data: dict):
    comfy_url = task_data["api_url"]
    input_img_local_path = task_data["input_img_local_path"]
    chat_id = task_data["chat_id"]
    future = task_data["future"] 
    meta_data = task_data.get("meta_data", {}) 
    
    print(f"⚙️ [Worker] 后勤工兵开始处理渲染任务: {chat_id}")
    client = ai_services.get_http_client()
    
    try:
        # 1. 上传参考图到 ComfyUI
        with open(input_img_local_path, "rb") as f:
            upload_res = await client.post(f"{comfy_url}/upload/image", files={"image": f}, timeout=30.0)
            upload_res.raise_for_status()
            uploaded_img_name = upload_res.json()["name"]

        # 2. 读取并修改工作流
        pano_api_file = os.path.join(ai_services.CONFIG_DIR, "api_pano_prompt.json")
        if not os.path.exists(pano_api_file):
            future.set_result("<span style='color:#ff6b6b;'>[ComfyUI] 致命错误：缺失底层 VR 工作流配置文件 (api_pano_prompt.json)。</span>")
            return

        with open(pano_api_file, "r", encoding="utf-8") as f:
            prompt_workflow = json.load(f)
        
        # 挂载刚上传的图片
        prompt_workflow["1"]["inputs"]["image"] = uploaded_img_name
        
        # 3. 提交生图请求
        prompt_res = await client.post(f"{comfy_url}/prompt", json={"prompt": prompt_workflow}, timeout=10.0)
        prompt_res.raise_for_status()
        prompt_id = prompt_res.json()["prompt_id"]
        
        # 4. 轮询结果
        out_filename = None
        for _ in range(60): 
            await asyncio.sleep(2)
            history_res = await client.get(f"{comfy_url}/history/{prompt_id}", timeout=5.0)
            history_data = history_res.json()
            if prompt_id in history_data:
                outputs = history_data[prompt_id]["outputs"]
                if "4" in outputs and "images" in outputs["4"]: 
                    out_filename = outputs["4"]["images"][0]["filename"]
                    break
        
        if not out_filename:
            future.set_result("<span style='color:#ff6b6b;'>[ComfyUI] 渲染超时，算力引擎未能在 120 秒内返回 VR 结果。</span>")
            return
            
        # 5. 下载并返回结果
        view_url = f"{comfy_url}/view?filename={out_filename}&type=output"
        local_pano_url = await ai_services.download_and_save_image(view_url, chat_id, "ComfyUI_VR", meta_data)
        clean_pano_path = local_pano_url.replace('/storage/', '')
        
        result_html = (
            f"<div style='margin-top:10px; border:1px solid var(--accent-color); border-radius:8px; overflow:hidden;'>"
            f"  <iframe src='/vr.html?image={clean_pano_path}&chat_id={chat_id}' "
            f"          width='100%' height='350px' frameborder='0' allowfullscreen></iframe>"
            f"  <div style='padding:8px; text-align:center; background:var(--bg-dark); font-size:0.8rem;'>"
            f"    <a href='/vr.html?image={clean_pano_path}&chat_id={chat_id}' target='_blank' style='color:var(--accent-color); text-decoration:none;'>✨ 点击新标签页全屏漫游</a>"
            f"  </div>"
            f"</div>"
        )
        future.set_result(result_html)
        print(f"✅ [Worker] 空间渲染任务圆满完成: {chat_id}")
            
    except httpx.HTTPStatusError as e:
        future.set_result(f"<span style='color:#ff6b6b;'>[ComfyUI] 引擎通讯报错 HTTP {e.response.status_code}，请检查 ComfyUI 是否在线。</span>")
    except Exception as e:
        future.set_result(f"<span style='color:#ff6b6b;'>[ComfyUI] 内部调度异常: {str(e)}</span>")

async def comfyui_worker():
    print("👷 [System] ComfyUI 空间渲染与生图 Worker 已启动，随时待命。")
    queue = get_queue()
    while True:
        task_data = await queue.get()
        try:
            await process_comfyui_task(task_data)
        except Exception as e:
            print(f"❌ [Worker] 处理渲染任务时发生致命错误: {e}")
            if not task_data["future"].done():
                task_data["future"].set_result(f"<span style='color:#ff6b6b;'>[ComfyUI] 渲染队列处理崩溃: {str(e)}</span>")
        finally:
            queue.task_done()