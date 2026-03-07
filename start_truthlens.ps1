# TruthLens Stable Startup Script v1.2
# This script ensures all services are running and the Cloudflare tunnel is updated.

echo "--- Cleaning up old processes ---"
# Kill processes by port to be more precise
foreach ($port in 3001, 8001, 8002) {
    echo "Checking port $port..."
    $proc = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($proc) {
        echo "Killing process $($proc.OwningProcess[0]) on port $port"
        Stop-Process -Id $proc.OwningProcess[0] -Force -ErrorAction SilentlyContinue
    }
}
taskkill /F /IM cloudflared.exe 2>$null

# Wait for ports to clear
Start-Sleep -s 1

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

Start-Process "./cloudflared.exe" -ArgumentList "tunnel", "--url", "http://localhost:3001" -RedirectStandardError "tunnel_auto.log" -NoNewWindow

echo "Waiting for tunnel URL..."
$timeout = 60 # Increased timeout for slow DNS propagation
$url = ""
while ($timeout -gt 0 -and $url -eq "") {
    if (Test-Path "tunnel_auto.log") {
        $log = Get-Content "tunnel_auto.log"
        # Select the LAST URL found in the log to avoid stale entries
        $line = $log | Select-String -Pattern "https://.*\.trycloudflare\.com" | Select-Object -Last 1
        if ($line) {
            $url = $line.Matches[0].Value
        }
    }
    $timeout--
    Start-Sleep -s 1
}

if ($url -ne "") {
    echo "NEW TUNNEL URL CAPTURED: $url"
    
    # Wait for tunnel to be reachable with increased patience
    echo "Verifying tunnel reachability (this may take 30-60s)..."
    $retries = 20 # Increased retries
    $reachable = $false
    while ($retries -gt 0 -and -not $reachable) {
        try {
            $res = Invoke-RestMethod -Uri "$url/health" -Method Get -ErrorAction Stop
            if ($res.status -eq "up") { $reachable = $true }
        }
        catch { }
        $retries--
        if (-not $reachable) { Start-Sleep -s 3 }
    }

    if ($reachable) {
        echo "Tunnel is LIVE."
        echo $url > tunnel_url.txt
        
        # Update Frontend .env
        $envPath = "apps\frontend\.env"
        if (Test-Path $envPath) {
            (Get-Content $envPath) -replace "VITE_API_URL=.*", "VITE_API_URL=$url" | Set-Content $envPath
            echo "Frontend .env synchronized."
            
            echo "--- SUCCESS ---"
            echo "1. Backend services are up."
            echo "2. Public tunnel is live at $url"
            echo "3. Frontend .env is updated."
            echo "----------------"
            echo "IMPORTANT: If you are seeing ERR_NAME_NOT_RESOLVED in the browser,"
            echo "it means your static 'dist' bundle is old. Run 'npm run build' or use 'npm run dev'."
        }
    }
    else {
        echo "CRITICAL WARNING: Tunnel URL captured but health check timed out. Browser will fail."
    }
}
else {
    echo "CRITICAL: Failed to capture tunnel URL. Check tunnel_auto.log for Cloudflare errors."
}

echo "--- All services initiated ---"
echo "Gateway status: http://localhost:3001/health"
echo "Public Entry: $url/health"
