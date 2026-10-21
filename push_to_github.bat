@echo off
chcp 65001 >nul
title 正在推送到 GitHub: taipei-larp-3d
cd /d "%~dp0"

echo ========================================================
echo   台北劇本殺物語 3D - GitHub / Render.com 一鍵推送工具
echo ========================================================
echo.

if not exist ".git" (
    echo [*] 正在初始化 Git 儲存庫...
    git init
    git branch -M main
)

git add -A
git commit -m "feat: Initial commit for Taipei LARP 3D on Render.com" >nul 2>&1

git remote get-url origin >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] 尚未設定遠端 GitHub 儲存庫。
    echo 請先在 GitHub 上建立一個名為 taipei-larp-3d 的新 Repository。
    echo 預設倉庫網址: https://github.com/doralarp/taipei-larp-3d.git
    echo.
    set /p REPO_URL="請輸入或確認 GitHub 倉庫網址 (直接按 Enter 使用預設): "
    if "%REPO_URL%"=="" set REPO_URL=https://github.com/doralarp/taipei-larp-3d.git
    git remote add origin %REPO_URL%
)

echo.
echo [*] 正在推送到 GitHub...
git push -u origin main

echo.
if %errorlevel% equ 0 (
    echo [成功] 程式碼已成功推送至 GitHub！
    echo 現在您只需前往 Render.com (https://dashboard.render.com):
    echo 1. 點擊 "New +" -> 選擇 "Static Site" (或 "Web Service")
    echo 2. 連接您的 GitHub 倉庫 (taipei-larp-3d)
    echo 3. Render 會自動讀取 render.yaml 並完成發布！
) else (
    echo [提示] 推送失敗或需驗證身分。
    echo 若出現驗證提示，請點擊彈出的瀏覽器視窗登入 GitHub 授權。
)
echo.
pause
