# ==============================================
# deploy.ps1 — מעלה את המשחק ישירות לגיטהאב!
# הרץ את הסקריפט הזה כל פעם שאתה רוצה לעדכן
# ==============================================

$ProjectRoot = $PSScriptRoot
$WorkDir     = "$ProjectRoot\Work_In_Progress"

Write-Host "🍉 Copying files to root for GitHub Pages..." -ForegroundColor Cyan

Copy-Item "$WorkDir\20260311_1300_index_main.html" -Destination "$ProjectRoot\index.html" -Force
Copy-Item "$WorkDir\20260311_1300_style_main.css"  -Destination "$ProjectRoot\style.css" -Force
Copy-Item "$WorkDir\20260311_1300_script_main.js"  -Destination "$ProjectRoot\script.js" -Force

Write-Host "✅ Files copied!" -ForegroundColor Green

$html = Get-Content "$ProjectRoot\index.html" -Raw -Encoding UTF8
$html = $html -replace '20260311_1300_style_main\.css','style.css'
$html = $html -replace '20260311_1300_script_main\.js','script.js'
Set-Content "$ProjectRoot\index.html" $html -Encoding UTF8

Write-Host "🔗 HTML links updated!" -ForegroundColor Green

Set-Location $ProjectRoot
$timestamp = Get-Date -Format "dd/MM/yyyy HH:mm"

# Init git if missing
if (-not (Test-Path .git)) {
    git init
    git branch -M main
    git remote add origin "https://github.com/AVISHAIGIT/Percentage_Watermelon_Game.git"
}

git add .
git commit -m "Game Web Deployment Update $timestamp" 2>&1 | Out-Null
git push -u origin main --force 2>&1 | Write-Output

Write-Host "Deployed to GitHub successfully!" -ForegroundColor Green
Write-Host "https://avishaigit.github.io/Percentage_Watermelon_Game/" -ForegroundColor Yellow
Write-Host "GitHub Pages updates in 1-2 minutes." -ForegroundColor Gray

