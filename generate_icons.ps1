# Usage:
# ./generate_icons.ps1 -InputImage ./src-tauri/icons/icon.png

param (
    [string]$InputImage = "./artifacts/icon.png"
)

# Check if Tauri CLI is available
if (-not (Get-Command "npm" -ErrorAction SilentlyContinue)) {
    Write-Error "npm is required but not found."
    exit 1
}

# Check if input image exists
if (-not (Test-Path $InputImage)) {
    Write-Error "Input image '$InputImage' not found. Please provide a path to a 1024x1024 (or 512x512) PNG."
    exit 1
}

Write-Host "Generating icons using Tauri CLI from $InputImage..."

# Use Tauri CLI to generate icons
# This generates .ico, .icns, and various .png sizes in src-tauri/icons
npx tauri icon $InputImage

# Explicitly create tray.png (usually 32x32 is good for tray, Tauri icon generates this)
$traySource = "src-tauri/icons/32x32.png"
$trayDest = "src-tauri/icons/tray.png"

if (Test-Path $traySource) {
    Copy-Item -Path $traySource -Destination $trayDest -Force
    Copy-Item -Path $traySource -Destination "src-tauri/icons/tray_white.png" -Force
    Write-Host "Created tray icons from 32x32 icon."
} else {
    Write-Warning "Could not find 32x32.png to create tray.png"
}

# Keep the in-app logo and browser favicon synchronized with the generated icon.
Copy-Item -Path $InputImage -Destination "frontend/public/logo.png" -Force
$InputIcon = [IO.Path]::ChangeExtension($InputImage, ".ico")
if (Test-Path $InputIcon) {
    Copy-Item -Path $InputIcon -Destination "src-tauri/icons/icon.ico" -Force
}
Copy-Item -Path "src-tauri/icons/icon.ico" -Destination "frontend/public/icon.ico" -Force
Write-Host "Updated frontend logo and favicon."


if ($LASTEXITCODE -eq 0) {
    Write-Host "Success! Icons generated in src-tauri/icons/" -ForegroundColor Green
} else {
    Write-Error "Failed to generate icons."
}
