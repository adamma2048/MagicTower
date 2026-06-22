// MagicTower — HTML/JS/CSS port of the Java game.
// Logic ported from src/com/mymt/ (MTGame.interaction, BattleUtil, ForecastUtil, ShopUtil).
import { LvMap as LVMAP_SRC, initPos, finPos } from "./maps.js";
import { TILE, monster, tileFileId } from "./data.js";

const ROWS = 11, COLS = 11;

// ---- mutable game state ---------------------------------------------------
const LvMap = LVMAP_SRC.map(f => f.map(r => r.slice())); // deep clone (tiles get consumed)

const player = {
  level: 1, hp: 1000, attack: 10, defend: 10, money: 0, exp: 0,
  Ykey: 0, Bkey: 0, Rkey: 0,
  toward: 1, // 0-left 1-down 2-right 3-up
  posX: 5, posY: 9,
};
const items = { cross: false, forecast: false, jump: false, hammer: false };

let currentFloor = 0;
let maxFloor = 0;
let inConversation = false; // blocks movement during overlays/battle
let frame = 0;              // 0/1 animation frame
let gameSec = 0;

// ---- assets ---------------------------------------------------------------
const imgs = [{}, {}]; // imgs[frame][id] = HTMLImageElement
const playerImg = {};   // toward -> img
const REAL_IDS = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,19,20,21,22,23,24,25,26,27,28,
  30,31,32,33,34,35,36,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,
  59,60,61,62,63,64,65,66,67,68,69,70,71,73,75,76,78,80,181,182,183,184,185,186,187,188,
  189,191,192,193,194,195,196,197,198,199,202,203];

function loadImage(src) {
  return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
}

async function loadAssets() {
  const jobs = [];
  for (const id of REAL_IDS) {
    jobs.push(loadImage(`../res/map0/${id}.png`).then(i => imgs[0][id] = i));
    jobs.push(loadImage(`../res/map1/${id}.png`).then(i => imgs[1][id] = i));
  }
  const dirs = { 0: "left", 1: "down", 2: "right", 3: "up" };
  for (const [t, name] of Object.entries(dirs))
    jobs.push(loadImage(`../res/player/${name}.png`).then(i => playerImg[t] = i));
  await Promise.all(jobs);
}

// ---- rendering ------------------------------------------------------------
const canvas = document.getElementById("map");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const floor = LvMap[currentFloor];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      // floor underlay everywhere for non-wall look
      const base = imgs[frame][0];
      if (base) ctx.drawImage(base, c * TILE, r * TILE, TILE, TILE);
      const id = floor[r][c];
      if (id === 0) continue;
      const fid = tileFileId(id);
      if (fid === null) continue;
      const img = imgs[frame][fid];
      if (img) ctx.drawImage(img, c * TILE, r * TILE, TILE, TILE);
    }
  }
  const px = player.posX * TILE, py = player.posY * TILE;
  const p = playerImg[player.toward];
  if (p) {
    ctx.drawImage(p, px, py, TILE, TILE);
  } else {
    // fallback marker so the player is never invisible if a sprite failed to load
    ctx.fillStyle = "#ffd86b";
    ctx.fillRect(px + 18, py + 12, TILE - 36, TILE - 24);
    ctx.fillStyle = "#11142a";
    ctx.font = "bold 22px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("H", px + TILE / 2, py + TILE / 2 + 8);
  }
  updateHUD();
}

function updateHUD() {
  const set = (id, v) => document.getElementById(id).textContent = v;
  set("hud-level", player.level);
  set("hud-hp", player.hp);
  set("hud-attack", player.attack);
  set("hud-defend", player.defend);
  set("hud-money", player.money);
  set("hud-exp", player.exp);
  set("hud-ykey", player.Ykey);
  set("hud-bkey", player.Bkey);
  set("hud-rkey", player.Rkey);
  set("hud-floor", currentFloor);
}

// ---- messages -------------------------------------------------------------
function msg(text) {
  const log = document.getElementById("log");
  const line = document.createElement("div");
  line.className = "log-line";
  line.textContent = text;
  log.prepend(line);
  while (log.children.length > 40) log.removeChild(log.lastChild);
}

// ---- combat helpers (ForecastUtil.forecast) -------------------------------
function forecast(m) {
  if (player.attack <= m.defend) return "???";
  if (player.defend >= m.attack) return 0;
  return Math.floor(m.hp / (player.attack - m.defend)) * (m.attack - player.defend);
}

function move(cx, cy) {
  // Guard against missing/NaN stair entries (initPos/finPos are short for the
  // top floors). Without this the player lands off-grid -> invisible + stuck.
  if (!Number.isInteger(cx) || cx < 0 || cx > COLS - 1) { console.warn("bad posX", cx, "-> 5"); cx = 5; }
  if (!Number.isInteger(cy) || cy < 0 || cy > ROWS - 1) { console.warn("bad posY", cy, "-> 9"); cy = 9; }
  player.posX = cx; player.posY = cy;
}

// ---- core interaction (MTGame.interaction) --------------------------------
// (cx,cy) = target column,row. Reads LvMap[floor][cy][cx].
function interaction(cx, cy) {
  const F = currentFloor;
  const id = LvMap[F][cy][cx];
  const consume = () => { LvMap[F][cy][cx] = 0; move(cx, cy); };
  switch (id) {
    case 0: move(cx, cy); break;
    case 1: case 5: case 15: case 19: case 20: break; // wall / stone / fence / fire / sky
    case 2: if (player.Ykey > 0) { player.Ykey--; consume(); } break;
    case 3: if (player.Bkey > 0) { player.Bkey--; consume(); } break;
    case 4: if (player.Rkey > 0) { player.Rkey--; consume(); } break;
    case 6: consume(); player.Ykey++; msg("Got a Yellow Key!"); break;
    case 7: consume(); player.Bkey++; msg("Got a Blue Key!"); break;
    case 8: consume(); player.Rkey++; msg("Got a Red Key!"); break;
    case 9: consume(); player.defend += 3; msg("Got a Blue Gem! DEF +3"); break;
    case 10: consume(); player.attack += 3; msg("Got a Red Gem! ATK +3"); break;
    case 11: consume(); player.hp += 200; msg("Got a Small Potion! HP +200"); break;
    case 12: consume(); player.hp += 500; msg("Got a Large Potion! HP +500"); break;
    case 13: currentFloor++; maxFloor = Math.max(maxFloor, currentFloor);
             move(initPos[currentFloor][0], initPos[currentFloor][1]); break;
    case 14: currentFloor--; move(finPos[currentFloor][0], finPos[currentFloor][1]); break;
    case 22: if (F === 3) shop(0); else if (F === 11) shop(3); break;
    // Deviation: original opens a dialogue (unimplemented) that hands the first
    // yellow key. We grant it inline so the prologue floor is passable.
    case 24: consume(); player.Ykey++; msg("[Fairy] Good luck! (Received 1 Yellow Key)"); break;
    case 25: case 26: case 27: case 28: consume(); break; // NPCs: walk onto
    case 30: consume(); player.level += 1; player.hp += 1000; player.attack += 7; player.defend += 7; msg("Got Small Wing! Level +1"); break;
    case 31: consume(); player.level += 3; player.hp += 3000; player.attack += 21; player.defend += 21; msg("Got Large Wing! Level +3"); break;
    case 32: consume(); items.cross = true; msg("[Lucky Cross] Give it to the fairy in the prologue to boost all stats."); break;
    case 33: consume(); player.hp *= 2; msg("[Holy Water] HP doubled!"); break;
    case 34: consume(); items.forecast = true; msg("[Holy Badge] Press L to forecast monsters."); break;
    case 35: consume(); items.jump = true; msg("[Wind Compass] Press J to jump between visited floors."); break;
    case 36: consume(); player.Ykey++; player.Bkey++; player.Rkey++; msg("Got Key Box! +1 of each key"); break;
    case 38: consume(); items.hammer = true; msg("[Starlight Hammer] Give it to the thief on floor 4."); break;
    case 39: consume(); player.money += 300; msg("Got Gold Block! Gold +300"); break;
    case 71: consume(); player.attack += 10; msg("Got Iron Sword! ATK +10"); break;
    case 73: consume(); player.attack += 30; msg("Got Steel Sword! ATK +30"); break;
    case 75: consume(); player.attack += 120; msg("Got Holy Sword! ATK +120"); break;
    case 76: consume(); player.defend += 10; msg("Got Iron Shield! DEF +10"); break;
    case 78: consume(); player.defend += 30; msg("Got Steel Shield! DEF +30"); break;
    case 80: consume(); player.defend += 120; msg("Got Star Shield! DEF +120"); break;
    case 115: consume(); break;            // passable fence
    case 119: case 129: consume(); break;  // passable
    case 202: consume(); msg("Got Flame Staff"); break;
    case 203: consume(); msg("Got Heart Staff"); break;
    case 301: currentFloor += 2; move(5, 1); break;
    case 302: currentFloor += 3; move(1, 5); break;
    case 303: currentFloor -= 2; move(5, 9); break;
    case 304: currentFloor -= 3; move(9, 5); break;
    case 305: currentFloor += 2; move(5, 10); break;
    default:
      if ((id >= 40 && id <= 70) || id === 188 || id === 198) tryBattle(id, cx, cy);
      break;
  }
}

// ---- battle (BattleUtil) --------------------------------------------------
function tryBattle(id, cx, cy) {
  const m = monster(id);
  if (!m) return;
  const loss = forecast(m);
  if (loss === "???" || loss >= player.hp) { // cannot win / would die: blocked
    msg(`Can't defeat ${m.name} (est. loss ${loss})`);
    return;
  }
  inConversation = true;
  let mhp = m.hp;
  const overlay = document.getElementById("battle");
  overlay.style.display = "flex";
  overlay.innerHTML = `
    <div class="battle-box">
      <h3>Encounter: ${m.name}</h3>
      <div class="battle-row"><span>Enemy HP</span><b id="b-mhp">${mhp}</b></div>
      <div class="battle-row"><span>Enemy ATK / DEF</span><b>${m.attack} / ${m.defend}</b></div>
      <div class="battle-row"><span>Your HP</span><b id="b-php">${player.hp}</b></div>
      <div class="battle-row"><span>Est. loss</span><b>${loss}</b></div>
    </div>`;
  const bmhp = document.getElementById("b-mhp");
  const bphp = document.getElementById("b-php");

  const timer = setInterval(() => {
    // one round (BattleUtil.attack)
    if (player.attack > m.defend) mhp -= (player.attack - m.defend);
    if (mhp > 0 && m.attack > player.defend) player.hp -= (m.attack - player.defend);
    bmhp.textContent = Math.max(0, mhp);
    bphp.textContent = player.hp;
    if (mhp <= 0) {
      clearInterval(timer);
      player.exp += m.exp;
      player.money += m.money;
      LvMap[currentFloor][cy][cx] = 0;
      move(cx, cy);
      msg(`Defeated ${m.name}! Gold +${m.money} EXP +${m.exp}`);
      setTimeout(() => { overlay.style.display = "none"; inConversation = false; draw(); }, 350);
    }
    draw();
  }, 90);
}

// ---- shop (ShopUtil) ------------------------------------------------------
const SHOPS = {
  0: { icon: 22, title: "Floor 3 Shop", opts: [
        ["+800 HP (25 gold)", () => spendMoney(25, () => player.hp += 800)],
        ["+4 ATK (25 gold)", () => spendMoney(25, () => player.attack += 4)],
        ["+4 DEF (25 gold)", () => spendMoney(25, () => player.defend += 4)],
        ["Leave shop", null]] },
  3: { icon: 22, title: "Floor 11 Shop", opts: [
        ["+4000 HP (100 gold)", () => spendMoney(100, () => player.hp += 4000)],
        ["+20 ATK (100 gold)", () => spendMoney(100, () => player.attack += 20)],
        ["+20 DEF (100 gold)", () => spendMoney(100, () => player.defend += 20)],
        ["Leave shop", null]] },
};
function spendMoney(cost, fn) { if (player.money >= cost) { player.money -= cost; fn(); return true; } msg("Not enough gold"); return false; }

let shopState = null;
function shop(which) {
  const s = SHOPS[which];
  if (!s) return;
  inConversation = true;
  shopState = { s, sel: 0 };
  renderShop();
  document.getElementById("shop").style.display = "flex";
}
function renderShop() {
  const { s, sel } = shopState;
  const el = document.getElementById("shop");
  el.innerHTML = `<div class="shop-box"><h3>${s.title}</h3>` +
    s.opts.map((o, i) => `<div class="shop-opt ${i === sel ? "sel" : ""}" data-i="${i}">${i === sel ? "▶ " : "▷ "}${o[0]}</div>`).join("") +
    `<div class="shop-hint">W/S select · Space confirm · or tap</div></div>`;
  // tap support (mobile): tap an option to select + confirm it immediately
  el.querySelectorAll(".shop-opt").forEach(d => d.onclick = () => {
    shopState.sel = +d.dataset.i;
    shopConfirm();
  });
}
function shopConfirm() {
  const opt = shopState.s.opts[shopState.sel];
  if (opt[1] === null) { closeShop(); return; }
  opt[1](); updateHUD(); renderShop();
}
function shopKey(code) {
  if (!shopState) return;
  const { s } = shopState;
  if (code === "KeyS") { shopState.sel = Math.min(s.opts.length - 1, shopState.sel + 1); renderShop(); }
  else if (code === "KeyW") { shopState.sel = Math.max(0, shopState.sel - 1); renderShop(); }
  else if (code === "Space") shopConfirm();
}
function closeShop() {
  document.getElementById("shop").style.display = "none";
  shopState = null; inConversation = false; draw();
}

// ---- forecast panel (L) ---------------------------------------------------
function toggleForecast() {
  const el = document.getElementById("forecast");
  if (el.style.display === "block") { el.style.display = "none"; inConversation = false; return; }
  const seen = new Set();
  const rows = [];
  const floor = LvMap[currentFloor];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const id = floor[r][c];
    if (id >= 40 && id <= 70 && !seen.has(id)) {
      seen.add(id);
      const m = monster(id);
      rows.push(`<tr><td>${m.name}</td><td>${m.hp}</td><td>${m.attack}</td><td>${m.defend}</td><td>${m.money}/${m.exp}</td><td class="loss">${forecast(m)}</td></tr>`);
    }
  }
  el.innerHTML = `<div class="fc-box"><h3>Monster Forecast (this floor)</h3>
    <table><thead><tr><th>Name</th><th>HP</th><th>ATK</th><th>DEF</th><th>Gold/EXP</th><th>Loss</th></tr></thead>
    <tbody>${rows.join("") || '<tr><td colspan="6">No monsters here</td></tr>'}</tbody></table>
    <button class="panel-close">Close</button></div>`;
  el.style.display = "block";
  inConversation = true;
  el.querySelector(".panel-close").onclick = () => { el.style.display = "none"; inConversation = false; };
  el.onclick = (e) => { if (e.target === el) { el.style.display = "none"; inConversation = false; } };
}

// ---- jump panel (J) -------------------------------------------------------
function toggleJump() {
  const el = document.getElementById("jump");
  if (el.style.display === "block") { el.style.display = "none"; inConversation = false; return; }
  let html = '<div class="fc-box"><h3>Wind Compass — Floor Jump</h3><div class="jump-grid">';
  for (let f = 0; f <= maxFloor; f++)
    html += `<button class="jump-f" data-f="${f}">${f}</button>`;
  html += '</div><button class="panel-close">Close</button></div>';
  el.innerHTML = html;
  el.querySelectorAll(".jump-f").forEach(b => b.onclick = () => {
    currentFloor = parseInt(b.dataset.f, 10);
    move(initPos[currentFloor]?.[0] ?? 5, initPos[currentFloor]?.[1] ?? 9);
    el.style.display = "none"; inConversation = false; draw();
  });
  el.querySelector(".panel-close").onclick = () => { el.style.display = "none"; inConversation = false; };
  el.onclick = (e) => { if (e.target === el) { el.style.display = "none"; inConversation = false; } };
  el.style.display = "block";
  inConversation = true;
}

// ---- input ----------------------------------------------------------------
// Any overlay/panel actually visible on screen?
function overlayOpen() {
  return ["battle", "shop", "forecast", "jump"].some(id => {
    const d = document.getElementById(id).style.display;
    return d && d !== "none";
  });
}

// Shared input — used by both the keyboard and the on-screen touch buttons.
function input(code) {
  if (shopState) { shopKey(code); return; }
  if (inConversation) {
    if (code === "KeyL") toggleForecast();
    else if (code === "KeyJ") toggleJump();
    else if (!overlayOpen()) inConversation = false; // self-heal: stuck flag, nothing showing
    return;
  }
  const { posX, posY } = player;
  switch (code) {
    case "ArrowDown":  if (posY + 1 < ROWS) { player.toward = 1; interaction(posX, posY + 1); } break;
    case "ArrowRight": if (posX + 1 < COLS) { player.toward = 2; interaction(posX + 1, posY); } break;
    case "ArrowUp":    if (posY - 1 >= 0)   { player.toward = 3; interaction(posX, posY - 1); } break;
    case "ArrowLeft":  if (posX - 1 >= 0)   { player.toward = 0; interaction(posX - 1, posY); } break;
    case "KeyL": if (items.forecast) toggleForecast(); return;
    case "KeyJ": if (items.jump) toggleJump(); return;
    default: return;
  }
  draw();
}

const HANDLED = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyL", "KeyJ", "KeyW", "KeyS", "Space"]);
document.addEventListener("keydown", e => {
  if (HANDLED.has(e.code) || shopState) { input(e.code); e.preventDefault(); }
});

// Action buttons (Forecast / Jump) — carry data-k="<KeyboardCode>".
document.querySelectorAll("[data-k]").forEach(btn => {
  const fire = (e) => { e.preventDefault(); input(btn.dataset.k); };
  btn.addEventListener("pointerdown", fire);
});

// Tap-to-move: tap anywhere on the map and the hero steps ONE tile toward the
// tap (along the dominant axis). Works for both touch and mouse.
canvas.addEventListener("pointerdown", (e) => {
  if (shopState || inConversation) return; // overlays handle their own taps
  const rect = canvas.getBoundingClientRect();
  const col = Math.floor((e.clientX - rect.left) / rect.width * COLS);
  const row = Math.floor((e.clientY - rect.top) / rect.height * ROWS);
  const dx = col - player.posX, dy = row - player.posY;
  if (dx === 0 && dy === 0) return;        // tapped the hero's own tile
  if (Math.abs(dx) >= Math.abs(dy)) input(dx > 0 ? "ArrowRight" : "ArrowLeft");
  else input(dy > 0 ? "ArrowDown" : "ArrowUp");
});
canvas.style.cursor = "pointer";

// ---- dev hook (inspect state / drive from console) ------------------------
window.__mt = {
  get state() { return { ...player, currentFloor, maxFloor, items: { ...items }, inConversation }; },
  interaction,
  forceBattle: (id) => tryBattle(id, player.posX, player.posY),
  goFloor: (f) => { currentFloor = f; maxFloor = Math.max(maxFloor, f); move(initPos[f]?.[0] ?? 5, initPos[f]?.[1] ?? 9); draw(); },
  get floorMap() { return LvMap[currentFloor]; },
  get playerImgOk() { return !!playerImg[player.toward]; },
};

// ---- boot -----------------------------------------------------------------
(async function () {
  await loadAssets();
  setInterval(() => { frame ^= 1; gameSec += 0.5;
    document.getElementById("hud-time").textContent = `${Math.floor(gameSec / 60)}m ${Math.floor(gameSec % 60)}s`;
    draw();
  }, 500);
  draw();
})();
