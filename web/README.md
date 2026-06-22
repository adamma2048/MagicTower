# 魔塔 v1.12 — HTML / JS / CSS port

A faithful browser port of the Java MagicTower in this repo (`src/com/mymt/`).
Pure vanilla ES modules + `<canvas>` — no build step, no dependencies. Reuses the
original 72×72 pixel-art tiles in `../res/`.

## Run

Must be served over HTTP (ES modules + image loads don't work from `file://`):

```bash
# from the repo root
python3 -m http.server 8766
# open http://localhost:8766/web/index.html
```

UI is in English. Works on desktop (keyboard) and mobile (tap-to-move + action
buttons appear automatically on small / touch screens).

## Controls

| Key | Touch | Action |
|---|---|---|
| Arrow keys | **Tap the map** in a direction | Move one tile toward the tap (interacts with that tile) |
| **L** | Forecast button | Monster forecast for the current floor (needs Holy Badge, tile 34) |
| **J** | Jump button | Floor-jump panel (needs Wind Compass, tile 35) |
| **W / S / Space** | Tap an option | Navigate / confirm inside a shop |

Tapping (or clicking) the map steps the hero one tile toward the tap along the
dominant axis — works on both touch and desktop.

Panels and shops are tappable; overlays have a Close button (or tap the backdrop).

## How the original logic maps over

| Java source | Port | What it holds |
|---|---|---|
| `data/MapData.java` | `maps.js` (auto-extracted) | 27 floors of 11×11 tile IDs, plus per-floor entry (`initPos`) / exit (`finPos`) positions |
| `data/MonsterData.java` | `data.js` `MONSTERS` | 33 monsters: `[hp, atk, def, money, exp, name]` |
| `data/ImageData.java` | `data.js` `tileFileId()` | tile ID → image file, including the aliased IDs (115→15, 119/129→0, 301–305→stairs) |
| `MTGame.interaction()` | `game.js` `interaction(cx,cy)` | the big switch: walls, doors+keys, gems/potions, items, stairs, teleporters, shops, monsters |
| `util/BattleUtil` | `game.js` `tryBattle()` | turn loop: player hits `atk−def`, monster hits back, repeat until one side drops |
| `util/ForecastUtil` | `game.js` `forecast()` | predicted HP loss; `"???"` when you can't pierce its defense |
| `util/ShopUtil` | `game.js` `SHOPS` + `shop()` | floor-3 and floor-11 shops (HP / attack / defense for gold) |
| `Main` key handling | `game.js` keydown listener | arrow-key movement + L / J |

### Coordinates
Grid is `LvMap[floor][row][col]`. The player position is `(posX=col, posY=row)`.
`interaction(cx, cy)` reads `LvMap[floor][cy][cx]` — same indexing as the Java code.

### Combat math (unchanged from the original)
- `forecast`: if `player.atk ≤ monster.def` → `"???"` (can't win); else if
  `player.def ≥ monster.atk` → `0`; else
  `floor(monster.hp / (player.atk − monster.def)) × (monster.atk − player.def)`.
- You can only enter a fight you survive (`loss < hp` and not `"???"`).

## Intentional deviations

- **Prologue fairy (tile 24):** the Java game opens a dialogue (unimplemented) that
  hands the first yellow key. Here the fairy grants the key inline so floor 0 is
  passable. Other NPC dialogues (小偷/老人/商人/公主) and the story are not ported.
- **Boss floor (26):** boss tiles render; only the monster-table entries that exist
  (`188` 血影, `198` 魔龙) are fightable, matching the original's partial state.

## Dev hook

`window.__mt` is exposed for debugging: `__mt.state`, `__mt.goFloor(n)`,
`__mt.interaction(col,row)`, `__mt.forceBattle(id)`.
