// Game data ported from src/com/mymt/data/MonsterData.java + ImageData.java
// Tile IDs and meanings mirror MTGame.interaction().

export const TILE = 72; // px, matches res/ assets

// Monster table: id -> stats. Ported 1:1 from MonsterData.java
// [hp, attack, defend, money, exp, name]
export const MONSTERS = {
  40: [50, 20, 1, 1, 1, "Green Slime"],
  41: [70, 15, 2, 2, 2, "Red Slime"],
  42: [100, 20, 5, 3, 3, "Little Bat"],
  43: [200, 35, 10, 5, 5, "Blue Slime"],
  44: [110, 25, 5, 5, 4, "Skeleton"],
  45: [150, 40, 20, 8, 6, "Skeleton Soldier"],
  46: [300, 75, 45, 13, 10, "Beast Man"],
  47: [450, 150, 90, 22, 19, "Junior Guard"],
  48: [150, 65, 30, 10, 8, "Big Bat"],
  49: [550, 160, 90, 25, 20, "Red Bat"],
  50: [1300, 300, 150, 40, 35, "White Knight"],
  51: [700, 250, 125, 32, 30, "Monster King"],
  52: [500, 400, 260, 47, 45, "Red Mage"],
  53: [15000, 1000, 1000, 100, 100, "Red Demon King"],
  54: [850, 350, 200, 45, 40, "Golden Guard"],
  55: [900, 750, 650, 77, 70, "Golden Captain"],
  56: [400, 90, 50, 15, 12, "Skeleton Captain"],
  57: [1500, 830, 730, 80, 70, "Spirit Mage"],
  58: [1200, 980, 900, 88, 75, "Spirit Warrior"],
  59: [30000, 1700, 1500, 250, 220, "Nether Demon King"],
  60: [250, 120, 70, 20, 17, "Linen Mage"],
  61: [2000, 680, 590, 70, 65, "Nether Warrior"],
  62: [2500, 900, 850, 84, 75, "Nether Captain"],
  63: [125, 50, 25, 10, 7, "Junior Mage"],
  64: [100, 200, 110, 30, 25, "Senior Mage"],
  65: [500, 115, 65, 15, 15, "Stone Golem"],
  66: [900, 450, 330, 50, 50, "Beast Warrior"],
  67: [1200, 620, 520, 65, 75, "Twin-Blade Swordsman"],
  68: [1250, 500, 400, 55, 55, "Nether Guard"],
  69: [1500, 560, 460, 60, 60, "Senior Guard"],
  70: [3100, 1150, 1050, 92, 80, "Shadow Warrior"],
  188: [99999, 5000, 4000, 0, 0, "Blood Shadow"],
  198: [99999, 9999, 5000, 0, 0, "Dragon"],
};

export function monster(id) {
  const m = MONSTERS[id];
  if (!m) return null;
  return { hp: m[0], attack: m[1], defend: m[2], money: m[3], exp: m[4], name: m[5] };
}

// Real tile image files present in res/map0 + res/map1 (named <id>.png)
const REAL_IDS = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,19,20,21,22,23,24,25,26,27,28,
  30,31,32,33,34,35,36,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,
  59,60,61,62,63,64,65,66,67,68,69,70,71,73,75,76,78,80,181,182,183,184,185,186,187,188,
  189,191,192,193,194,195,196,197,198,199,202,203];

// Duplicate ids that reuse another tile's art (from ImageData.java)
const ALIAS = { 115: 15, 119: 0, 129: 0, 301: 13, 302: 13, 303: 14, 304: 14, 305: 5 };

// id -> filename id (or null if blank floor)
export function tileFileId(id) {
  if (id === 0) return 0;
  if (REAL_IDS.includes(id)) return id;
  if (id in ALIAS) return ALIAS[id];
  return null; // nothing to draw (treated as blank/floor underlay)
}
