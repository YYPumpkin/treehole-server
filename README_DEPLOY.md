部署与本地调试说明

1) 目的
- 快速在本地复现 CloudBase 上的运行时错误（500），收集容器日志并修复代码。

2) 准备
- 安装 Docker Desktop 并登录到 ACR（如果仓库为私有）：
  docker login --username=<user> --password=<password> <registry>
- 在 `server` 目录复制 `.env.example` 为 `.env` 并填写真实值。

3) 一键拉取并运行（推荐）
- 前台运行（可直接看到 stdout/stderr）：
  在 `server` 目录中运行 PowerShell：

```powershell
cd D:\HZY\VsCode\Codes\PythonHZY\Treehole\server
.\scripts\run_local.ps1
```

- 后台运行并查看日志：

```powershell
.\scripts\run_local.ps1 -Background
docker logs -f treehole-local
```

4) 本地源码构建（当你需要应用补丁后重建镜像时）
```powershell
cd D:\HZY\VsCode\Codes\PythonHZY\Treehole\server
docker build -t treehole-local:dev .
docker run --rm --name treehole-dev -p 3000:3000 -e PORT=3000 -e DB_HOST=... -e DB_USER=... -e DB_PASS=... -it treehole-local:dev
```

5) 常用调试请求
```powershell
curl.exe -i http://127.0.0.1:3000/api/health
curl.exe -i http://127.0.0.1:3000/api/debug
curl.exe -i http://127.0.0.1:3000/api/story/list/public
$body = @{ code = 'test' } | ConvertTo-Json
curl.exe -i -X POST http://127.0.0.1:3000/api/user/login -H "Content-Type: application/json" -d $body
```

6) CI 自动构建说明
- 我已添加 GitHub Actions 模板 `.github/workflows/build-and-push-acr.yml`。
- 在仓库 `Settings -> Secrets` 中添加以下 Secrets：
  - `ACR_REGISTRY`（例：crpi-1x2...cn-shanghai.personal.cr.aliyuncs.com）
  - `ACR_USERNAME`（登录用户名）
  - `ACR_PASSWORD`（登录密码）
  - `ACR_REPOSITORY`（例：yypumpkin/treehole-server）

- 推送到 `main` 分支或通过 GitHub UI 手动触发 workflow，会构建并推送镜像到 ACR（tags: `github.sha` 和 `latest`）。

7) 将新镜像部署到 CloudBase
- 在 CloudBase 控制台的云托管服务中，修改服务镜像为新推送的 ACR 镜像（`...:latest` 或 `...:${{github.sha}}`），并部署。
- 打开“实时日志”与“部署日志”查看容器启动详情。

8) 我可以代劳的内容（我能直接在仓库做）：
- 修改后端源码（已完成若干增强）。
- 添加本地运行脚本与 CI 模板（已创建）。
- 如果你提供 ACR 凭据（通过 GitHub Secrets），我可以修改 workflow 配置并触发构建（需你在 GitHub 上完成 Secrets 设置）。

9) 你需要手动执行的内容：
- 在你本地运行脚本或运行镜像（因为我无法访问你的机器）。
- 在 GitHub 仓库中添加 Secrets（ACR 登录信息）。
- 在 CloudBase 控制台上选择并部署镜像（或允许 CloudBase 拉取最新镜像）。

如需，我现在可以：
- 提交这些更改（已完成），
- 生成一组可复制的命令帮助你在 Windows 上一步步执行（我已放到 README），
- 或者等你把容器日志贴回来我直接准备补丁并提交新的镜像构建。