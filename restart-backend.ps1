# Script para reiniciar el backend completamente

Write-Host "🛑 Deteniendo todos los procesos de Node..." -ForegroundColor Yellow
taskkill /F /IM node.exe /T 2>$null
Start-Sleep -Seconds 2

Write-Host "🧹 Limpiando cache de Node..." -ForegroundColor Yellow
if (Test-Path "backend\node_modules\.cache") {
    Remove-Item "backend\node_modules\.cache" -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "🚀 Iniciando backend..." -ForegroundColor Green
Set-Location backend
npm start
