# 《台北劇本殺物語 3D》3D 資產與素材盤點 (Asset Inventory)

> 基準版本：v1.0-baseline  
> 盤點時間：2026-10-21

---

## 1. 3D 模型與幾何體資產 (Procedural Low-Poly Geometries)

本專案為確保極致的載入效能與零網路傳輸延遲，全部 3D 資產均採用「程序化輕量多邊形（Procedural Low-Poly）」生成，無需等待數十 MB 的外部 GLTF/OBJ 模型下載：

| 資產類別 | 構成幾何體 | 頂點 / 面數規模 | 材質與色彩配置 |
|---|---|---|---|
| **地面與道路系統** | `BoxGeometry(140, 1, 140)`, `PlaneGeometry` | 極低 (< 200 面) | 柏油黑 `#151b28`、斑馬線白 `#e2e8f0`、人行道灰 `#2d3748` |
| **路燈與街道設施** | `CylinderGeometry`, `SphereGeometry` | 低 (< 500 面) | 金屬黑桿、路燈發光球體 (`#ffd25e`, MeshBasicMaterial) |
| **街樹造景** | `CylinderGeometry`, `DodecahedronGeometry` | 低 (< 800 面) | 深褐樹幹 `#3e2723`、墨綠松柏綠葉 `#1b4332`, `#2d6a4f` |
| **14 座劇本殺店家外觀** | `BoxGeometry` 複合體、懸浮標記 `OctahedronGeometry` | 中 (< 3,000 面) | 依店家品牌色配置（紅色、深綠、紫羅蘭、亮藍、橙黃等） |
| **店家 3D 室內空間** | 圍讀長桌 (`BoxGeometry(9, 0.4, 4.2)`)、椅子 (`Cylinder`+`Box`)、線索白板 | 中 (< 2,500 面) | 胡桃木紋、金屬椅腿、白板白底黑框 |
| **主角與 NPC 角色模型** | 階層結構：頭部 (`Box`)、頭髮 (`Box`)、軀幹 (`Box`)、手足 (`Box`)、陰影 (`RingGeometry`) | 低 (~120 面 / 人) | 角色專屬髮色（黑、金、茶、紫）與外套（寶藍、珊瑚粉、深灰） |

---

## 2. 外部函式庫與依賴資產 (Runtime Libraries)

| 函式庫 | 版本 | 本機實體檔案路徑 | 外部 CDN 備援 | 作用 |
|---|---|---|---|---|
| **Three.js** | r128 | `public/lib/three.min.js` (603 KB) | cdnjs: `r128/three.min.js` | 核心 3D 算圖引擎 |
| **OrbitControls** | r128 | `public/lib/OrbitControls.js` (26 KB) | jsdelivr: `OrbitControls.js` | 軌道相機滑鼠/觸控控制 |

---

## 3. 字型與視覺樣式資產

- **中文字型**：Google Fonts `Noto Sans TC` (權重 400, 500, 700, 900)。
- **英數與數值字型**：Google Fonts `Plus Jakarta Sans` (權重 600, 800)。
- **介面色調（Glassmorphism Luxury Palette）**：
  - 主背景：深海藍 `#080e1a`
  - 玻璃卡片：`rgba(13, 22, 42, 0.94)` (含 12px Backdrop-blur)
  - 裝飾金色：暖金 `#ffd25e`、琥珀金 `#f59e0b`、鵝黃 `#fef08a`
  - 狀態強調色：體力翠綠 `#10b981`、警戒玫瑰紅 `#f43f5e`、神秘琉璃紫 `#6366f1`

---

## 4. 音效資產 (Procedural Web Audio API)

專案不使用外部 `.mp3` 或 `.wav` 音檔，避免 404 或高頻寬消耗，全部由 `AudioEngine` 即時合成：

| 音效標籤 | 合成方式 | 頻率 / 音調特徵 | 觸發時機 |
|---|---|---|---|
| `click` | 三角波 (Triangle) | 520Hz 短促 0.04s 衰減 | 點擊 UI 按鈕、選單 |
| `coin` | 正弦波 (Sine) 雙音 | 988Hz -> 1318Hz (B5 -> E6) | 打工發薪、完成劇本結算金錢 |
| `step` | 低通白噪聲 (Noise Buffer) | 80Hz 0.05s | 行走時隨步頻輕微敲擊 |
| `enter` | 正弦波和弦 (Chords) | C4-E4-G4 琶音 (Arpeggio) | 進入店家 3D 室內 |
| `level` | 輝煌和弦 (Major Triad) | C5 -> E5 -> G5 -> C6 上揚 | 角色能力升級、解鎖稱號 |

---

## 5. 核心資料集資產 (Game Datasets)

| 資料集識別 | 規模與筆數 | 來源與結構 |
|---|---|---|
| `gamedata.json` | 14 家台北劇本殺名店，共 1,189 部真實劇本殺檔案 | 包含店家代碼、名稱、坐標、主題、劇本名稱、價格、難度、人數、標籤 |
| `peopledata.json` | 98 位知名主持人 (Hosts)、15 位常駐專屬車友 (Mates) | 包含姓名、擅長領域、性格標籤、初始好感度、名譽加成 |
| `amenities.json` | 7 處台北都會生活設施 | 包含雅房、捷運、超商、手搖飲、便當店、家教中心、外送接單站 |
