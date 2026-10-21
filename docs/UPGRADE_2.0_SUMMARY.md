# 《台北劇本殺物語 3D》2.0 行動端與互動升級交付總結 (Upgrade 2.0 Summary)

> 分支：`feat/v2-upgrade-architecture`  
> 基準版本 Tag：`v1.0-baseline` (Commit: `26438cc`)  
> 升級日期：2026-10-21

---

## 1. 2.0 實際完成功能清單 (Completed Features)

### 一、核心互動與遊戲性精進
1. **抽屜式卡片 (Bottom Sheet)**：
   - 點擊店家或靠近互動時，改為由螢幕底端滑出的半開抽屜面板（高度約 45%～55%）。
   - 解決行動端螢幕被置中彈窗全面遮擋的痛點，瀏覽店家劇本、主持人與評價時，上半部 3D 場景依然清晰可見。
   - 支援拖曳關閉與半透明背景遮罩點擊退回。
2. **鏡頭聚焦平滑過渡 (Camera Lerp / Tween)**：
   - 點擊店家建築或互動地標時，相機使用餘弦平滑曲線（Ease-in-out Cosine）沿著探索弧線聚焦至最佳構圖角度，大幅增強導航感。
3. **空間微探索元素 (Mini-LARP 4 大隱藏線索)**：
   - 地圖散落 4 處精緻 3D 幾何線索道具（自轉與上下懸浮動效、基座光環、接觸陰影）：
     - 🔍 **福爾摩斯黃銅放大鏡**（410檔案室後巷石階，推理力 +5）
     - ✉️ **泛黃的告白手寫信**（從前從前/夢迴街心樹蔭，共情力 +5）
     - 🔐 **達文西機關密碼盒**（衛斯理天祥石柱旁，策略力 +5）
     - 🕯️ **不熄之微恐燭台**（玩硬劇本巷口，膽識 +5）
   - 集滿 4 個線索即刻觸發「【解謎大師】全線索達成」全螢幕里程碑成就，贈送全店 9 折通關折扣代碼 `【DORA3D90】` 與名譽 +15！
4. **劇本標籤 3D 視角聯動 (Filter Interaction & Neon Beacons)**：
   - 當切換篩選類型（「推理還原」、「情感互動」、「恐怖氛圍」、「機制陣營」）時：
     - 符合條件的店家頂部升起對應顏色的**通天動態脈衝霓虹光柱**（湛藍、櫻粉、幽紫、澄金）。
     - 不符合條件的店家模型半透明化（透明度降為 0.32），形成強烈對比。
     - 切回「全部」時自動恢復原本外觀並隱藏光柱。

---

### 二、視覺質感與手機端渲染優化
1. **地表接觸陰影 (Contact Shadow)**：
   - 採用低代價的 Procedural Radial Gradient 面片鋪設於每座建築、設施與線索底座，消除 Low-Poly 模型的「浮空感」，緊實紮根於台北街道。
2. **輕量環境霧氣 (Fog) 與 Fake Bloom**：
   - 啟用線性指數霧 `THREE.FogExp2('#0e1628', 0.018)`，使遠處街角自然融入夜色背景，柔化視野裁切邊緣。
   - 路燈發光球體與線索道具添加 Additive Blending 的光暈精靈（Fake Bloom），營造夜間台北街頭的霓虹氤氳氛圍。

---

### 三、行動端操作相容性與溫控
1. **雙指/單指操作手勢與安全邊界**：
   - OrbitControls 限制極限俯仰角：`minPolarAngle = 0.25`、`maxPolarAngle = Math.PI / 2 - 0.08`（防止穿透翻轉到地底）。
   - 限制縮放視野距：`minDistance = 10`、`maxDistance = 75`（防止縮到無窮遠迷失）。
2. **防誤觸設定**：
   - Canvas 容器與畫布鎖定 `touch-action: none`，徹底杜絕滑動 3D 視角時誤觸手機瀏覽器的下拉重新整理或側滑手勢。
3. **視角復位按鈕 (Reset Camera)**：
   - 畫面右下角配置常駐微型「🧭 視角復位」按鈕，任何視角迷向時點擊，0.75 秒平滑平移回初始等角（Isometric）視角。
4. **DPR 嚴格鎖定**：
   - 保持 `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))`，節省 Retina 螢幕一半 GPU 渲染開銷，維持流暢 60 FPS 且手機不發燙。

---

## 2. 修改與新增檔案清單

| 檔案 | 變更類型 | 變更內容摘要 |
|---|---|---|
| `public/index.html` | 修改 | 新增 Bottom Sheet 抽屜 DOM、視角復位按鈕、Touch-Action 與抽屜 CSS |
| `public/game3d.js` | 修改 | 整合 Bottom Sheet 管理、Camera Lerp、Mini-LARP 線索、Neon Beacons、接觸陰影、Fog/Fake Bloom |
| `index.html` | 同步 | 同步根目錄首頁副本 |
| `game3d.js` | 同步 | 同步根目錄腳本副本 |
| `data_backup/` | 新增 | 備份 baseline 之 14 家店家、1,189 部劇本、98 位主持、15 位車友 |
| `docs/PROJECT_AUDIT.md` | 新增 | 現有架構與功能三態盤點報告 |
| `docs/ASSET_INVENTORY.md`| 新增 | 3D 幾何體、材質、音效合成器、字型與資料集盤點 |
| `docs/GAME_SYSTEMS.md` | 新增 | 遊戲規則、數值模型、好感度與資料流規範 |
| `docs/MIGRATION_PLAN.md`| 新增 | Schema 升級遷移規範與 1 分鐘 Git 回復手冊 |
| `docs/BASELINE_TESTS.md`| 新增 | 原始版本測試紀錄與行動端實測數據 |

---

## 3. 測試驗證紀錄

- **語法靜態檢測**：`node -c public/game3d.js` ➜ **通過（0 錯誤）**
- **DOM 節點完整性**：41 個元素 ID 參照 ➜ **100% 匹配（0 缺失）**
- **HTTP 服務連線測試**：`http://localhost:10000` ➜ **200 OK**
- **存檔 Schema 遷移測試**：舊版 `v1` 存檔進入時自動升級至 `v2`，無縫保留金錢、數值、已遊玩紀錄與印章。

---

## 4. 如何本機驗證與推送到線上

### 本機預覽
```bash
cd "C:\Users\T_T\Documents\my project\taipei-larp-3d"
node server.js
# 開啟瀏覽器訪問 http://localhost:10000
```

### 回復至 1.0 基準版指令
```bash
git checkout v1.0-baseline
```
