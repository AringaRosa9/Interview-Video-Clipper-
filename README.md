# Interview Video Clipper

本项目是一个本机优先、默认中文界面的面试高光视频剪辑 MVP。它接收公开 `.mp4` 链接，走本地后端处理流程，并提供：

- `API Key 管理`
- `视频剪辑` 向导
- AI 推荐片段人工确认
- 本地导出成片

## 环境要求

- Python `3.9+`
- Node.js `18+`
- `ffmpeg`

后续把本地转写服务替换成真实 `faster-whisper` 时，首次运行会下载模型文件，请预留磁盘空间和初始化时间。

## 安装

后端依赖：

```bash
cd backend
python3 -m pip install -e ".[test]"
```

前端依赖：

```bash
cd frontend
npm install
```

## 本地开发

直接启动前后端：

```bash
bash scripts/dev.sh
```

默认地址：

- 后端：`http://127.0.0.1:8000`
- 前端：`http://127.0.0.1:5173`

页面默认文案应为简体中文。

## 测试

运行整套测试：

```bash
bash scripts/test.sh
```

如果只跑后端：

```bash
cd backend
python3 -m pytest tests -q
```

如果只跑前端：

```bash
cd frontend
npm test
npm run build
```

## 手工冒烟

1. 在 `API Key 管理` 中新建一个 OpenAI-compatible 配置并测试连接
2. 在 `视频剪辑` 中输入公开 `.mp4` 链接
3. 选择模型配置并启动任务
4. 等待 `AI 推荐片段` 出现
5. 点击 `保留` / `移除`
6. 点击 `提交审核并导出`
7. 确认页面出现 `下载成片`

更详细的手工流程见：

- `docs/testing.md`
- `docs/samples/README.md`

## 真实样本安全说明

真实候选人视频和真实临时链接都不要提交到仓库。样本使用方式见 `docs/samples/README.md`。
