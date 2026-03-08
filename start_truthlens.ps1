# TruthLens Stable Startup Script v1.3
# This script ensures all services are running and the Cloudflare tunnel is updated.

echo "--- Cleaning up old processes ---"
# Kill processes by port to be more precise
foreach ($port in 3001, 8001, 8002) {
    echo "Checking port $port..."
    try {
        $procIds = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($procId in $procIds) {
            echo "Killing process $procId on port $port"
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        }
    }
    catch { }
}
taskkill /F /IM cloudflared.exe 2>$null

# Wait for ports to clear
Start-Sleep -s 2

echo "--- Starting Services ---"

# Start API Gateway
Start-Process "node" -ArgumentList "index.js" -WorkingDirectory "apps\api-gateway" -WindowStyle Hidden -RedirectStandardOutput "gateway_out.log" -RedirectStandardError "gateway_err.log"

# Start Ingest Service
Start-Process "python" -ArgumentList "main.py" -WorkingDirectory "services\ingest-service" -WindowStyle Hidden -RedirectStandardOutput "ingest_out.log" -RedirectStandardError "ingest_err.log"

# Start ML Orchestrator
Start-Process "python" -ArgumentList "orchestrator.py" -WorkingDirectory "services\ml-specialists" -WindowStyle Hidden -RedirectStandardOutput "orch_out.log" -RedirectStandardError "orch_err.log"

echo "--- Starting Cloudflare Tunnel ---"
# Remove old log if exists
if (Test-Path "tunnel_auto.log") { Remove-Item "tunnel_auto.log" }

# Start tunnel and capture output
Start-Process ".\cloudflared.exe" -ArgumentList "tunnel", "--url", "http://localhost:3001" -RedirectStandardError "tunnel_auto.log" -NoNewWindow

echo "Waiting for tunnel URL..."
$timeout = 60 
$url = ""
while ($timeout -gt 0 -and $url -eq "") {
    if (Test-Path "tunnel_auto.log") {
        $log = Get-Content "tunnel_auto.log" -ErrorAction SilentlyContinue
        if ($log) {
            # Looking for the specific trycloudflare.com URL pattern
            $line = $log | Select-String -Pattern "https://.*\.trycloudflare\.com" | Select-Object -Last 1
            if ($line) {
                if ($line.ToString() -match "https://[a-zA-Z0-9-]+\.trycloudflare\.com") {
                    $url = $matches[0]
                }
            }
        }
    }
    $timeout--
    Start-Sleep -s 1
}

if ($url -ne "") {
    echo "NEW TUNNEL URL CAPTURED: $url"
    echo $url > tunnel_url.txt
    
    # Wait for tunnel to be reachable
    echo "Verifying tunnel reachability..."
    $retries = 15
    $reachable = $false
    while ($retries -gt 0 -and -not $reachable) {
        try {
            $res = Invoke-RestMethod -Uri "$url/health" -Method Get -TimeoutSec 5 -ErrorAction Stop
            if ($res.status -eq "up") { $reachable = $true }
        }
        catch { }
        $retries--
        if (-not $reachable) { Start-Sleep -s 2 }
    }

    if ($reachable) {
        echo "Tunnel is LIVE."
        
        # Update Frontend .env
        $envPath = "apps\frontend\.env"
        if (Test-Path $envPath) {
            $content = Get-Content $envPath
            $newContent = $content -replace "VITE_API_URL=.*", "VITE_API_URL=$url"
            $newContent | Set-Content $envPath
            echo "Frontend .env synchronized."
        }
        
        echo "--- SUCCESS ---"
        echo "1. Backend services are up."
        echo "2. Public tunnel is live at $url"
        echo "----------------"
    }
    else {
        echo "CRITICAL WARNING: Tunnel URL captured but health check timed out."
    }
}
else {
    echo "CRITICAL: Failed to capture tunnel URL. Check tunnel_auto.log."
}

echo "--- All services initiated ---"
echo "Gateway status: http://localhost:3001/health"
