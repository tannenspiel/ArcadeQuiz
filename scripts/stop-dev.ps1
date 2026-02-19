# Остановить всё на порту 3000 (Vite)
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# Остановить всё на порту 9222 (Chrome Debug)
Get-NetTCPConnection -LocalPort 9222 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

Write-Host "Ports 3000 and 9222 cleared." -ForegroundColor Gray
exit 0