# launch-tradingview.ps1
# Launches Google Chrome with TradingView open and remote debugging enabled.
# This allows the TradingView MCP server to connect to your browser via CDP.
#
# Usage: Right-click → "Run with PowerShell"
#        OR from PowerShell terminal: .\launch-tradingview.ps1
#
# IMPORTANT: Close any existing Chrome windows before running this script.
# Chrome only allows one debugging instance at a time.

$chromePath    = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$userDataDir   = "C:\temp\chrome-tv"
$tradingViewUrl = "https://www.tradingview.com/chart/"

# ── Verify Chrome exists ──────────────────────────────────────────────────────
if (-not (Test-Path $chromePath)) {
    Write-Host ""
    Write-Host "  ERROR: Chrome not found at:" -ForegroundColor Red
    Write-Host "  $chromePath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  If Chrome is installed in a different location, edit" -ForegroundColor Cyan
    Write-Host "  the `$chromePath variable at the top of this script." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Common alternative paths:" -ForegroundColor Cyan
    Write-Host "  C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" -ForegroundColor Gray
    Write-Host "  %LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" -ForegroundColor Gray
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# ── Create temp user data directory if needed ─────────────────────────────────
if (-not (Test-Path $userDataDir)) {
    New-Item -ItemType Directory -Path $userDataDir -Force | Out-Null
    Write-Host "  Created Chrome profile directory: $userDataDir" -ForegroundColor Gray
}

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║        DDA Agent — TradingView           ║" -ForegroundColor Green
Write-Host "  ╚══════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  Launching Chrome with TradingView..." -ForegroundColor Green
Write-Host "  Debug port: 9222" -ForegroundColor Cyan
Write-Host "  Profile dir: $userDataDir" -ForegroundColor Cyan
Write-Host ""

Start-Process $chromePath -ArgumentList @(
    "--remote-debugging-port=9222",
    "--user-data-dir=$userDataDir",
    $tradingViewUrl
)

Write-Host "  Chrome launched successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor Yellow
Write-Host "  1. Log in to TradingView in the Chrome window that just opened" -ForegroundColor White
Write-Host "  2. Open a chart for the symbol you want to trade" -ForegroundColor White
Write-Host "  3. Return to Claude Code and run: tv_health_check" -ForegroundColor White
Write-Host "  4. If cdp_connected: true — you're ready!" -ForegroundColor White
Write-Host ""
Write-Host "  Then start monitoring: /loop delta-trading-monitor" -ForegroundColor Cyan
Write-Host ""
