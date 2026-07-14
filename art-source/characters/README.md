# 沐月角色美術來源封存

這個資料夾保存角色美術的可回溯來源，不會被遊戲執行時載入。請把它和程式碼一起備份／版本控制；正式遊戲仍從 `public/assets/characters/` 載入資產。

## 目錄用途

- `originals/`：五個單角色透明 PNG，適合當作後續 ImageGen 參考圖。
- `generated/raw-green/`：ImageGen 未修改的原始輸出，包含角色總覽與五張動作表；這是最重要的生成母檔。
- `generated/transparent-masters/`：由原始輸出去除綠幕後的完整解析度 RGBA 母檔，適合直接修圖。
- `runtime/`：目前遊戲實際使用版本的完整快照，包含單圖 fallback 與最佳化 sprite sheets。
- `PROMPTS.md`：生成方式、角色限制與每格動作規劃。

## Sprite sheet 規格

| 角色 | 格局 | Runtime 尺寸 | 單格尺寸 | 影格索引 |
|---|---:|---:|---:|---|
| Player | 5 × 4 | 1150 × 768 | 230 × 192 | 0–19 |
| Enemy | 4 × 3 | 864 × 576 | 216 × 192 | 0–11 |
| Caster | 4 × 3 | 864 × 576 | 216 × 192 | 0–11 |
| Boss P1 | 4 × 4 | 1344 × 896 | 336 × 224 | 0–15 |
| Boss P2 | 4 × 4 | 1344 × 896 | 336 × 224 | 0–15 |

### Player 索引

- 0–2：idle
- 3：hurt
- 4、9、19：death
- 5–8：run
- 10–12：attack
- 13：jump
- 14：fall
- 15–16：dash
- 17–18：heal

### Enemy 索引

- 0–2：idle
- 3：hurt
- 4–7：move
- 8–9：contact attack
- 10–11：death

### Caster 索引

- 0–2：idle
- 3：hurt
- 4–7：move
- 8–9：cast windup
- 10：cast release
- 11：death

### Boss P1／P2 共用索引

- 0–1：idle
- 2–4：walk
- 5–6：lunge windup
- 7：lunge active
- 8–9：slam rise
- 10：slam fall
- 11：slam land
- 12：slam recover
- 13：hurt
- 14–15：death

## 後續修改流程

1. 優先從 `generated/transparent-masters/` 修改；需要重新生成時，以 `originals/` 作為角色 reference。
2. 保持格數、角色朝向、腳底基準線與各格相同畫布大小，避免遊戲中抖位。
3. 匯出成上表的 Runtime 尺寸後，同步覆蓋 `runtime/` 與 `public/assets/characters/animated/` 的對應檔案。
4. 若改變格數或單格尺寸，同步修改 `src/utils/art.ts` 的 `load.spritesheet` 與動畫 frame mapping。
5. 執行 `npm run build`，並實際檢查左右翻面、攻擊、跳躍、受傷、死亡與 Boss 轉階。

