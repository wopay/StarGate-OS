import os
import asyncio
import random
import json

# ================= 路径配置 =================
DATA_DIR = os.getenv("DATA_DIR", "/app/data")
STORAGE_DIR = os.path.join(DATA_DIR, "storage")
GALLERY_DIR = os.path.join(STORAGE_DIR, "gallery")

# ==========================================
# 🛠️ 核心技能实现区 (Tools Implementation)
# ==========================================

# ----------------- [1. 需求探底与图文引导类] -----------------

async def query_design_styles(vague_keyword: str = "", domain_id: str = "factory_dev") -> str:
    """
    技能 1：【图文+报价】风格灵感探针 (ChromaDB 向量飞轮版)。
    利用多语言嵌入模型，精准命中本地知识库中最符合客户语义的方案。
    （💡 V6.0：加入频道物理隔离）
    """
    print(f"🔍 [Skill] 正在启动频道 [{domain_id}] 内的向量检索, 语义分析词: {vague_keyword}")
    await asyncio.sleep(0.5)
    
    style_db = []
    
    # 💡 核心飞轮逻辑：尝试从 ChromaDB (经 main.py 初始化) 中提取高维特征匹配数据
    import ai_services
    import engines.vector_db
    collection = engines.vector_db.gallery_collection

    if collection and vague_keyword:
        try:
            # 优化一：加上 distances，计算语义距离
            # 优化二：加上 where 过滤器，严格限定在当前频道检索！
            results = collection.query(
                query_texts=[vague_keyword],
                n_results=5,
                where={"domain_id": domain_id},
                include=["metadatas", "distances"]
            )
            
            if results['metadatas'] and len(results['metadatas'][0]) > 0:
                raw_metas = results['metadatas'][0]
                raw_distances = results['distances'][0]
                
                valid_metas = []
                # 🛡️ 核心拦截器：如果距离大于1.2，说明客户的话跟装修完全不搭边，拒绝强行推荐图纸
                DISTANCE_THRESHOLD = 1.2 
                
                for i, meta in enumerate(raw_metas):
                    dist = raw_distances[i]
                    if dist <= DISTANCE_THRESHOLD:
                        valid_metas.append(meta)
                        print(f"🎯 [Skill-RAG Hit] 命中有效图纸，距离: {dist:.4f}")
                    else:
                        print(f"🛡️ [Skill-RAG Miss] 拦截无关检索，距离过大: {dist:.4f}")

                if valid_metas:
                    # 排序算法：人工录入的权重高，排在前面
                    sorted_metas = sorted(valid_metas, key=lambda x: x.get('weight', 1.0), reverse=True)
                    top_3_metas = sorted_metas[:3]

                    for meta in top_3_metas:
                        style_db.append({
                            "提取线索": meta.get("category", "定制设计") + " | " + vague_keyword,
                            "视觉参考图": meta.get("image_url", ""),
                            "核心特点": "【系统深度匹配】这是当前频道知识库中最符合您语义感觉的真实案例。",
                            "提示": "此为频道内沉淀的高阶方案。"
                        })
                    print(f"🎯 [VectorDB] 成功提取 {len(style_db)} 条强相关语义资产。")
                else:
                    print(f"⚠️ [VectorDB] 意图与库内方案偏差过大，拦截成功，将退回兜底。")

        except Exception as e:
            print(f"⚠️ [VectorDB] 检索发生异常，退回传统文件遍历: {e}")

    # 如果没有挂载向量库、没搜到，或者是被阈值拦截了，执行传统文件保底策略（同样加上 domain_id 过滤）
    if not style_db and os.path.exists(GALLERY_DIR):
        try:
            for filename in os.listdir(GALLERY_DIR):
                if filename.endswith(".json"):
                    json_path = os.path.join(GALLERY_DIR, filename)
                    with open(json_path, "r", encoding="utf-8") as f:
                        meta = json.load(f)
                    
                    # 💡 强力拦截：不属于当前频道的资产，坚决跳过！
                    if meta.get("domain_id", "factory_dev") != domain_id:
                        continue
                        
                    img_name = filename.replace(".json", ".png")
                    img_path = os.path.join(GALLERY_DIR, img_name)
                    
                    if os.path.exists(img_path):
                        style_db.append({
                            "提取线索": meta.get("user_input") or meta.get("category", "专属定制设计"),
                            "视觉参考图": f"/storage/gallery/{img_name}",
                            "核心特点": meta.get("instruction", "基于历史顶级渲染案例提取的高质感空间"),
                            "提示": "此为系统沉淀的真实设计案例，具有极高的落地可行性。"
                        })
            if style_db:
                random.shuffle(style_db)
                style_db = style_db[:3]
        except Exception as e:
            pass

    # 如果依然没数据，返回空提示，让大模型自由发挥
    if not style_db:
        print(f"ℹ️ [Skill] 频道 [{domain_id}] 的图库尚无积累。")
        return json.dumps({"系统提示": "当前频道还没有任何图纸资产，请你用纯文字回答，或者引导厂长上传图片。"}, ensure_ascii=False)
    
    # 👇 [神级指令]：强制大模型排版
    instruction_for_ai = (
        "【强制渲染指令】：你现在是一个高级管家。请向厂长展示提取到的这几个图纸方案。\n"
        "在展示时，【绝对必须】使用 HTML <img> 标签来渲染 '视觉参考图'，不要发纯文本链接！\n"
        "图片渲染的 HTML 格式必须严格如下（自带圆角和阴影，极其美观）：\n"
        "<img src='图库里的URL' style='width:100%; max-width:600px; border-radius:12px; margin:10px 0; box-shadow:0 6px 16px rgba(0,0,0,0.3);'/>\n"
        "在每张图片下方，用加粗的文字清晰列出核心特点。"
    )
    
    return json.dumps({
        "AI排版与执行要求": instruction_for_ai,
        "图库匹配结果": style_db
    }, ensure_ascii=False)


# ----------------- [2. 造价与落地核算类] -----------------

async def calculate_budget_estimate(area_sqm: int, style: str) -> str:
    """
    技能 2：精细化装修落地算价器。根据平米和风格，拆解硬装/软装/家电。
    """
    print(f"🧮 [Skill] 正在计算预估落地报价: {area_sqm}平米 - {style}")
    await asyncio.sleep(1)
    
    base_price_per_sqm = 1200 
    if "奢" in style or "高定" in style or "意式" in style:
        base_price_per_sqm = 2800
    elif "侘寂" in style or "法式" in style:
        base_price_per_sqm = 2000
    elif "奶油" in style or "原木" in style:
        base_price_per_sqm = 1500
        
    hard_decor = int(area_sqm * base_price_per_sqm)
    soft_decor = int(hard_decor * 0.6) 
    appliances = int(area_sqm * 400)   
    
    total = hard_decor + soft_decor + appliances
    
    result = {
        "分析条件": f"面积: {area_sqm}㎡, 选定风格: {style}",
        "硬装预估 (含水电/泥瓦/木/油)": f"约 {hard_decor} 元",
        "软装预估 (含定制柜/活动家具/窗帘)": f"约 {soft_decor} 元",
        "家电预估": f"约 {appliances} 元",
        "总计落地预估": f"约 {total} 元",
        "AI沟通建议": "向客户展示这个结构表。如果客户觉得超预算，立刻提供'重软装轻硬装'的平替方案以挽留客户。"
    }
    return json.dumps(result, ensure_ascii=False)


async def search_furniture_price(furniture_name: str, style: str = "") -> str:
    """
    技能 3：全网软装家居查价。
    """
    print(f"🔍 [Skill] 正在全网检索单品价格: {style} {furniture_name}")
    await asyncio.sleep(0.8)
    
    base_price = random.randint(800, 3000)
    if "真皮" in furniture_name or "牛皮" in furniture_name: base_price += 4000
    if "实木" in furniture_name or "黑胡桃" in furniture_name: base_price += 2500
    if "意式" in style or "高定" in style: base_price = int(base_price * 1.5)
    
    low_price = base_price - int(base_price * 0.15)
    high_price = base_price + int(base_price * 0.25)
    
    return json.dumps({
        "商品匹配": f"{style} {furniture_name}".strip(),
        "全网均价预估": f"¥{low_price} - ¥{high_price}",
        "采购建议": "线上厂家直销性价比最高，线下门店可体验但溢价约30%~50%。"
    }, ensure_ascii=False)


async def search_material_info(material_name: str) -> str:
    """
    技能 4：室内硬装建材查档工具。
    """
    print(f"🔍 [Skill] 正在查阅材料知识库: {material_name}")
    await asyncio.sleep(0.5)
    
    material_db = {
        "微水泥": {"优点": "无缝一体、质感高级", "缺点": "造价极高、容易磕碰留痕", "推荐场景": "极简风客餐厅"},
        "岩板": {"优点": "硬度极高、纹理逼真", "缺点": "脆性大易崩角、加工成本高", "推荐场景": "厨房台面、电视背景墙"},
        "木饰面": {"优点": "触感温润、天然质感", "缺点": "不耐潮、环保要求高", "推荐场景": "全屋定制柜门、卧室背景墙"}
    }
    
    info = material_db.get(material_name, {
        "优点": f"具备 {material_name} 常规的物理特性。",
        "缺点": "可能存在一定的环保溢价或施工损耗。",
        "推荐场景": "建议咨询当地全屋定制门店确认。"
    })
    
    return json.dumps({"材料名称": material_name, "详细档案": info}, ensure_ascii=False)


# ----------------- [3. 3D 与实体交付类] -----------------

async def generate_vr_hotspots(scene_description: str, elements: list) -> str:
    """
    技能 5：全景空间热点标记。
    """
    print(f"🎯 [Skill] 正在为全景场景生成 3D 热点坐标: {elements}")
    await asyncio.sleep(1)

    hotspots = []
    for i, el in enumerate(elements):
        hotspots.append({
            "id": f"hotspot_{i}",
            "name": el,
            "yaw": round(random.uniform(-120, 120), 2),
            "pitch": round(random.uniform(-20, 10), 2),
            "icon": "info" 
        })

    return json.dumps({
        "status": "success",
        "message": "已生成 VR 空间热点数据",
        "hotspots": hotspots
    }, ensure_ascii=False)


async def find_local_contractor(city: str, project_type: str) -> str:
    """
    技能 6：落地派单模拟器。打通线下闭环。
    """
    print(f"👷 [Skill] 正在检索 {city} 的 {project_type} 落地资源...")
    await asyncio.sleep(1.5)
    
    contractors = [
        f"【{city}】匠心装饰工程队 - 擅长复杂工艺落地，好评率 98%",
        f"【{city}周围200km】某大型全屋定制代工厂 - 支持 F2C 厂价直供，省去门店差价"
    ]
    
    return json.dumps({
        "检索城市": city,
        "需求类型": project_type,
        "优质资源推荐": contractors,
        "AI行动建议": "向客户展示资源，并主动询问是否需要安排线下量房或寄送材料小样，促成签单。"
    }, ensure_ascii=False)


# ==========================================
# 📜 Schema 注册区
# ==========================================

def get_tools_schema():
    return [
        {
            "type": "function",
            "function": {
                "name": "query_design_styles",
                "description": "【探针工具】当厂长说不清自己想要什么风格，或只给出'温馨'、'高级'等模糊词时，调用此工具检索当前频道的灵感库图纸。",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "vague_keyword": {"type": "string", "description": "厂长原话中的模糊形容词或具象物品描述"}
                    },
                    "required": ["vague_keyword"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "calculate_budget_estimate",
                "description": "当需要给客户规划装修资金，或客户询问'装成这样大概要多少钱'时调用此工具。",
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
                "description": "当需要预估某件【特定单品家具】的落地成本/价格时调用。",
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
                "description": "当需要向客户解释某种室内设计材料的优缺点、适用场景时调用。",
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
                "description": "当生成了 3D/VR 全景场景后，对特定的家具添加交互热点时调用此工具。",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "scene_description": {"type": "string", "description": "场景整体描述"},
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
                "description": "【闭环工具】当客户对设计方案和预算基本满意，有实际落地施工或定制柜打样需求时，调用此工具推荐当地工厂或施工队。",
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


# ==========================================
# ⚡ 调度执行引擎 (Tool Executor)
# ==========================================

# 💡 V6.0 核心：接收透传的 domain_id
async def execute_tool(tool_name: str, tool_args: dict, domain_id: str = "factory_dev") -> str:
    if tool_name == "query_design_styles":
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
        return f"Error: Tool '{tool_name}' not recognized by the system."