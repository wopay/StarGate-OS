# 假设您使用的是 python:3.10-slim 或类似的官方底座 
FROM python:3.10-slim

WORKDIR /app 

# 1. 🪚 烧录系统级武器 (Docker 客户端与文档粉碎机) 
# 加上清缓存指令，保持镜像体积轻盈干练 
RUN apt-get update && \
    apt-get install -y docker.io antiword && \
    apt-get clean && rm -rf /var/lib/apt/lists/* 

# 2. 🧠 导入基础核心生命维持系统 (融合 requirements.txt)
# 将外部的 requirements.txt 引入构建上下文
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 3. 💥 烧录星门专属高维神经元 (Python 满血重型依赖) 
# 这里剔除了 httpx 和 slowapi，因为 requirements.txt 里已经有了 [cite: 1, 2]
RUN pip install --no-cache-dir \
    chromadb sentence-transformers beautifulsoup4 \
    apscheduler pdfplumber docx2txt pandas openpyxl python-pptx \
    mammoth python-docx edge-tts 

# 4. 预留默认点火程序 (非必须，可被 compose 覆盖) 
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3333"]