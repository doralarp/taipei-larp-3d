# 台北劇本殺物語 3D (Taipei LARP 3D)

全 3D 沉浸式劇本殺人生模擬 Web RPG，專為部署於 Render.com 打造。

## 🌟 部署至 Render.com 教學 (只需 2 分鐘)

### 步驟 1：推送到 GitHub
1. 在本機雙擊執行 `push_to_github.bat`，將專案推送到您的 GitHub（例如 `https://github.com/doralarp/taipei-larp-3d`）。

### 步驟 2：在 Render 上建立網站
1. 登入 [Render Dashboard](https://dashboard.render.com)。
2. 點擊右上角 **「New +」** -> 選擇 **「Static Site」**（推薦：免費、全球 CDN）。
3. 在 GitHub 倉庫列表中選擇 `taipei-larp-3d`。
4. 設定填寫（已由 `render.yaml` 預設，也可手動確認）：
   - **Name**: `taipei-larp-3d`（或自訂名稱）
   - **Branch**: `main`
   - **Build Command**: 留空（或輸入 `npm run build`）
   - **Publish Directory**: `./public`
5. 點擊 **「Create Static Site」**，等待 30 秒即刻上線並取得專屬網址（例如 `https://taipei-larp-3d.onrender.com`）！

---

### 若選擇以 Web Service (Node.js) 方式部署：
1. 選擇 **「New +」** -> **「Web Service」**。
2. **Build Command**: 留空。
3. **Start Command**: `node server.js`。
4. 點擊部署即可。
