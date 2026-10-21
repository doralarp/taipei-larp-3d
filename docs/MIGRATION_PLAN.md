# 《台北劇本殺物語 3D》資料遷移與回復計畫 (Migration & Rollback Plan)

> 基準版本：v1.0-baseline  
> 預定升級版本：v2.0-upgrade  
> 盤點時間：2026-10-21

---

## 1. 存檔架構升級與 Schema 版本管理

隨著 2.0 加入「空間微探索線索收集（Mini-LARP 謎題）」、「店家霓虹光柱狀態」及「成就任務系統」，存檔格式將由 `v1` 平滑升級至 `v2`。

### 升級前後 Schema 對比

```json
// === 舊版 Schema (tplarp-3d-save-v1) ===
{
  "month": 1,
  "min": 540,
  "money": 1500,
  "hp": 100,
  "logic": 20,
  "heart": 20,
  "nerve": 20,
  "mech": 20,
  "rep": 50,
  "played": [],
  "stamps": {},
  "mates": {},
  "weather": "sunny"
}

// === 2.0 新版 Schema (tplarp-3d-save-v2) ===
{
  "schemaVersion": 2,
  "player": {
    "month": 1,
    "min": 540,
    "money": 1500,
    "hp": 100,
    "stats": { "logic": 20, "heart": 20, "nerve": 20, "mech": 20, "rep": 50 }
  },
  "progress": {
    "played": [],
    "stamps": {},
    "cluesCollected": [],     // 2.0 新增：微探索散落線索 ID 清單
    "completedQuests": []     // 2.0 新增：任務成就狀態
  },
  "mates": {},
  "settings": {
    "soundEnabled": true,
    "cameraMode": "iso",
    "dprCap": 2
  },
  "worldState": {
    "weather": "sunny",
    "activeFilter": "all"
  }
}
```

---

## 2. 存檔自動遷移演算法 (Migration Algorithm)

系統啟動載入時執行下列防呆轉換流程：

1. 檢查是否存在 `tplarp-3d-save-v2`。若存在且 `schemaVersion === 2`，直接載入。
2. 若不存在，檢查舊版存檔 `tplarp-3d-save-v1`。
3. **安全轉換**：
   - 保留舊版 `month`、`min`、`money`、`hp`。
   - 保留既有屬性：`logic`、`heart`、`nerve`、`mech`、`rep`。
   - 保留玩家已通關的劇本紀錄 `played` 與各店家印章 `stamps`。
   - 保留車友既有好感度 `mates`。
   - 補齊 2.0 新增欄位預設值：`cluesCollected = []`, `completedQuests = []`, `dprCap = 2`。
4. **驗證與寫入**：
   - 驗證各數值為有效數字（NaN 防護與最小/最大邊界檢查）。
   - 將新結構寫入 `tplarp-3d-save-v2`。
   - **保留舊版 `tplarp-3d-save-v1` 作為安全備份**（不靜默刪除），若發生例外可退回。

---

## 3. 程式碼與部署回復程序 (Rollback Procedure)

若 2.0 升級在測試或部署過程中遇到非預期相容性錯誤，可使用以下標準指令 1 分鐘內復原至 1.0 基準版本：

### 本機與 Git 回復
```bash
# 1. 放棄當前修改並切換回 v1.0-baseline 標籤
git checkout v1.0-baseline

# 2. 或復原至 main 分支
git checkout main
git reset --hard v1.0-baseline

# 3. 重新推送到 GitHub 觸發 Render 自動部署
git push origin main --force
```

### 備份檔案實體位置
- 原始 JSON 數據儲存於：[`data_backup/`](file:///C:/Users/T_T/Documents/my%20project/taipei-larp-3d/data_backup/)
- 原始 HTML/JS 已由 Git Tag `v1.0-baseline` 永久固定。
