# 角色美術生成紀錄

## 生成模式

五張動作表皆使用對應的單角色 PNG 作為 reference image 進行衍生，不是從零重新設計。共同限制如下：

- premium dark-fantasy action platformer sprite sheet
- painterly illustrated game art，清楚輪廓與一致解剖
- 保留 reference 的角色身分、面具、服裝、配色、武器與比例
- 每格角色朝右，固定視角、尺寸與腳底基準線
- 純色 `#00FF00` 綠幕，不含文字、標籤、格線、地板或陰影
- 每個角色完整留在自己的格內，大型 VFX 由遊戲程式處理

## Character lineup

原始檔：`generated/raw-green/character-lineup-green.png`

這張圖是第一輪五角色造型總覽。當時的完整逐字 prompt 未單獨保存；可回溯條件為：同一張純綠幕畫布上呈現月面劍士、鳥面獸人、紫面法師、鹿骨面具 Boss 第一階與紅蝕第二階，採精緻暗黑奇幻遊戲角色概念美術，完整身體、清楚分隔、無文字與場景。

## Player sprite sheet

Reference：`originals/player.png`

```text
Create a production-ready 2D game sprite sheet derived from the attached character. Preserve the exact same masked moon-knight identity, crescent ivory mask, dark blue layered cloak, gold ornaments, slender proportions, and straight sword. The character must face RIGHT in every frame.

Use case: premium dark-fantasy action platformer sprite sheet, painterly illustrated game art, crisp readable silhouette, consistent anatomy and costume.
Canvas: landscape sprite sheet with EXACTLY 5 columns and 4 rows, 20 equally sized cells. Keep the character fully inside every cell with generous consistent padding. Same apparent size, same ground baseline, same camera angle in every cell. Flat pure chroma green #00FF00 background only. No transparency, no floor, no shadow, no glow outside the silhouette, no text, no labels, no borders, no grid lines.

Frame plan, left to right:
Row 1: idle breathing frame 1, idle breathing frame 2, idle breathing frame 3, hurt recoil, death fall start.
Row 2: run contact, run passing, run airborne, run opposite contact, death kneel.
Row 3: sword attack windup, sword attack slash, sword attack follow-through, jump rising, fall descending.
Row 4: dash start, dash streak pose, healing channel start, healing channel peak, death collapsed.

Make adjacent animation frames clearly different and usable in sequence. Keep the sword and cloak motion coherent. Do not redesign the character.
```

## Enemy sprite sheet

Reference：`originals/enemy.png`

```text
Create a production-ready 2D game sprite sheet derived from the attached crow-beast enemy. Preserve the exact same red bird-skull mask, black feather mantle, hunched anatomy, long clawed hands and feet, dark gold ornaments, and feral silhouette. The creature must face RIGHT in every frame.

Use case: premium dark-fantasy action platformer sprite sheet, painterly illustrated game art, crisp readable silhouette, consistent anatomy and costume.
Canvas: landscape sprite sheet with EXACTLY 4 columns and 3 rows, 12 equally sized cells. Keep the full creature inside each cell with consistent padding, apparent size, ground baseline, and camera angle. Flat pure chroma green #00FF00 background only. No transparency, floor, shadow, text, labels, borders, or grid lines.

Frame plan, left to right:
Row 1: idle crouch breathing frame 1, idle frame 2, alert snarl, hurt recoil.
Row 2: stalking run contact, run passing, run airborne, opposite contact.
Row 3: contact attack windup, claw swipe impact, death collapse start, death collapsed.

Every adjacent frame must differ clearly and animate smoothly. Keep the feet anchored to one common ground baseline except airborne/death frames. Do not redesign the creature.
```

## Caster sprite sheet

Reference：`originals/enemy-caster.png`

```text
Create a production-ready 2D game sprite sheet derived from the attached robed void caster. Preserve the exact tall pointed black hat, smooth purple faceless mask, ornate black-and-violet robes, gold trim, dangling violet tassels, long sleeves, and glowing orb held at the chest. The caster should read as facing RIGHT in every frame while retaining the elegant three-quarter view.

Use case: premium dark-fantasy action platformer sprite sheet, painterly illustrated game art, crisp readable silhouette, consistent anatomy and costume.
Canvas: landscape sprite sheet with EXACTLY 4 columns and 3 rows, 12 equally sized cells. Keep the full caster inside every cell with consistent padding, apparent size, robe-bottom baseline, and camera angle. Flat pure chroma green #00FF00 background only. No transparency, floor, shadow, text, labels, borders, or grid lines.

Frame plan, left to right:
Row 1: idle breathing frame 1, idle frame 2, idle orb pulse, hurt recoil.
Row 2: floating glide frame 1, glide frame 2, glide frame 3, glide frame 4.
Row 3: spell cast windup with hands opening, charge with orb enlarged, release pose pointing right, death collapsed with empty orb.

Make sleeve, tassel, and orb motion coherent across frames. Keep large magical glow compact inside the silhouette so chroma removal remains clean. Do not redesign the caster.
```

## Boss phase 1 sprite sheet

Reference：`originals/boss.png`

```text
Create a production-ready 2D game sprite sheet derived from the attached phase-one antlered eclipse lord. Preserve the exact bone stag mask, branching black antlers, black feathered mantle, ornate dark armor and robes, antique gold trim, red cloth panels, dangling talismans, massive gauntlets, and dim red eclipse core in the chest. The boss must read as facing RIGHT in every frame in a consistent three-quarter view.

Use case: premium dark-fantasy action platformer boss sprite sheet, painterly illustrated game art, imposing readable silhouette, consistent anatomy and costume.
Canvas: landscape sprite sheet with EXACTLY 4 columns and 4 rows, 16 equally sized cells. Keep the full boss and antlers inside every cell with generous consistent padding, same apparent size, robe-bottom ground baseline, and camera angle. Flat pure chroma green #00FF00 background only. No transparency, floor, shadow, text, labels, borders, or grid lines.

Frame plan, left to right:
Row 1: idle breathing frame 1, idle breathing frame 2, heavy walk contact, heavy walk passing.
Row 2: heavy walk opposite contact, lunge windup crouch, lunge windup coiled, lunge active thrusting right.
Row 3: slam jump rise start, slam rise apex, slam rapid fall, slam ground impact crouch.
Row 4: slam recovery stand, hurt recoil, death fall start, death collapsed.

Make adjacent action frames clearly different and sequential. Antlers, cloak, talismans, and chest core must remain consistent. Keep all effects compact; no shockwave painted into the frame. Do not redesign the boss.
```

## Boss phase 2 sprite sheet

Reference：`originals/boss-phase2.png`

```text
Create a production-ready 2D game sprite sheet derived from the attached phase-two antlered eclipse lord. Preserve the exact bone stag mask, branching black antlers, black feathered mantle, ornate dark armor and long torn robes, antique gold trim, crimson-black cloth, dangling talismans, huge gauntlets, vivid molten red cracks, and blazing red eclipse core. The boss must read as facing RIGHT in every frame in a consistent three-quarter view.

Use case: premium dark-fantasy action platformer boss sprite sheet, painterly illustrated game art, imposing readable silhouette, consistent anatomy and costume. More violent pose energy than phase one but the same character proportions.
Canvas: landscape sprite sheet with EXACTLY 4 columns and 4 rows, 16 equally sized cells. Keep the full boss and antlers inside every cell with generous consistent padding, same apparent size, robe-bottom ground baseline, and camera angle. Flat pure chroma green #00FF00 background only. No transparency, floor, shadow, text, labels, borders, or grid lines.

Frame plan, left to right:
Row 1: idle breathing frame 1, idle breathing frame 2, heavy walk contact, heavy walk passing.
Row 2: heavy walk opposite contact, lunge windup crouch, lunge windup coiled, explosive lunge active thrusting right.
Row 3: slam jump rise start, slam rise apex, slam rapid fall, slam ground impact crouch.
Row 4: slam recovery stand, hurt recoil, death fall start, death collapsed.

Make adjacent action frames clearly different and sequential. Antlers, cloak, talismans, red fissures, and eclipse core must remain consistent. Keep all effects compact; no shockwave painted into the frame. Do not redesign the boss.
```
