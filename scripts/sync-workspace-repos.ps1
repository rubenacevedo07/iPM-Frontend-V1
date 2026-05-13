# Sincroniza docs/WORKSPACE-REPOS.md canónico (V1) hacia V2 y V3.
# Ejecutar desde la raíz de IPM_Frontend_V1:  .\scripts\sync-workspace-repos.ps1
# O: npm run workspace:sync-doc

$ErrorActionPreference = "Stop"
$root = "C:\Users\ruben\source\repos\iPM_GV"
$src  = Join-Path $root "IPM_Frontend_V1\docs\WORKSPACE-REPOS.md"
if (-not (Test-Path $src)) { Write-Error "No existe: $src" }
foreach ($name in @("IPM_Frontend_V2", "IPM_Frontend_V3")) {
  $dest = Join-Path $root $name "docs\WORKSPACE-REPOS.md"
  $dir  = Split-Path $dest
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  Copy-Item -Path $src -Destination $dest -Force
  Write-Host "OK: $name"
}
Write-Host "Listo. En V2 y V3 haz: git add docs/WORKSPACE-REPOS.md && git commit -m 'docs: sync WORKSPACE-REPOS from V1'"
