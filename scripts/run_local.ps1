<#
PowerShell 脚本：从 ACR 拉取镜像并运行到本地端口 3000。
用法：
  .\run_local.ps1            # 交互式（前台）运行
  .\run_local.ps1 -Background # 后台运行并输出容器 id

请先在脚本同目录创建 .env 文件或将环境变量导入 PowerShell 会话。
#>
param(
    [switch]$Background
)

# 加载 .env（简单解析）
$envFile = Join-Path $PSScriptRoot '..' '.env'
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^[#;]') { return }
        if ($_ -match '^\s*$') { return }
        $parts = $_ -split '=', 2
        if ($parts.Length -eq 2) {
            $name = $parts[0].Trim()
            $value = $parts[1].Trim()
            Set-Item -Path Env:$name -Value $value
        }
    }
    Write-Host "Loaded .env from $envFile"
}
else {
    Write-Host "No .env found at $envFile — 请确保必要环境变量已设置"
}

$registry = $env:ACR_REGISTRY -or 'crpi-1x2acg6ehrxcw0ax.cn-shanghai.personal.cr.aliyuncs.com'
$repo = $env:ACR_REPOSITORY -or 'yypumpkin/treehole-server'
$tag = $env:IMAGE_TAG -or 'latest'
$image = "$registry/$repo:$tag"

Write-Host "Pulling image: $image"
docker pull $image

$envArgs = @(
    "-e", "NODE_ENV=$($env:NODE_ENV -or 'production')",
    "-e", "PORT=$($env:PORT -or '3000')",
    "-e", "DB_HOST=$($env:DB_HOST)",
    "-e", "DB_PORT=$($env:DB_PORT)",
    "-e", "DB_USER=$($env:DB_USER)",
    "-e", "DB_PASS=$($env:DB_PASS)",
    "-e", "DB_NAME=$($env:DB_NAME)",
    "-e", "JWT_SECRET=$($env:JWT_SECRET)"
)

if ($Background) {
    $cmd = @('docker', 'run', '-d', '--name', 'treehole-local', '-p', '3000:3000') + $envArgs + @($image)
    Write-Host "Running in background: $($cmd -join ' ')
"
    $out = & $cmd
    Write-Host "Container started: $out"
    Write-Host "查看日志： docker logs -f $out"
}
else {
    $cmd = @('docker', 'run', '--rm', '--name', 'treehole-local', '-p', '3000:3000') + $envArgs + @($image)
    Write-Host "Running foreground: $($cmd -join ' ')
"
    & $cmd
}
