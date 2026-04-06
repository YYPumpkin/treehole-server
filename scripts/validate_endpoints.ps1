param(
    [string]$Domain
)

if (-not $Domain) { $Domain = $env:DOMAIN }
if (-not $Domain) {
    Write-Error "Usage: .\\validate_endpoints.ps1 <your-domain> or set env var DOMAIN"
    exit 1
}

$base = "https://$Domain"
Write-Output "Validating endpoints at $base"

Write-Output "--- GET / ---"
curl -i "$base/"

Write-Output "--- GET /api/story/list/public ---"
curl -i "$base/api/story/list/public"

Write-Output "--- POST /api/user/login (test) ---"
curl -i -X POST "$base/api/user/login" -H "Content-Type: application/json" -d '{"code":"test"}'
