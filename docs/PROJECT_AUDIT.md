# 《台北劇本殺物語 3D》現有專案盤點報告 (Project Audit)

> 基準版本：v1.0-baseline (Git Tag: `v1.0-baseline`)  
> 盤點時間：2026-10-21  
> 執行專案路徑：`C:\Users\T_T\Documents\my project\taipei-larp-3d`

---

## 1. 專案目錄與建置設定

| 目錄 / 檔案 | 職責與用途 | 備註 |
|---|---|---|
| `public/index.html` | 遊戲主頁面、DOM UI、內嵌資料注入點 | 內嵌 gamedata, peopledata, amenities |
| `public/game3d.js` | 核心 3D 引擎、遊戲狀態、邏輯與互動邏輯 (1,666 行) | 單體架構，包含 16 個子系統 |
| `public/lib/three.min.js` | 3D WebGL 渲染引擎核心庫 | Three.js r128 (約 603 KB)，離線自主託管 |
| `public/lib/OrbitControls.js` | 相機軌道控制擴充庫 | Three.js 官方範例 Controls (約 26 KB) |
| `server.js` | 原生 Node.js 靜態 HTTP 伺服器 | 支援 MIME 映射、SPA 404 回退、10000 埠 |
| `render.yaml` | Render.com 靜態網站自動化部署藍圖 | 免費 CDN 靜態網站配置 (`staticPublishPath: ./public`) |
| `package.json` | 專案相依與啟動腳本 | 引擎需求 Node >= 18.0.0，無外部 npm runtime 依賴 |
| `push_to_github.bat` | 一鍵 Git 推送工具 | 推送至 `https://github.com/doralarp/taipei-larp-3d.git` |
| `data_backup/` | 基礎數據備份資料夾 | 存放 14 家店家、1,189 部劇本、98 位主持人、15 位車友 |

---

## 2. 現有技術架構與渲染流程

- **3D 引擎與版本**：Three.js `r128` (WebGLRenderer)。
- **渲染管線**：
  - `shadowMap.enabled = true`，使用 `THREE.PCFSoftShadowMap`。
  - 色調映射：`THREE.ACESFilmicToneMapping`，曝光度 `1.05`。
  - 視口解析度控制：`renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))`。
- **相機系統**：
  - `PerspectiveCamera` (FOV: 38, Near: 0.5, Far: 300)。
  - 預設模式：45 度等角視角跟隨 (`CAM_OFFSET = Vector3(22, 30, 24)`)，相機插值平滑係數 `0.08`。
  - 切換模式：俯視模式 (`top`) 與 自由軌道模式 (`orbit`)。
- **光源系統**：
  - 環境光 `AmbientLight` (基本照度 0.55，夜間自動降至幽藍)。
  - 主方向日照光 `DirectionalLight` (含 2048x2048 陰影貼圖，隨街頭時間 09:00~23:00 弧形移動)。
  - 半球光 `HemisphereLight` 補強天光與地表反彈光。
- **場景構築方式**：
  - 程序化生成低多邊形（Low-Poly）街區。
  - 包含柏油路面、斑馬線、人行道、暖色路燈（含發光球體）、街樹造景。
  - 14 座真實劇本殺店家特色建物，附懸浮發光 3D 標記 (`store.marker`) 與頂部動態自轉。
- **角色與動畫系統**：
  - 自建 Low-Poly Q 版 3D 角色（幾何階層：頭部、髮型、身軀、左右手臂、左右腿部、角色陰影、頭頂名字標籤）。
  - 動畫實作：數學正弦波骨骼擺動（Walk 行走時手臂雙腿交錯擺動；Idle 呼吸時微晃）。

---

## 3. 現有功能三態分類清單

依據實際程式碼（`game3d.js`）與測試驗證，現有系統分類如下：

### 🟢 狀態一：已實際存在且運作正常 (Functional & Verified)

1. **3D 城市地圖渲染**：台北街區地面、道路網格、人行道、路燈與樹木正常生成，陰影正確投射。
2. **14 家劇本殺地標建物**：依照真實店家坐標（410檔案室、優雅謀殺、拉普拉斯、衛斯理、宮月城等）佈局於街道，帶有專屬配色。
3. **主角雙模移動**：
   - 鍵盤：`W/A/S/D` 與方向鍵移動，角度平滑轉向。
   - 滑鼠 / 觸控點擊：點擊柏油路面自動計算航點尋路前往。
4. **店家 3D 室內空間切換**：
   - 走進店家按空白鍵或點擊，相機下潛平滑切入地下 3D 會議室（劇本長桌、6張玩家椅、主持人 GM、線索白板）。
   - 點擊「走出店門」平滑回歸街頭。
5. **劇本殺體驗系統 (Script System)**：
   - 完整載入 1,189 部真實劇本殺，支援類型分類篩選（推理還原、情感互動、恐怖氛圍、機制陣營）。
   - 結算金錢消耗、體力消耗、能力數值增長與名譽提升。
6. **劇本中途關鍵時刻微抉擇 (Critical Moment)**：
   - 遊玩過程觸發 3 選 1 決策分支，依選擇額外獎勵推理/共情/膽識/策略力。
7. **生活設施與打工經濟 (Life Amenities)**：
   - 7-ELEVEN 買飯糰 / 大夜打工。
   - 手搖飲料店買珍奶 / 白天打工。
   - 排骨便當店用餐補體力。
   - 南陽街家教中心（推理力檢定打工）。
   - 外送接單站（跑單賺錢）。
   - 雅房睡覺結算每月房租（-1000 元）推進月份。
8. **車友好感度與互動 (Mates & Affinity)**：
   - 15 位專屬車友在地圖走動，可交談、請喝飲料提高好感度。
9. **冒險手冊與 1080x1920 IG Story 專屬名片導出**：
   - HTML5 Canvas 動態渲染高解析度個人履歷卡，五維雷達數值與印章自動繪製，可一鍵儲存 PNG。
10. **8-Bit Web Audio 合成音效**：
    - 不依賴外部音訊檔案，內建 Web Audio API 合成點擊、進店、賺錢、升級音效。

---

### 🟡 狀態二：已存在但有缺陷或尚未完成 (Flawed / Incomplete)

1. **模態視窗遮擋 3D 場景（手機端痛點）**：
   - 目前店家選本、對話與打工視窗均為全螢幕中央彈窗（`modal-box`），在手機端完全遮蔽 3D 空間，無法一邊檢視建築或人物一邊瀏覽。
   - *改進方案*：改為底部抽屜式面板（Bottom Sheet），支援半開與全開拖曳。
2. **相機聚焦為硬性切換**：
   - 點擊特定建築或 NPC 時，相機直接依固定距離跟隨，缺乏帶有探索感的平滑弧線聚焦動畫（Camera Lerp / Tween）。
3. **模型與地面銜接感（飄浮感）**：
   - 目前雖有方向光動態陰影，但在低階手機或陰影裁切邊緣處，建築與地面接縫無接觸陰影（Contact Shadow）或微弱 AO，略顯漂浮。
4. **手機端視角手勢易誤觸**：
   - 目前雖有 OrbitControls，但未細緻區分單指旋轉、雙指縮放與單點選取的優先級；且尚未限制極限俯仰角（Polar Angle），容易滑穿地面。
5. **篩選時缺乏地圖 3D 視覺聯動**：
   - 在選單選擇「情感本」或「硬核推理」時，目前僅清單過濾，地圖上的 3D 店家模型沒有即時亮起對應顏色光柱或半透明聚焦效果。

---

### 🔴 狀態三：目前不存在，需要新增 (Missing / Needs Implementation)

1. **空間微探索元素（Mini-LARP 謎題）**：
   - 街區中散落 3～5 個隱藏「線索道具」（如放大鏡、古老信封、密碼鎖盒），點擊收集後解鎖彩蛋劇本與成就徽章。
2. **輕量環境霧氣（Atmospheric Fog）與 Fake Bloom**：
   - 目前僅有背景單色霧，缺少夜間霓虹招牌光暈面片與神秘推理氛圍的微濃霧。
3. **右下角「重設視角（Reset Camera）」按鈕**：
   - 當行動端玩家旋轉鏡頭迷失方向時，一鍵平滑回位至初始等角最佳視角。
4. **模組化系統解耦 (Architecture Modularization)**：
   - 目前 1,666 行全集中於單一 `game3d.js` 檔案，需依規格劃分 GameCore, SceneManager, InteractionSystem 等邏輯模組邊界。
