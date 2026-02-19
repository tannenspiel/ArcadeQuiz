# ArcadeQuiz - Launch Debug Environment
# PowerShell script for automated Chrome DevTools Protocol setup

Write-Host "`n--- [ArcadeQuiz] Launching Debug Environment ---" -ForegroundColor Cyan

# Get project root (script location)
$projectRoot = Split-Path -Parent $PSScriptRoot
$userDataDir = Join-Path $projectRoot ".temp\chrome-debug"

# Ensure .temp directory exists
if (-not (Test-Path (Join-Path $projectRoot ".temp"))) {
    New-Item -ItemType Directory -Path (Join-Path $projectRoot ".temp") -Force | Out-Null
}

# Create Chrome profile dir if not exists
if (-not (Test-Path $userDataDir)) {
    New-Item -ItemType Directory -Path $userDataDir -Force | Out-Null
}

# Remove session files to prevent tab restoration
$sessionPaths = @(
    (Join-Path $userDataDir "Default\Current Session"),
    (Join-Path $userDataDir "Default\Current Tabs"),
    (Join-Path $userDataDir "Default\Last Session"),
    (Join-Path $userDataDir "Default\Last Tabs"),
    (Join-Path $userDataDir "Default\Sessions"),
    (Join-Path $userDataDir "Default\Session Storage")
)

foreach ($path in $sessionPaths) {
    if (Test-Path $path) {
        Remove-Item $path -Force -Recurse -ErrorAction SilentlyContinue
    }
}

Write-Host "Project Root: $projectRoot" -ForegroundColor Gray
Write-Host "Chrome Profile: $userDataDir" -ForegroundColor Gray

# === Step 1: Clear ports and processes ===
Write-Host "`n[1/4] Cleaning up ports and processes..." -ForegroundColor Yellow

# Kill processes on port 3000
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object {
    $processId = $_.OwningProcess
    if ($processId -gt 0) {
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        Write-Host "  - Stopped process $processId (port 3000)" -ForegroundColor Gray
    }
}

# Kill old Chrome debug processes
Get-Process chrome -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*chrome-debug*"
} | ForEach-Object {
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    Write-Host "  - Stopped old Chrome debug process" -ForegroundColor Gray
}

# === Step 2: Find Chrome executable ===
Write-Host "`n[2/4] Locating Chrome..." -ForegroundColor Yellow

$chromePaths = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)

$chromeExe = $chromePaths | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $chromeExe) {
    Write-Error "Chrome.exe NOT found in standard locations!"
    Write-Host "Please install Chrome or add it to PATH." -ForegroundColor Red
    exit 1
}

Write-Host "  - Found: $chromeExe" -ForegroundColor Green

# === Step 3: Launch Chrome with CDP for MCP ===
Write-Host "`n[3/4] Launching Chrome with DevTools Protocol..." -ForegroundColor Yellow

$chromeArgs = @(
    "--remote-debugging-port=9222",
    "--user-data-dir=$userDataDir",
    "--no-first-run",
    "--no-default-browser-check",
    "--no-session-restore",
    "--noerrdialogs",
    "--disable-popup-blocking",
    "--disable-backgrounding-occluded-windows",
    "--disable-features=TranslateUI",
    "about:blank"
)

try {
    Start-Process $chromeExe -ArgumentList $chromeArgs -WindowStyle Maximized
    Write-Host "  - Chrome launched on port 9222" -ForegroundColor Green
} catch {
    Write-Error "Failed to launch Chrome: $_"
    exit 1
}

# === Step 4: Wait, verify, and cleanup tabs ===
Write-Host "`n[4/4] Verifying and cleaning tabs..." -ForegroundColor Yellow

Start-Sleep -Seconds 2

try {
    $response = Invoke-WebRequest -Uri "http://localhost:9222/json/version" -UseBasicParsing -TimeoutSec 5
    $browserInfo = $response.Content | ConvertFrom-Json

    Write-Host "  - Chrome CDP is ACTIVE!" -ForegroundColor Green

    # Close all existing tabs to prevent session restoration clutter
    $tabs = Invoke-WebRequest -Uri "http://localhost:9222/json/list" -UseBasicParsing -TimeoutSec 5 | ConvertFrom-Json
    $closedCount = 0

    foreach ($tab in $tabs) {
        if ($tab.url -ne "about:blank") {
            try {
                Invoke-WebRequest -Uri "http://localhost:9222/json/close/$($tab.id)" -Method Delete -UseBasicParsing -TimeoutSec 2 | Out-Null
                $closedCount++
            } catch {
                # Ignore if close fails
            }
        }
    }

    if ($closedCount -gt 0) {
        Write-Host "  - Closed $closedCount old tabs" -ForegroundColor Gray
    }
} catch {
    Write-Warning "Could not verify CDP (may still be starting)"
}

Write-Host "`n=== Debug Environment Ready ===" -ForegroundColor Green
Write-Host "  Port 9222: Chrome DevTools Protocol (for MCP)" -ForegroundColor White
Write-Host "`n[Starting Vite dev server on port 3000...]" -ForegroundColor Cyan

# Start Vite using node directly (avoid extra PowerShell)
$projectRoot = Split-Path -Parent $PSScriptRoot
$nodeExe = Join-Path $projectRoot "node_modules\.bin\vite.cmd"

if (Test-Path $nodeExe) {
    Start-Process "cmd" -ArgumentList "/c", "cd /d `"$projectRoot`" && vite --no-open" -WindowStyle Minimized
    Write-Host "  - Vite started" -ForegroundColor Green
} else {
    Write-Warning "Vite not found, please run: npm install"
}

Write-Host "`nNavigate to http://localhost:3000 once Vite is ready." -ForegroundColor Cyan
Write-Host ""

# === Step 5: Finalizing Navigation (Auto-load Game) ===
Write-Host "`n[5/5] Finalizing Navigation..." -ForegroundColor Yellow
Start-Sleep -Seconds 3 # Ждем, пока Vite поднимется

try {
    # Получаем ID пустой вкладки
    $target = Invoke-WebRequest -Uri "http://localhost:9222/json/list" -UseBasicParsing | ConvertFrom-Json | Where-Object { $_.url -eq "about:blank" } | Select-Object -First 1
    
    if ($target) {
        # Силовая навигация через CDP API
        $navUrl = "http://localhost:9222/json/activate/$($target.id)"
        Invoke-WebRequest -Uri $navUrl -Method Get -UseBasicParsing | Out-Null
        
        # Отправляем команду на переход (используем тот же механизм, что и Claude)
        # Но проще всего просто вызвать навигацию через системный запрос к порту:
        Invoke-WebRequest -Uri "http://localhost:9222/json/new?http://localhost:3000" -UseBasicParsing | Out-Null
        Write-Host "  - Game URL injected successfully!" -ForegroundColor Green
    }
} catch {
    Write-Warning "  - Could not auto-navigate, but environment is ready."
}

Write-Host "`n=== ALL SYSTEMS READY FOR CLAUDE ===`n" -ForegroundColor Cyan
