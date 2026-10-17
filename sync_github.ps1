# ==============================================================================
# SCRIPT ĐỒNG BỘ LOCALHOST VÀ GITHUB - EXAMMASTER
# Repository: https://github.com/maithuong2602/matrandethi.git
# ==============================================================================

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  DONG BO MA NGUON GIUA LOCALHOST VA GITHUB (MAIN)" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Kiem tra trang thai Git
Write-Host "`n[1/3] Kiem tra thay doi noi bo tren may (localhost)..." -ForegroundColor Yellow
$status = git status --porcelain

if ($status) {
    Write-Host "Phap hien co thay doi moi chua luu. Dang tao commit..." -ForegroundColor Magenta
    git add -A
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    git commit -m "sync: cap nhat ma nguon tu dong luc $timestamp"
} else {
    Write-Host "Khong co file nao chua commit." -ForegroundColor Gray
}

# 2. Keo code moi nhat tu GitHub ve (Pull)
Write-Host "`n[2/3] Dang lay ma nguon moi nhat tu GitHub ve may (git pull)..." -ForegroundColor Yellow
git pull origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[CANH BAO] Xay ra xung dot hoac loi khi pull tu GitHub. Vui long kiem tra!" -ForegroundColor Red
    exit 1
}

# 3. Day toan bo thay doi len GitHub (Push)
Write-Host "`n[3/3] Dang day toan bo thay doi len GitHub (git push origin main)..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n>>> DONG BO THANH CONG 100%! Localhost va GitHub hien tai da dong nhat. <<<" -ForegroundColor Green
} else {
    Write-Host "`n[LOI] Khong the push len GitHub. Vui long kiem tra ket noi mang hoac quyen truy cap." -ForegroundColor Red
    exit 1
}
