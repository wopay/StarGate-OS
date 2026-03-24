<div align="right">
  <strong>English</strong> | <a href="#简体中文">简体中文</a>
</div>

<a id="english"></a>
# 🌌 StarGate-OS: The Core Monolith

**The central nervous system of the Open-StarGate empire.** This repository houses the monolithic architecture that unifies the "Black Light Factory" (Backend Order) and the "StarGate OS" (Frontend Chaos). Engineered for extreme hardware environments—such as 15-year-old x86 nodes without VRAM—it prioritizes structural control and physical micro-manipulation over bloated modern frameworks.

---

## 🗺️ Absolute Domain Architecture (V51.5)

This view represents the unified blueprint of the factory and the StarGate OS.

```text
# ==============================================================================
# 🌌 StarGate OS Black Light Factory / V51.5 The Absolute Gateway & Matrix
# 🎯 Container Codename: stargate_factory_0 | Core Drive: API/CLI Dual-State Engine
# ==============================================================================
stargate_factory_0/
├── docker-compose.yml       // 🛠️ Infrastructure: The Star Destroyer's launch baton, mounting FnOS volumes and bridging Docker host underlayer communication.
├── Dockerfile               // 🛠️ Physical Mold: Extreme accelerated build based on Python 3.10.
├── requirements.txt         // 🛠️ Engine Dependencies: Clean, redundant-free Python dependency list.
├── workspace/               // ⚡ Runtime Sandbox Workshop: Anti-crash physical mount point. High-speed buffer for LLM code interpreter and CLI physical terminal cross-end I/O.
│
├── app/                     // 🧠 Backend Business Core (V51.5 Full-Blood Reforged Microservice Cluster)
│   ├── main.py              // 🌐 Pure Gateway: [V50 Core Reforge] Atomic blue-green deployment, streaming to disk, traceless GC, immune to concurrency deadlocks and RAM overflow.
│   │
│   ├── api_caliper.py       // 🏥 Cyber-Clinic: Dynamic examiner, Triage AI auto-routing, and Akashic timeline system (test.html backend).
│   ├── api_ouroboros.py     // 🐍 Core Stripping: Ouroboros self-check, deadlock blocking, and DNA targeted patch hot-update routing.
│   ├── api_media.py         // 🔊 Vocal Organ: [V47 New] MS Edge-TTS generation, stream slicing, and old audio auto-cleanup.
│   ├── api_memory.py        // 🧠 Memory Center: Historical dialogue I/O, physical truncation, CRUD, and vector crystallization persistence.
│   ├── api_assets.py        // 📥 Intake Workshop: File upload, MD5 validation, and alchemy furnace parsing/dispatch.
│   │
│   ├── ai_services.py       // ⚡ Main Artery: Minimalist LLM bus, Token watchdog circuit breaker.
│   ├── stargate_os.py       // 🌌 StarGate Kernel: Multi-Agent Swarm independent scheduler and left/right-brain roundtable engine.
│   ├── document_parser.py   // 📄 Alchemy Node: Violent document shredding and holographic preview.
│   │
│   ├── core/                // ⚙️ Core Foundation (Physical Isolation Zone)
│   │   ├── sandbox_worker.py// 🦾 Physical Embodied Cabin: [V51.5 Purified] Anomaly diagnosis and smooth release protocol, eradicating sensitive word block hazards.
│   │   ├── system_state.py  // 🛡️ Global Chassis: Global stats, async locks, session memory, and tactical radar (SSE) cross-module push.
│   │   ├── dna_compiler.py  // 🧬 DNA Machine Tool: Prompt ultimate assembler with 5s TTL memory cache and Macro mapping.
│   │   └── soul_manager.py  // 👁️ Subconscious Engine: Reads and forcefully overrides highest execution directives (supports exclusive personalities).
│   │
│   ├── engines/             // 🚀 Macro-Scheduling Engine Layer
│   │   ├── workflow_engine.py// 🕸️ Topology Scheduler: DAG workflow async execution, space-time rollback (QA reject), and UI approval cards.
│   │   ├── llm_router.py    // 🛤️ Dual-Track Compute Route: API neural route & CLI physical route; auto-degrades on main channel crash.
│   │   ├── vector_db.py     // 📚 Vector Engine: Self-contained ChromaDB lifecycle and dual-core divide-and-conquer management.
│   │   └── comfy_worker.py  // 🎨 Async Painter: Connects to ComfyUI for spatial rendering dispatch, with VRAM fuse protection.
│   │
│   ├── skills/              // 🐙 Embodied Tentacle Cluster (Toolchain)
│   │   ├── __init__.py      // ⚡ Tentacle Hub: Coordinates capability calls and dynamic routing, mounted with high-risk physical arms.
│   │   ├── docker_agent.py  // 💻 Sandbox Direct Terminal: Executes host commands and async long-running task dispatches.
│   │   ├── base_web_tools.py// 🕸️ Web Crawler: Ad-stripped DOM tree purification.
│   │   └── tools_vr.py      // 🎯 Spatial Rendering Core Skill: Panoramic hotspot generation and design style semantic retrieval.
│   │
│   └── tasks/               // ⏱️ Automated Micro-Scheduling
│       └── night_scheduler.py// 🌙 Black Light Factory Night Shift: Dark web night shift, auto-dispatch, land reclamation, and morning report delivery.
│
├── config/                  // 🔴 System Factory Config (Read-only Foundation/Presets)
│   ├── ai_core.json         // 💻 Compute Matrix: Records all API & CLI physical machine architectures and physical locks.
│   ├── workflows.json       // 🕸️ Topology Blueprint: Solidified automated pipeline node connection graph, DAG save file.
│   ├── soul.md              // 🧠 Subconscious Foundation: The highest global personality rule dictionary personally set by the Overseer.
│   ├── microcosm_state.json // ⏱️ State Snapshot: Black Light Factory background heartbeat timestamp and state archive.
│   ├── microcosm_workers.json// 📇 Personnel Files: Mounted async agents' heartbeat frequencies and identity parameters.
│   └── models/              // 🗃️ Offline Brain Core Models: Local vector LLMs, supporting physical acceleration in disconnected environments.
│
├── storage/                 // 💾 Global Digital Assets & Dynamic Life Vault (NAS / Local Mount)
│   ├── duihua/              // 💬 Precipitated Memory: Solidified standard dialogue record folders.
│   ├── temp_duihua/         // 💨 Burn-After-Reading: Temporary folder for alchemy furnace and dynamic sandbox (blast shield).
│   ├── gallery/             // 🖼️ Asset Gallery: Physical landing zone for generated images, docs, and multimedia assets.
│   ├── tts/                 // 🔊 Independent Vocal Zone: Edge-TTS stream pronunciation mp3 temp zone.
│   ├── inbox/               // 📥 Physical Drop Pod: Direct physical landing zone for external task injection and shuttle docking.
│   ├── vectordb/            // 🧠 Vector Cognitive Engine Array: ChromaDB physical persistence directory.
│   ├── aiduihua/            // 🐝 Swarm Mind Hive: Daily cruise data and memories of micro-world agents.
│   │
│   └── os/                  // 🌌 V51.5 Core Life Field (Dual-Track Physical Isolation Zone)
│       ├── {YY-M}/archives/ // 📜 Space-Time Archives: Monthly dynamically archived StarGate roundtable snapshots.
│       └── dna/             // 🧬 Soul Incubator: Fragmented and reorganized independent gene matrices.
│           ├── vault/       // 🗄️ Global Gene Vault (Strict Dual-Track Physical Isolation)
│           │   ├── core/    // 💎 System Foundation Layer: Creator oracle-level laws; unauthorized access/modification absolutely forbidden.
│           │   └── dynamic/ // ✨ Dynamic Derivative Layer: Agile gene pool for AI collaboration and evolution.
│           └── agents/      // 🤖 Lifeform Matrix: Independent agent directories (includes profile and private memory.md).
│
└── webroot/                 // 🌐 Frontend Interaction & Command Dispatch (Overseer's Horizon)
    ├── index.html           // 🚪 Minimalist Main Deck: 3-in-1 viewport framework, holographic container, anti-mis-touch console.
    ├── 0.html               // 🚀 Global Command Silo: Precise main cannon selection, macro-command dispatch, and holographic monitor.
    ├── ai.html              // 💻 Compute Server Room: Model shell entry, API/CLI dual-state architecture switch panel.
    ├── test.html            // 🏥 Akashic Cyber-Hospital: Live high-pressure test, Triage routing, imprinting, and timeline rollback.
    ├── dna.html             // 🧬 [V51.5 Upgrade] Dynamic Rule Collaboration Desk: Dynamic layer gene reproduction, AI genesis evolution, and Diff space-time save (S/L).
    ├── osdna.html           // 🛠️ [V51.5 Upgrade] Core Foundation System Desk: Core layer creator oracle editing, dual-engine HTTPS downgrade full export, and atomic rollback.
    ├── boss.html            // 🛸 Star Destroyer Panel: Ouroboros swarm self-healing judgment UI, global radar monitoring.
    ├── boss.js              // 🧠 Star Destroyer Mind: Ouroboros independent engine extracting deadlock snapshots and calling forensic rules.
    ├── work.html            // 🏭 Node Workshop: DAG automated pipeline UI drag-and-drop canvas.
    ├── work.js              // ⚙️ Node Assembly Arm: Node wiring, dual-state engine (CLI) highlight assignment, and data encapsulation.
    ├── x.html               // 👁️ Oracle Cabin: StarGate roundtable conference room, multi-agent group chat & debate spectator view.
    ├── xxx.html             // 🚀 StarGate Launchpad: Create agents, combine genes, assign examiners.
    ├── xx.html              // 📜 Historical Archives: Displays snapshots of past StarGate roundtable meetings.
    ├── learn.html           // 🎛️ Neural Tuning: High-order core parameter control and neural imprint updating.
    ├── vr.html              // 🕶️ Panorama Cabin: High-performance 3D panorama showroom and hotspot roaming.
    ├── zuo.html             // 👈 Decoupled Left Wing: Historical tracing and local digital asset sidebar.
    ├── you.html             // 👉 Decoupled Right Wing: Dispatch flow, asset library, and memory mount slice panel.
    ├── app_core.js          // ⚙️ Core Manager: UI global vars, dual-state engine dropdown render, and asset circulation.
    ├── app_chat.js          // 💬 Rendering Core: Stream anti-crash render, Token intercept, streaming TTS vocalization, and control valve.
    ├── app_workflow.js      // ⏳ Space-Time Hourglass: DAG execution engine, background task extradition, and HUD monitor.
    ├── custom_marked.js     // 📽️ Media Cinema: Custom Markdown renderer with built-in gesture lightbox.
    ├── style.css            // 👗 Visual Armor: Global dark minimalist UI theme and responsive layout.
    └── pannellum/           // 🌍 WebGL Chassis: Lightweight panoramic rendering engine underlying dependency.
```

## 🧬 Architectural Topology

### 1. The Darwinian Matrix & DNA Compiler (Backend)
* **JIT DNA Compiler (`dna_compiler.py`)**: Abandons massive static system prompts. Dynamically extracts and assembles fragmented "Thought Imprints" (DNA shards) in O(1) time to construct task-specific contextual prompts, totally eliminating LLM attention decay.
* **The Caliper & Ouroboros Engine (`api_caliper.py` & `api_ouroboros.py`)**: The self-healing loop. When the sandbox detects an execution anomaly, it extracts a snapshot, wakes a diagnostic model to generate a logical patch, and permanently writes it into the dynamic DNA pool. The system rewrites its own operating laws.
* **Atomic Gateway (`main.py`)**: The central hub handling atomic-level streaming, seamless state flushing, and immune to concurrency deadlocks on legacy hardware.

### 2. Visual Downscaling & Native Canvas (Frontend)
* **Streaming State Collapse (`app_chat.js`)**: Intercepts massive LLM entity tags using pure Vanilla JS. Physically shields the UI during high-frequency data streams, collapsing into a stable render only upon payload closure to eradicate DOM flicker.
* **Native DAG Assembly (`work.js`)**: Rejects heavy frontend armors. Uses native SVG cubic Bézier curves for physical node distance calculations and connections, ensuring hundreds of nodes flow smoothly directly at the browser's lowest level.
* **Time-Space Rollback & SSE Radar**: If a node fails validation, the system automatically rolls back to the previous state with error context. Real-time `[MACHINE_SIGNALS]` are pumped via Server-Sent Events (SSE) to drive UI highlights without polling.

---

## 🌌 To the Builders Without Backgrounds (PIONEER_GUIDE)

I am not a software engineer. This entire system was built from the ground up by commanding an AI through pure intuition and logic. If you don't understand the blueprints, **extract the code and interrogate your own AI assistant.** The era of memorizing syntax is over; this is the era of architectural imagination.

**Signal Beacon:** `hkgod@pm.me`

---

## ⚠️ Architect's Disclaimer (Archived)
This repository is a snapshot of an architectural deduction. **I am not a developer.** This project provides ZERO technical support, NO deployment guides, and rejects all Issues/PRs. The codebase is entirely generated by AI under my direction.

<br><br>

---

<div align="right">
  <a href="#english">English</a> | <strong>简体中文</strong>
</div>

<a id="简体中文"></a>
# 🌌 StarGate-OS (星门总厂)：巨型单体中枢

**Open-StarGate 赛博帝国的中枢神经系统。**
本仓库收容了将“黑灯工厂（后端秩序）”与“星门 OS（前端混沌）”高度缝合的巨型单体架构。它专为极端的边缘物理环境（如十五年前无显存的老旧 x86 节点）打造，拒绝臃肿的现代化框架，追求极致的底层架构微操。

---

## 🗺️ 全域绝对领域架构视图 (V51.5)

这是总厂与星门 OS 的统一逻辑图纸。

```text
# ==============================================================================
# 🌌 星门 OS 黑灯工厂 / V51.5 全域绝对领域架构视图 (The Absolute Gateway & Matrix)
# 🎯 容器代号: stargate_factory_0 | 核心驱动: API/CLI 双态共生引擎
# ==============================================================================
stargate_factory_0/
├── docker-compose.yml       // 🛠️ 基础设施：歼星舰起飞的总指挥棒，负责挂载 FnOS 存储卷并打通 Docker 宿主机底层通讯。
├── Dockerfile               // 🛠️ 物理模具：基于 Python 3.10 环境的极致加速构建。
├── requirements.txt         // 🛠️ 引擎依赖：Python 环境依赖清单，干净利落，无冗余。
├── workspace/               // ⚡ 运行时沙盒车间：防宕机物理挂载点。供大模型代码解释器、CLI 物理终端跨端读写的高速缓冲区。
│
├── app/                     // 🧠 后端业务核心 (V51.5 满血重铸微服务算力集群)
│   ├── main.py              // 🌐 纯净总网关：[V50核心重铸] 引入原子级蓝绿部署、流式落盘与无痕垃圾回收，免疫并发锁死与 RAM 溢出。
│   │
│   ├── api_caliper.py       // 🏥 赛博医院：动态主考官、Triage AI 自动分诊与阿卡夏时间线系统 (test.html 支撑库)。
│   ├── api_ouroboros.py     // 🐍 核心剥离：Ouroboros 自检、死锁阻断与 DNA 靶向补丁热更新路由。
│   ├── api_media.py         // 🔊 发声器官：[V47新增] 微软 Edge-TTS 语音生成、流式切割与旧音频自动清理机制。
│   ├── api_memory.py        // 🧠 记忆中枢：历史对话读写、物理截断、CRUD 与向量结晶持久化。
│   ├── api_assets.py        // 📥 进件车间：文件上传、MD5 校验与炼金炉解析派发。
│   │
│   ├── ai_services.py       // ⚡ 通信大动脉：极简 LLM 通信总机、Token 哨兵防破产拉闸枢纽。
│   ├── stargate_os.py       // 🌌 星门内核：Multi-Agent Swarm 独立调度器与左右脑圆桌会议引擎。
│   ├── document_parser.py   // 📄 炼金炉节点：文档暴力粉碎与全息预览。
│   │
│   ├── core/                // ⚙️ 底层核心基石层 (物理隔离区)
│   │   ├── sandbox_worker.py// 🦾 物理具身舱：[V51.5净化] 引入异常诊断与平滑释放协议，拔除敏感词拦截隐患。
│   │   ├── system_state.py  // 🛡️ 全域底盘：管理全局统计、异步锁、会话记忆与战术雷达(SSE)跨模块推送。
│   │   ├── dna_compiler.py  // 🧬 基因机床：自带 5s TTL 内存缓存的 Prompt 终极组装器与宏指令(Macro)映射。
│   │   └── soul_manager.py  // 👁️ 潜意识引擎：读取并强制覆盖最高执行指令（支持排他性人格）。
│   │
│   ├── engines/             // 🚀 宏观调度引擎层
│   │   ├── workflow_engine.py// 🕸️ 拓扑调度器：DAG 工作流异步执行、时空回溯(QA 驳回)与 UI 审批卡片。
│   │   ├── llm_router.py    // 🛤️ 双轨算力路由：API 神经路由与 CLI 物理路由，主通道宕机时自动降级切换。
│   │   ├── vector_db.py     // 📚 向量引擎：自包含的 ChromaDB 生命周期与双核分治管理。
│   │   └── comfy_worker.py  // 🎨 异步画师：对接 ComfyUI 进行空间渲染派发，自带显存熔断保护。
│   │
│   ├── skills/              // 🐙 具身触手集群 (工具链)
│   │   ├── __init__.py      // ⚡ 触手总枢纽：统筹能力调用与动态路由分发，已挂载高危物理机械臂。
│   │   ├── docker_agent.py  // 💻 沙盒直连终端：执行物理宿主机命令与异步长耗时任务派单。
│   │   ├── base_web_tools.py// 🕸️ 网页数据爬取：剥离广告的 DOM 树提纯。
│   │   └── tools_vr.py      // 🎯 空间渲染核心技能：执行全景热点生成与设计风格语义检索。
│   │
│   └── tasks/               // ⏱️ 自动化微观调度
│       └── night_scheduler.py// 🌙 黑灯工厂深夜调度器：暗网夜班，全自动派单、开荒与晨报交付。
│
├── config/                  // 🔴 系统出厂配置 (只读基石/预设)
│   ├── ai_core.json         // 💻 算力矩阵：记录所有 API 与 CLI 物理机床的架构配置与物理锁。
│   ├── workflows.json       // 🕸️ 拓扑蓝图：固化的自动化流水线节点连接图谱，DAG 存档。
│   ├── soul.md              // 🧠 潜意识基石：厂长亲自制定的最高全局人格规则字典。
│   ├── microcosm_state.json // ⏱️ 状态快照：黑灯工厂后台运行心跳时间戳与状态存档。
│   ├── microcosm_workers.json// 📇 人事档案：挂载的异步特工心跳频率与身份参数。
│   └── models/              // 🗃️ 离线脑核模型区：存放本地部署的向量大模型，支持断网环境物理加速。
│
├── storage/                 // 💾 全域数字资产与动态生命存储卷 (挂载至 NAS / 本地)
│   ├── duihua/              // 💬 沉淀记忆：已固化的标准对话记录文件夹。
│   ├── temp_duihua/         // 💨 阅后即焚：临时炼金炉、动态沙盒的临时文件夹 (防爆盾)。
│   ├── gallery/             // 🖼️ 资产画廊：生成图片、文档及多媒体资产的物理落盘区。
│   ├── tts/                 // 🔊 独立发声区：Edge-TTS 流式发音的 mp3 暂存区。
│   ├── inbox/               // 📥 物理投递舱：机床直连物理落盘区，用于外部任务极简注入与摆渡车接驳。
│   ├── vectordb/            // 🧠 向量认知引擎阵列：ChromaDB 物理持久化目录。
│   ├── aiduihua/            // 🐝 蜂群心智母巢：存放微观世界智能体的日常巡航数据与记忆。
│   │
│   └── os/                  // 🌌 V51.5 核心生命场 (双轨物理隔离特区)
│       ├── {YY-M}/archives/ // 📜 时空记录馆：按月动态归档的星门圆桌快照。
│       └── dna/             // 🧬 灵魂培养皿：打碎重组的独立基因矩阵。
│           ├── vault/       // 🗄️ 全域基因库 (严格执行双轨物理隔离)
│           │   ├── core/    // 💎 系统基石层：造物主神谕级法则，禁绝越权访问与修改。
│           │   └── dynamic/ // ✨ 动态衍生层：供 AI 协作与演化的敏捷基因池。
│           └── agents/      // 🤖 生命体矩阵：独立特工目录 (包含 profile 与私有 memory.md)。
│
└── webroot/                 // 🌐 前端交互与指挥调度 (厂长视界)
    ├── index.html           // 🚪 极简大盘：三位一体视窗框架，自带全息投影容器，防误触操作台。
    ├── 0.html               // 🚀 全域指挥发射井：精准主炮选择，宏观指令分发与全息监控器。
    ├── ai.html              // 💻 算力机房：模型躯壳录入，API / CLI 双态架构切换面板。
    ├── test.html            // 🏥 阿卡夏赛博医院：活体高压压测，Triage 分诊，打钢印与时间线回档。
    ├── dna.html             // 🧬 [V51.5升级] 动态规则协作台：负责 Dynamic 层基因繁衍、AI创世演化与 Diff 时空存档 (S/L)。
    ├── osdna.html           // 🛠️ [V51.5升级] 核心基石系统台：负责 Core 层造物神谕编辑、双擎 HTTPS 降级全量导出与原子回溯。
    ├── boss.html            // 🛸 歼星舰面板：Ouroboros 蜂群自愈研判 UI，全域雷达监听。
    ├── boss.js              // 🧠 歼星舰心智：Ouroboros 提取死锁快照、调用法医重铸法则的独立引擎。
    ├── work.html            // 🏭 节点车间：DAG 自动化流水线 UI 拖拽画布。
    ├── work.js              // ⚙️ 节点装配臂：负责节点连线、双态引擎(CLI)的高亮指派与数据封装。
    ├── x.html               // 👁️ 神谕舱：星门圆桌会议室，多特工群聊与辩论观战仪。
    ├── xxx.html             // 🚀 星门发车台：创建特工，组合基因，指定考官。
    ├── xx.html              // 📜 历史档案馆：展示星门历次圆桌会议的快照列表。
    ├── learn.html           // 🎛️ 神经调优：高阶核心参数控制及神经钢印更新。
    ├── vr.html              // 🕶️ 全景舱：高性能 3D 全景样板间与热点漫游。
    ├── zuo.html             // 👈 解耦左翼：历史溯源与本地数字资产侧边栏。
    ├── you.html             // 👉 解耦右翼：调度流、素材库与记忆挂载切片面板。
    ├── app_core.js          // ⚙️ 核心管理器：UI 全局变量、双态引擎下拉框渲染与资产流转。
    ├── app_chat.js          // 💬 渲染核心：流式防崩渲染、Token 拦截、流式 TTS 发声与控制阀。
    ├── app_workflow.js      // ⏳ 时空沙漏：DAG 执行引擎，后台任务引渡与 HUD 监视器。
    ├── custom_marked.js     // 📽️ 媒体影院：定制 Markdown 渲染器，内置手势灯箱。
    ├── style.css            // 👗 视觉装甲：全局暗黑极简 UI 主题与响应式布局。
    └── pannellum/           // 🌍 WebGL 底盘：轻量级全景渲染引擎底层依赖。
```

## 🧬 核心拓扑解析

### 1. 达尔文演化矩阵与基因机床 (后端)
* **JIT 基因机床 (`dna_compiler.py`)**：彻底抛弃超长且僵化的静态系统提示词。在算力请求发起的瞬间，O(1) 动态寻址并组装“思想钢印”碎片，实现算力极致压缩并从根本上消除大模型的注意力涣散。
* **衔尾蛇自愈引擎 (`api_caliper.py` & `api_ouroboros.py`)**：活体演化闭环。当沙盒传回异常快照时，唤醒高维诊断模型提取“逻辑补丁 (DNA)”，并将其永久固化至动态基因池。系统在运行中自主改写其底层运转法则。
* **纯净总网关 (`main.py`)**：负责 API 级联路由、无痕垃圾回收与流式数据落盘，在老旧物理节点上免疫并发锁死与 RAM 溢出。

### 2. 视觉降维打击与原生无尽画布 (前端)
* **流式状态塌缩 (`app_chat.js`)**：抛弃 React 等重型装甲。在截获大模型巨量结构化实体标签时实施“流式视觉遮罩”，在数据流闭合瞬间完成状态塌缩，彻底根除 DOM 闪烁与重绘灾难。
* **原生 DAG 装配车间 (`work.js`)**：使用纯原生 SVG 三次贝塞尔曲线进行物理距离计算与节点连线，直穿浏览器底层渲染机制，同屏百节点亦能丝滑流转。
* **时空回溯与 SSE 战术雷达**：节点产出异常即触发“时空回溯”带错重试。后端通过 SSE 单向将密文脉冲实时泵入前端，免轮询直接物理驱动 UI 节点高亮与状态流转。

---

## ⚠️ 厂长声明 (Archived)
本仓库为个人架构推演的定格快照 文本均为AI代写。 **本人非科班技术人员。**
本项目拒接任何形式的技术支持，不提供一键运行包，谢绝任何 Issue 与 PR。全库底层源码皆为本人以纯文本微操指挥 AI 意志代笔落盘的产物。如遇图纸晦涩、逻辑难解，请自行提取源码并拷问你自己的 AI 助手。
