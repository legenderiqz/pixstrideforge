// --- HTML’den aldığımız elementler ---
const canvas      = document.getElementById("canvas");
const ctx         = canvas.getContext("2d");
const zoomInBtn   = document.getElementById("zoom-in");
const zoomOutBtn  = document.getElementById("zoom-out");
const upBtn       = document.getElementById("up");
const downBtn     = document.getElementById("down");
const leftBtn     = document.getElementById("left");
const rightBtn    = document.getElementById("right");
const colorButton = document.getElementById("color-button");
const colorPalette= document.getElementById("color-palette");
const puanDiv     = document.getElementById("puan");

canvas.width  = window.innerWidth;
canvas.height = window.innerHeight;

const GRID_CELLS    = 64;
const CELL_SIZE     = 20;
const MAX_ZOOM      = 4;
const MIN_ZOOM      = 0.2;
const ZOOM_FACTOR   = 1.2;
const MOVE_SPEED    = 10;

let puan = 100;
let zoomLevel = 1;
let offsetX   = 0;
let offsetY   = 0;
let pixels    = {};  // { "x,y": color }
let cooldown  = false;
let paletteOpen = false;

const colors = [
  "#000000","#ffffff","#ff0000","#00ff00","#0000ff","#ffff00",
  "#ff00ff","#00ffff","#800000","#008000","#000080","#808000",
  "#800080","#008080","#c0c0c0","#808080"
];

let selectedColor = colors[0];
colorButton.style.backgroundColor = selectedColor;

// Buraya Cloudflare Worker URL’inizi yazın:
const WORKER_URL = "https://purple-mud-f3a4.pixstrideforge.workers.dev";

window.onload = async () => {
  await loadPixels();
  draw();
};

// --- Yardımcı fonksiyonlar ---
function screenToGrid(clientX, clientY){
  const rect = canvas.getBoundingClientRect();
  const sx = clientX - rect.left;
  const sy = clientY - rect.top;
  const wx = (sx - offsetX) / zoomLevel;
  const wy = (sy - offsetY) / zoomLevel;
  const gx = Math.floor(wx / CELL_SIZE);
  const gy = Math.floor(wy / CELL_SIZE);
  return { gx, gy };
}

function togglePalette() {
  paletteOpen = !paletteOpen;
  colorPalette.style.display = paletteOpen ? "flex" : "none";
}

function createColorSwatches(){
  colors.forEach(color => {
    const swatch = document.createElement("div");
    swatch.style.width = "30px";  
    swatch.style.height = "30px";  
    swatch.style.borderRadius = "4px";  
    swatch.style.cursor = "pointer";  
    swatch.style.backgroundColor = color;  
    swatch.title = color;  
    colorPalette.appendChild(swatch);  
    swatch.addEventListener("click", () => {  
      selectedColor = color;  
      colorButton.style.backgroundColor = selectedColor;  
      colorPalette.style.display = "none";  
    });
  });
}

colorButton.addEventListener("click", togglePalette);
createColorSwatches();

// --- Pixel atma ve backend ile iletişim ---
async function sendPixel(gx, gy, color){
  if(cooldown) return; // cooldown varsa atma
  try{
    const res = await fetch(`${WORKER_URL}/pixel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ x: gx, y: gy, color })
    });
    if(!res.ok) throw new Error("Sunucuda hata");
    const data = await res.json();
    if(data.success){
      pixels[`${gx},${gy}`] = color;
      draw();
      // cooldown ve puan
      puan -= 1;
      puanDiv.innerHTML = "Puan: " + puan;
      cooldown = true;
      setTimeout(()=>{ cooldown = false; puan = Math.min(100, puan+1); puanDiv.innerHTML = "Puan: " + puan; }, 5000); // cooldown 5s
    }
  }catch(err){
    console.error("Pixel gönderilemedi:", err);
    alert("Pixel kaydedilemedi");
  }
}

// --- Tüm pikselleri yükleme ---
async function loadPixels(){
  try{
    const res = await fetch(`${WORKER_URL}/pixels`);
    if(!res.ok) throw new Error("Sunucuda hata");
    const data = await res.json();
    data.forEach(p => { pixels[`${p.x},${p.y}`] = p.color; });
    draw();
  }catch(err){
    console.error("Pikseller çekilemedi:", err);
  }
}

// --- Canvas click event ---
canvas.addEventListener("click", e => {
  const { gx, gy } = screenToGrid(e.clientX, e.clientY);
  if(puan > 0){
    sendPixel(gx, gy, selectedColor);
  }
});

// --- Draw fonksiyonu ---
function draw(){
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.setTransform(zoomLevel,0,0,zoomLevel,offsetX,offsetY);
  for(let key in pixels){
    const [x,y] = key.split(",").map(Number);
    ctx.fillStyle = pixels[key];
    ctx.fillRect(x*CELL_SIZE, y*CELL_SIZE, CELL_SIZE, CELL_SIZE);
  }
  if(zoomLevel >= 0.7){
    ctx.strokeStyle = "#777";
    ctx.lineWidth = 0.5/zoomLevel;
    for(let y=0;y<GRID_CELLS;y++){
      for(let x=0;x<GRID_CELLS;x++){
        ctx.strokeRect(x*CELL_SIZE,y*CELL_SIZE,CELL_SIZE,CELL_SIZE);
      }
    }
  }
  ctx.lineWidth = 3/zoomLevel;
  ctx.strokeStyle = "#000";
  ctx.strokeRect(0,0,GRID_CELLS*CELL_SIZE,GRID_CELLS*CELL_SIZE);
}

// --- Kamera ve zoom kontrolleri ---
function clampCamera() {
  const maxOffsetX = canvas.width/2;
  const maxOffsetY = canvas.height/2;
  const worldScreenW = GRID_CELLS*CELL_SIZE*zoomLevel;
  const worldScreenH = GRID_CELLS*CELL_SIZE*zoomLevel;
  offsetX = Math.min(maxOffsetX, Math.max(-worldScreenW+maxOffsetX, offsetX));
  offsetY = Math.min(maxOffsetY, Math.max(-worldScreenH+maxOffsetY, offsetY));
}

function doZoom(factor){
  const cx = canvas.width/2, cy = canvas.height/2;
  const wx = (cx - offsetX)/zoomLevel;
  const wy = (cy - offsetY)/zoomLevel;
  zoomLevel *= factor;
  zoomLevel = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomLevel));
  offsetX = cx - wx*zoomLevel;
  offsetY = cy - wy*zoomLevel;
  clampCamera();
  draw();
}

zoomInBtn.addEventListener("click", ()=>doZoom(ZOOM_FACTOR));
zoomOutBtn.addEventListener("click", ()=>doZoom(1/ZOOM_FACTOR));

function moveCamera(dx, dy){
  offsetX += dx; offsetY += dy;
  clampCamera(); draw();
}

upBtn.addEventListener("click", ()=>moveCamera(0,MOVE_SPEED));
downBtn.addEventListener("click", ()=>moveCamera(0,-MOVE_SPEED));
leftBtn.addEventListener("click", ()=>moveCamera(MOVE_SPEED,0));
rightBtn.addEventListener("click", ()=>moveCamera(-MOVE_SPEED,0));
