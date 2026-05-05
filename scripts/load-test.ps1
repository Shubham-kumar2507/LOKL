#!/usr/bin/env pwsh
# ── LOKL Load Test Runner ────────────────────────────────
# Usage: .\scripts\load-test.ps1
# Prereqs: artillery installed globally, Docker Compose running

$ErrorActionPreference = "Stop"
$API_URL = "http://localhost:80"

Write-Host "`n🚀 LOKL Load Test Runner" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════" -ForegroundColor DarkGray

# ── Step 1: Check artillery is installed ─────────────────
Write-Host "`n[1/5] Checking artillery installation..." -ForegroundColor Yellow
try {
    $artVersion = & artillery version 2>&1
    Write-Host "  ✅ Artillery found: $artVersion" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Artillery not found. Install with: npm install -g artillery" -ForegroundColor Red
    exit 1
}

# ── Step 2: Health check ─────────────────────────────────
Write-Host "`n[2/5] Checking API health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$API_URL/api/auth/session" -Method POST -TimeoutSec 10
    Write-Host "  ✅ API is responding" -ForegroundColor Green
    Write-Host "  Token: $($health.token.Substring(0, 20))..." -ForegroundColor DarkGray
} catch {
    Write-Host "  ❌ API not responding at $API_URL" -ForegroundColor Red
    Write-Host "  Make sure Docker Compose is running: docker-compose -f infra/docker-compose.yml up" -ForegroundColor Yellow
    exit 1
}

$token = $health.token

# ── Step 3: Create test room ─────────────────────────────
Write-Host "`n[3/5] Creating test room..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    $body = @{
        alias = "Load Test Room"
        lat = 28.6139
        lng = 77.2090
    } | ConvertTo-Json

    $room = Invoke-RestMethod -Uri "$API_URL/api/rooms" -Method POST -Headers $headers -Body $body -TimeoutSec 10
    $roomId = $room.room._id
    Write-Host "  ✅ Test room created: $roomId" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Failed to create test room: $_" -ForegroundColor Red
    exit 1
}

# ── Step 4: Run load test ────────────────────────────────
Write-Host "`n[4/5] Running Artillery load test..." -ForegroundColor Yellow
Write-Host "  Room ID: $roomId" -ForegroundColor DarkGray
Write-Host "  Duration: ~6 minutes (warm up → ramp → sustained)" -ForegroundColor DarkGray
Write-Host ""

$env:TEST_ROOM_ID = $roomId
& artillery run lokl-load-test.yml --output lokl-results.json

# ── Step 5: Generate report ──────────────────────────────
Write-Host "`n[5/5] Generating report..." -ForegroundColor Yellow
& artillery report lokl-results.json --output lokl-results.html

Write-Host "`n═══════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host "✅ Load test complete!" -ForegroundColor Green
Write-Host "  JSON: lokl-results.json" -ForegroundColor DarkGray
Write-Host "  HTML: lokl-results.html" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Pass/Fail Criteria:" -ForegroundColor Yellow
Write-Host "  ✓ p95 latency < 100ms" -ForegroundColor DarkGray
Write-Host "  ✓ Error rate < 0.1%" -ForegroundColor DarkGray
Write-Host "  ✓ No CPU > 80%" -ForegroundColor DarkGray
Write-Host "  ✓ Redis memory < 256MB" -ForegroundColor DarkGray
Write-Host "  ✓ No MongoDB pool exhaustion" -ForegroundColor DarkGray
