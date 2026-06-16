# ⚙️ SYSTEM PROMPT & SPECIFICATION: "GRID STELLA" DEVELOPMENT

You are a Senior Frontend Engineer and Expert Game Developer. Your goal is to write the complete, production-ready code for a web-based client-side backpack puzzle and realtime auto-battler game titled **"GRID STELLA (グリッドステラ) - 方位観察官の天体調律盤 -"**.

The game is built using **Next.js (App Router), TypeScript, and Tailwind CSS**. To maximize performance and keep Vercel hosting entirely serverless and cost-free, **all game state, logic, synergy calculations, and battle simulations must run 100% on the client side (React States)**. No database or server-side functions are allowed.

To prevent token expiration and code truncation, you will generate this game across three distinct files:
1. `src/app/game/gameLogic.ts` (Data Models, Master Data, and Placement Logic)
2. `src/app/game/battleSimulator.ts` (Real-time Cooldown-based Battle Engine)
3. `src/app/game/page.tsx` (Tailwind CSS UI, HTML5 Drag & Drop, and State Orchestrator)

---

## 🗺️ Phase 1: Data Architecture & Logic (`src/app/game/gameLogic.ts`)

Write the complete code for `gameLogic.ts`. It must include strict TypeScript types, the item master data, and pure functions for checking placement validity and calculating synergy.

### 1. Type Definitions
- `Item`: `id` (string), `name` (string), `icon` (string/emoji), `width` (number), `height` (number), `rotated` (boolean), `baseAttack` (number), `baseCooldown` (number/seconds), `cost` (number), `type` ('weapon' | 'buff' | 'defense'), `description` (string)
- `PlacedItem`: `id` (unique instance string), `item` (Item), `x` (number, 0-4), `y` (number, 0-4)
- `PlayerStats`: `maxHp` (number), `initialShield` (number), `weapons`: Array of objects containing `{ id, name, icon, finalAttack, finalCooldown }`

### 2. Core Functions
- `canPlaceItem(item: Item, x: number, y: number, placedItems: PlacedItem[], currentId?: string): boolean`
  - Verifies if the item fits within the 5x5 grid boundaries.
  - Accounts for rotation (if `rotated` is true, swap `width` and `height`).
  - Ensures no overlapping with other items in `placedItems` (excluding itself if re-dragging via `currentId`).
- `calculateFinalStats(placedItems: PlacedItem[]): PlayerStats`
  - Scans the 5x5 grid and tracks item positions.
  - Applies **"Star (⭐) Link Synergies"**:
    - **羅針盤の刻印 (Compass Rose)**: Grants a 20% Cooldown Reduction (multiplicative) to any `weapon` type item whose top-left coordinate or occupied cells overlap with the 4 cells directly adjacent (Up, Down, Left, Right) to the Compass Rose's cell.
    - **均衡の分銅 (Plumb Bob)**: Grants `+2 Attack` to any `weapon` type item overlapping with the 2 cells directly adjacent (Left, Right) to the Plumb Bob's cell.
    - *Note: If an item is rotated, its relative synergy target offsets must rotate accordingly.*
  - Summons base player HP as 100. If `方位外套` is equipped, increase base shield.

### 3. Master Data (`SHOP_ITEMS`)
Include these 5 items exactly:
- `📌 観測針 (Navigator Needle)`: 1x1 / weapon / Attack: 4 / Cooldown: 2.0s / Cost: 3
- `🌐 天球儀 (Celestial Globe)`: 2x2 / weapon / Attack: 16 / Cooldown: 4.5s / Cost: 8
- `🧭 羅針盤の刻印 (Compass Rose)`: 1x1 / buff / Cost: 4 / Reduces CD of adjacent weapons by 20%
- `⚱️ 均衡の分銅 (Plumb Bob)`: 1x1 / buff / Cost: 3 / Adds +2 Attack to adjacent weapons
- `🧥 方位外套 (Navigator Coat)`: 2x1 / defense / Cost: 5 / Generates +4 Shield every 3.0 seconds in battle

### 4. Enemy Presets (`ENEMY_PRESETS`)
Define 3 stages of preset enemies (e.g., "歪んだ座標: Type-A", "暴走した観測機"). Give them static HP, Attack, Cooldown, and Shield values scaling up in difficulty.

*Output ONLY the fully written code for `gameLogic.ts`. Do not truncate or use placeholders.*

---

## ⚔️ Phase 2: Timeline Battle Simulator (`src/app/game/battleSimulator.ts`)

Write the complete code for `battleSimulator.ts`. It imports types from `gameLogic.ts` and simulates a real-time combat sequence using a high-frequency time loop.

### 1. Simulation Loop
- Function: `simulateRealtimeBattle(playerStats: PlayerStats, enemyStats: any)`
- Runs a virtual clock from `0.0s` to a max of `30.0s`, incrementing by `0.1s` (100ms) intervals per loop iteration.

### 2. Combat Mechanics
- **Player Attacks**: Each weapon maintains its own dynamic cooldown timer. When elapsed time reaches a multiple of the weapon's `finalCooldown`, it triggers an attack.
  - `Damage = Math.max(1, weapon.finalAttack - enemy.currentShield)`
  - Deduct damage from enemy HP. If enemy has shield, damage reduces shield first.
- **Player Defense**: Every 3.0 seconds, if the player has `方位外套` equipped, add its defense value to the player's active shield.
- **Enemy Attacks**: The enemy attacks at its own fixed interval rate.
  - `Damage = Math.max(1, enemy.attack - player.currentShield)`
  - Deduct damage from player HP/Shield.
- **Log generation**: Append a descriptive string to a `battleLogs` array for every event (e.g., `"[1.2s] 観測針の調律攻撃！敵に5ダメージ！"`).
- **Snapshot History**: Store the HP and Shield values of both entities at every 0.1s step for UI animation tracking.

### 3. Win/Loss Determination
- End the loop immediately if player HP <= 0 (Loss) or enemy HP <= 0 (Win).
- If the clock hits 30.0s, the side with the higher remaining HP percentage wins. If equal, it's a Draw.
- Return an object: `{ result: 'win' | 'lose' | 'draw', logs: string[], history: Snapshot[] }`

*Output ONLY the fully written code for `battleSimulator.ts`. Do not truncate or use placeholders.*

---

## 🎨 Phase 3: Star-Visualized UI & State Orchestrator (`src/app/game/page.tsx`)

Write the complete code for `page.tsx`. It imports the logic from both files and renders a premium, dark-mode sci-fi/fantasy user interface mimicking the aesthetics of the "Machina Navigator (方位観察官)".

### 1. Visual Theme (Black, White, and Gold)
- Background: Pitch black/dark charcoal (`bg-neutral-950`).
- Borders/Accents: Sharp, delicate golds (`border-amber-600/40`, `text-amber-400`).
- Typography: Clean whites (`text-stone-100`) with a mystical, solemn tone.
- Header Title: **"GRID STELLA - 方位観察官の天体調律盤 -"** accompanied by an esoteric sub-headline.

### 2. Shop & Grid Interactivity (HTML5 Drag and Drop)
- Left Column: Shop interface display. Users buy items using Gold, or pay 1 Gold to "Reroll" the shop items.
- Right Column: 5x5 Grid representation. Items are rendered as absolute-positioned blocks over the grid cells.
- **HTML5 Drag and Drop**: Implement using native event handlers (`draggable`, `onDragStart`, `onDragOver`, `onDrop`).
- **Star (⭐) Synergy Highlight**:
  - When hovering over or dragging a `羅針盤の刻印` or `均衡の分銅`, instantly highlight their effective status-boosting cells on the grid using a soft glowing gold color (`bg-amber-500/20`).
- **Rotation System**: Pressing the **"R" key** while dragging or selecting an item rotates it 90 degrees clockwise, altering its dimensions and dynamically flipping its synergy highlight paths.
- Invalid placement zones turn cells red, valid zones turn cells green during drag previews.

### 3. Auto-Battle Playback Engine
- Clicking "時空調律 (Start Battle)" hides the shop, locks the grid, triggers `simulateRealtimeBattle`, and opens the combat arena layout.
- Use a React `setInterval` ticking every 100ms to sequentially read the logs and snapshots generated by the simulator, giving the illusion of a fast-paced live simulation.
- Render smooth dynamic health and shield bars moving in sync with the log printouts.
- **Micro-Animations**: When a weapon triggers an attack in the battle log, apply a quick CSS scale bounce (`scale-110`, `duration-100`) to its corresponding icon on the grid to create juicy visual feedback.
- Post-match, display an elegant full-screen modal: "座標調律完了 (Victory)" or "観測不能 (Defeat)". Victory rewards Gold and advances the player to the next stage loop.

*Output ONLY the fully written code for `page.tsx`. Ensure all imports are correct, no code is commented out or missing, and it is 100% ready to copy-paste into a standard Next.js App Router workspace.*
