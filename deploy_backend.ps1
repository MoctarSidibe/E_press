# Deployment Script for E-Press Backend
# Run this from your local machine in PowerShell

$ServerIP = "161.97.66.69"
$User = "root"
$RemotePath = "~/E_press/backend"
$LocalPath = "c:\Users\user\OneDrive\Documents\e-press\backend"

Write-Host "🚀 Starting Deployment to $ServerIP..." -ForegroundColor Cyan

# 1. Upload Notification Service (Fixes driver order visibility)
Write-Host "uploading notification.service.js..."
scp "$LocalPath\services\notification.service.js" "$User@$ServerIP`:$RemotePath/services/"

# 2. Upload Driver Service (Fixes driver dashboard stats)
Write-Host "uploading driver.service.js..."
scp "$LocalPath\services\driver.service.js" "$User@$ServerIP`:$RemotePath/services/"

# 3. Upload Order Routes (Fixes 'Mark Ready' workflow)
Write-Host "uploading order.routes.js..."
scp "$LocalPath\routes\order.routes.js" "$User@$ServerIP`:$RemotePath/routes/"

# 4. Upload Cleaner Service & Routes (Fixes Cleaner History & Isolation)
Write-Host "uploading cleaner services and routes..."
scp "$LocalPath\services\cleaner.service.js" "$User@$ServerIP`:$RemotePath/services/"
scp "$LocalPath\routes\cleaner.routes.js" "$User@$ServerIP`:$RemotePath/routes/"

# 5. Upload Order Service (General logic updates)
Write-Host "uploading order.service.js..."
scp "$LocalPath\services\order.service.js" "$User@$ServerIP`:$RemotePath/services/"

# 6. Upload Migration Files
Write-Host "uploading migration files..."
scp "$LocalPath\database\migrations\005_add_cleaner_tracking.sql" "$User@$ServerIP`:$RemotePath/database/migrations/"
scp "$LocalPath\database\migrations\run_cleaner_migration.js" "$User@$ServerIP`:$RemotePath/database/migrations/"

Write-Host "✅ File uploads complete!" -ForegroundColor Green
Write-Host "PLEASE RUN THIS COMMAND MANUALLY TO RESTART THE SERVER:" -ForegroundColor Yellow
Write-Host "ssh $User@$ServerIP 'pm2 restart epress-api'" -ForegroundColor White
