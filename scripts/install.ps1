$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
    Write-Host "Installing uv..."
    irm https://astral.sh/uv/install.ps1 | iex
    $env:Path = "$env:USERPROFILE\.local\bin;$env:Path"
}

Set-Location "$Root\backend"
uv sync --extra dev
Set-Location "$Root\frontend"
if (Get-Command npm -ErrorAction SilentlyContinue) {
    npm install
} else {
    Write-Warning "npm not found; install Node.js 20+"
}

Write-Host ""
Write-Host "Next: copy .env.example to .env"
Write-Host "Backend: cd backend; uv run uvicorn instadeck.main:app --reload --port 8000"
Write-Host "Frontend: cd frontend; npm run dev"
