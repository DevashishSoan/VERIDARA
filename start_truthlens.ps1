# TruthLens Stable Startup Script v1.3
# This script ensures all services are running and the Cloudflare tunnel is updated.

Write-Output "--- Cleaning up old processes ---"
# Kill processes by port to be more precise
foreach ($port in 3001, 8001, 8002) {
    Write-Output "Checking port $port..."
    try {
        $procIds = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($procId in $procIds) {
            Write-Output "Killing process $procId on port $port"
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        }
    }
    catch { }
}
taskkill /F /IM cloudflared.exe 2>$null

# Wait for ports to clear
Start-Sleep -s 2

Write-Output "--- Starting Services ---"

# Start API Gateway
Start-Process "node" -ArgumentList "index.js" -WorkingDirectory "apps\api-gateway" -WindowStyle Hidden -RedirectStandardOutput "gateway_out.log" -RedirectStandardError "gateway_err.log"

# Start Ingest Service
Start-Process "python" -ArgumentList "main.py" -WorkingDirectory "services\ingest-service" -WindowStyle Hidden -RedirectStandardOutput "ingest_out.log" -RedirectStandardError "ingest_err.log"

# Start ML Orchestrator
Start-Process "python" -ArgumentList "orchestrator.py" -WorkingDirectory "services\ml-specialists" -WindowStyle Hidden -RedirectStandardOutput "orch_out.log" -RedirectStandardError "orch_err.log"

Write-Output "--- Starting Cloudflare Tunnel ---"
# Remove old log if exists
if (Test-Path "tunnel_auto.log") { Remove-Item "tunnel_auto.log" }

# Start tunnel and capture output
Start-Process ".\cloudflared.exe" -ArgumentList "tunnel", "--url", "http://localhost:3001" -RedirectStandardError "tunnel_auto.log" -NoNewWindow

Write-Output "Waiting for tunnel URL..."
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
    Write-Output "NEW TUNNEL URL CAPTURED: $url"
    Write-Output $url > tunnel_url.txt
    
    # Wait for tunnel to be reachable
    Write-Output "Verifying tunnel reachability..."
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
        Write-Output "Tunnel is LIVE."
        
        # Update Frontend .env with ALL discovery requirements
        $envPath = "apps\frontend\.env"
        $gwEnvPath = "apps\api-gateway\.env"
        if (Test-Path $envPath -and Test-Path $gwEnvPath) {
            $gwEnv = Get-Content $gwEnvPath
            $sbUrl = ($gwEnv | Select-String "SUPABASE_URL=").Line.Split("=")[1].Trim()
            $sbKey = ($gwEnv | Select-String "SUPABASE_ANON_KEY=").Line.Split("=")[1].Trim()
            
            # Reconstruct .env to ensure it's clean and has all keys
            $newContent = "VITE_API_URL=$url`nVITE_SUPABASE_URL=$sbUrl`nVITE_SUPABASE_ANON_KEY=$sbKey`n"
            Set-Content $envPath $newContent -NoNewline
            Write-Output "Frontend .env synchronized with Supabase credentials."
        }
        
        # --- DYNAMIC DISCOVERY: Push to Supabase ---
        try {
            if (Test-Path $gwEnvPath) {
                # We already extracted $sbUrl and $sbKey above
                
                if ($sbUrl -and $sbKey) {
                    Write-Output "Registering tunnel in Supabase for cross-device discovery..."
                    # Ensure $url is a clean string to prevent JSON serialization issues
                    $cleanUrl = $url.ToString().Trim()
                    $body = @{ 
                        key        = "active_tunnel_url"; 
                        value      = $cleanUrl; 
                        updated_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ") 
                    } | ConvertTo-Json
                    $headers = @{ 
                        "apikey"        = $sbKey; 
                        "Authorization" = "Bearer $sbKey"; 
                        "Content-Type"  = "application/json"; 
                        "Prefer"        = "resolution=merge-duplicates" 
                    }
                    
                    # Upsert to system_config table
                    Invoke-RestMethod -Uri "$sbUrl/rest/v1/system_config" -Method Post -Headers $headers -Body $body -ErrorAction Stop
                    
                    # Verify immediately
                    $check = Invoke-RestMethod -Uri "$sbUrl/rest/v1/system_config?key=eq.active_tunnel_url" -Method Get -Headers $headers 
                    if ($check.value -and $check.value.Length -gt 10) {
                        Write-Output "Dynamic Discovery: Tunnel registered AND verified in Supabase."
                    }
                    else {
                        Write-Output "Dynamic Discovery: Warning - Registered but verification showed empty value!"
                    }
                }
            }
        }
        catch {
            Write-Output "Dynamic Discovery: Failed to register tunnel in Supabase. (Self-hosted or SQL setup missing?)"
            Write-Output "Reason: $($_.Exception.Message)"
        }
        
        Write-Output "--- SUCCESS ---"
        Write-Output "1. Backend services are up."
        Write-Output "2. Public tunnel is live at $url"
        Write-Output "----------------"
    }
    else {
        Write-Output "CRITICAL WARNING: Tunnel URL captured but health check timed out."
    }
}
else {
    Write-Output "CRITICAL: Failed to capture tunnel URL. Check tunnel_auto.log."
}

Write-Output "--- All services initiated ---"
Write-Output "Gateway status: http://localhost:3001/health"
