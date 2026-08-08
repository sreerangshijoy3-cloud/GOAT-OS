/* =========================================================
   GOAT OS — script.js
   Window manager + tab system + apps
   ========================================================= */

const store = {
  get(key, fallback){ try{ const v = localStorage.getItem(key); return v===null? fallback : JSON.parse(v); }catch{ return fallback; } },
  set(key, val){ try{ localStorage.setItem(key, JSON.stringify(val)); }catch{} }
};

/* ---------- Toasts ---------- */
function notify(text, type=""){
  const host = document.getElementById("toastHost");
  const t = document.createElement("div");
  t.className = "toast " + type;
  t.textContent = text;
  host.appendChild(t);
  setTimeout(()=>{ t.style.opacity="0"; t.style.transition="opacity .3s"; setTimeout(()=>t.remove(),300); }, 2600);
}

/* ---------- Login ---------- */
function initLogin(){
  const savedUser = store.get("goatos_user", "");
  const input = document.getElementById("username");
  if(savedUser) input.value = savedUser;

  const login = () => {
    const name = input.value.trim();
    if(!name){ input.focus(); input.style.borderColor = "var(--danger)"; return; }
    store.set("goatos_user", name);
    document.getElementById("login").style.display = "none";
    document.getElementById("os").style.display = "block";
    notify("Welcome back, " + name);
  };

  document.getElementById("enterBtn").addEventListener("click", login);
  input.addEventListener("keydown", e => { if(e.key === "Enter") login(); });
  input.addEventListener("input", () => input.style.borderColor = "");
}

/* ---------- Clock ---------- */
function initClock(){
  const tick = () => { document.getElementById("time").innerText = new Date().toLocaleTimeString(); };
  tick();
  setInterval(tick, 1000);
}

/* ---------- Theme ---------- */
function initTheme(){
  const apply = (light) => {
    document.body.classList.toggle("light", light);
    store.set("goatos_theme_light", light);
  };
  apply(store.get("goatos_theme_light", false));

  const toggle = () => { apply(!document.body.classList.contains("light")); };
  document.getElementById("themeBtn").addEventListener("click", toggle);
  document.getElementById("themeSettingsBtn").addEventListener("click", toggle);
}

/* ---------- Wallpaper ---------- */
const WALLPAPERS = {
  1: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=70",
  2: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1600&q=70",
  3: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=70"
};
function setWallpaper(n){
  document.getElementById("os").style.backgroundImage = `url('${WALLPAPERS[n]}')`;
  store.set("goatos_wallpaper", n);
}
function initWallpaper(){
  const saved = store.get("goatos_wallpaper", 3);
  setWallpaper(saved);
  document.querySelectorAll(".wallSwatch").forEach(btn=>{
    btn.addEventListener("click", () => { setWallpaper(Number(btn.dataset.wall)); notify("Wallpaper updated"); });
  });
}
function cycleWallpaper(){
  const cur = store.get("goatos_wallpaper", 3);
  const next = (cur % 3) + 1;
  setWallpaper(next);
  notify("Wallpaper updated");
}

/* =========================================================
   Window manager (feature: real tab/taskbar system)
   ========================================================= */
const APP_TITLES = {
  notes:"Notes", browser:"Browser", terminal:"Terminal", calc:"Calculator",
  files:"Files", calendar:"Calendar", music:"Music", weather:"Weather",
  timer:"Stopwatch", settings:"Settings"
};

const wm = {
  windows:{},   // id -> {el, minimized, maximized, prevRect}
  order:[],     // stacking order
  zTop:10
};

function tabstripEl(){ return document.getElementById("tabstrip"); }

function renderTabs(){
  const strip = tabstripEl();
  strip.innerHTML = "";
  wm.order.forEach(id=>{
    const w = wm.windows[id];
    const tab = document.createElement("div");
    tab.className = "tab" + (!w.minimized && isFocused(id) ? " active" : "");
    tab.innerHTML = `<span class="dot"></span><span>${APP_TITLES[id]}</span><span class="tabClose">&times;</span>`;
    tab.addEventListener("click", (e)=>{
      if(e.target.classList.contains("tabClose")){ closeApp(id); return; }
      if(w.minimized){ restoreApp(id); } else { focusApp(id); }
    });
    strip.appendChild(tab);
  });
}

function isFocused(id){
  return wm.windows[id] && wm.windows[id].el.style.zIndex == wm.zTop;
}

function focusApp(id){
  const w = wm.windows[id];
  if(!w) return;
  wm.zTop++;
  w.el.style.zIndex = wm.zTop;
  renderTabs();
}

function openApp(id){
  const el = document.getElementById("win-" + id);
  if(!el) return;
  let w = wm.windows[id];
  if(!w){
    w = { el, minimized:false, maximized:false, prevRect:null };
    wm.windows[id] = w;
  }
  if(!wm.order.includes(id)) wm.order.push(id);
  el.classList.add("open");
  w.minimized = false;
  document.querySelector(`.dockicon[data-app="${id}"]`)?.classList.add("running");
  focusApp(id);
  if(id === "calendar") renderCalendar();
  if(id === "music" && !music.initialized) initMusicUI();
}

function closeApp(id){
  const w = wm.windows[id];
  if(!w) return;
  w.el.classList.remove("open");
  w.el.classList.remove("maximized");
  w.minimized = false;
  w.maximized = false;
  wm.order = wm.order.filter(x=>x!==id);
  document.querySelector(`.dockicon[data-app="${id}"]`)?.classList.remove("running");
  renderTabs();
}

function minimizeApp(id){
  const w = wm.windows[id];
  if(!w) return;
  w.el.classList.remove("open");
  w.minimized = true;
  renderTabs();
}

function restoreApp(id){
  const w = wm.windows[id];
  if(!w) return;
  w.el.classList.add("open");
  w.minimized = false;
  focusApp(id);
}

function toggleMaximize(id){
  const w = wm.windows[id];
  if(!w) return;
  if(!w.maximized){
    w.prevRect = { top:w.el.style.top, left:w.el.style.left, width:w.el.style.width, height:w.el.style.height };
    w.el.classList.add("maximized");
    w.maximized = true;
  } else {
    w.el.classList.remove("maximized");
    if(w.prevRect){
      w.el.style.top = w.prevRect.top;
      w.el.style.left = w.prevRect.left;
      w.el.style.width = w.prevRect.width;
      w.el.style.height = w.prevRect.height;
    }
    w.maximized = false;
  }
}

function initWindowChrome(){
  document.querySelectorAll(".window").forEach(win=>{
    const id = win.id.replace("win-","");
    const header = win.querySelector(".header");

    // focus on click anywhere in window
    win.addEventListener("mousedown", ()=> focusApp(id));

    // drag
    let dragging=false, offX=0, offY=0;
    header.addEventListener("mousedown",(e)=>{
      if(e.target.closest(".wbtn")) return;
      if(wm.windows[id] && wm.windows[id].maximized) return;
      dragging = true;
      offX = e.clientX - win.offsetLeft;
      offY = e.clientY - win.offsetTop;
    });
    document.addEventListener("mousemove",(e)=>{
      if(dragging){
        win.style.left = Math.max(0, e.clientX - offX) + "px";
        win.style.top = Math.max(52, e.clientY - offY) + "px";
      }
      if(resizing===win){
        const rect = win.getBoundingClientRect();
        win.style.width = Math.max(280, e.clientX - rect.left) + "px";
        win.style.height = Math.max(180, e.clientY - rect.top) + "px";
      }
    });
    document.addEventListener("mouseup",()=>{ dragging=false; if(resizing===win) resizing=null; });

    // window buttons
    win.querySelectorAll(".wbtn").forEach(btn=>{
      btn.addEventListener("click",(e)=>{
        e.stopPropagation();
        const act = btn.dataset.act;
        if(act==="close") closeApp(id);
        if(act==="min") minimizeApp(id);
        if(act==="max") toggleMaximize(id);
      });
    });
  });

  // resize handles (shared drag state via closures above using `resizing`)
  document.querySelectorAll(".window .resizer").forEach(handle=>{
    handle.addEventListener("mousedown",(e)=>{
      e.stopPropagation();
      resizing = handle.closest(".window");
    });
  });
}
let resizing = null;

function initDock(){
  document.querySelectorAll(".dockicon").forEach(btn=>{
    btn.addEventListener("click", ()=> openApp(btn.dataset.app));
  });
}

/* ---------- Context menu (feature) ---------- */
function initContextMenu(){
  const menu = document.getElementById("contextMenu");
  const desktop = document.getElementById("os");

  desktop.addEventListener("contextmenu",(e)=>{
    if(e.target.closest(".window") || e.target.closest("#dock") || e.target.closest("#topbar")) return;
    e.preventDefault();
    menu.classList.remove("hidden");
    menu.style.left = e.pageX + "px";
    menu.style.top = e.pageY + "px";
  });
  document.addEventListener("click", ()=> menu.classList.add("hidden"));
  document.addEventListener("keydown", e=>{ if(e.key==="Escape") menu.classList.add("hidden"); });

  menu.addEventListener("click",(e)=>{
    const action = e.target.dataset.action;
    if(action === "newnote"){ openApp("notes"); }
    if(action === "wallpaper"){ cycleWallpaper(); }
    if(action === "theme"){ document.getElementById("themeBtn").click(); }
    if(action === "about"){ notify("GOAT OS v2.0 — aurora build"); }
  });
}

/* =========================================================
   Apps
   ========================================================= */

/* Notes — autosaves */
function initNotes(){
  const area = document.getElementById("notesArea");
  area.value = store.get("goatos_notes", "");
  area.addEventListener("input", ()=> store.set("goatos_notes", area.value));
}

/* Browser */
function initBrowser(){
  const run = () => {
    const q = document.getElementById("search").value.trim();
    if(!q) return;
    window.open("https://www.google.com/search?q=" + encodeURIComponent(q), "_blank");
  };
  document.getElementById("searchBtn").addEventListener("click", run);
  document.getElementById("search").addEventListener("keydown", e=>{ if(e.key==="Enter") run(); });
}

/* Calculator — safe expression evaluation (no raw eval) */
function safeCalc(expr){
  if(!/^[0-9+\-*/().\s%^]+$/.test(expr)) throw new Error("Invalid characters");
  const js = expr.replace(/\^/g, "**");
  // eslint-disable-next-line no-new-func
  const fn = new Function("\"use strict\"; return (" + js + ");");
  const result = fn();
  if(typeof result !== "number" || !isFinite(result)) throw new Error("Invalid result");
  return result;
}
function initCalc(){
  const run = () => {
    const input = document.getElementById("calcInput").value.trim();
    const out = document.getElementById("calcResult");
    if(!input){ return; }
    try{ out.innerText = String(safeCalc(input)); }
    catch{ out.innerText = "Error"; }
  };
  document.getElementById("calcBtn").addEventListener("click", run);
  document.getElementById("calcInput").addEventListener("keydown", e=>{ if(e.key==="Enter") run(); });
}

/* Terminal */
function initTerminal(){
  const cmdInput = document.getElementById("cmd");
  cmdInput.addEventListener("keydown", (e) => {
    if(e.key !== "Enter") return;
    const raw = e.target.value.trim();
    const cmd = raw.toLowerCase();
    const out = document.getElementById("output");
    let response = "";

    if(cmd === "help"){
      response = "help, date, clear, echo <text>, whoami, apps, theme, wallpaper <1-3>, calc <expr>";
    } else if(cmd === "date"){
      response = new Date().toString();
    } else if(cmd.startsWith("echo ")){
      response = raw.slice(5);
    } else if(cmd === "whoami"){
      response = store.get("goatos_user", "GOAT OS user");
    } else if(cmd === "apps"){
      response = Object.values(APP_TITLES).join(", ");
    } else if(cmd === "theme"){
      document.getElementById("themeBtn").click();
      response = "theme toggled";
    } else if(cmd.startsWith("wallpaper ")){
      const n = Number(cmd.split(" ")[1]);
      if(n>=1 && n<=3){ setWallpaper(n); response = "wallpaper set to " + n; }
      else response = "usage: wallpaper <1-3>";
    } else if(cmd.startsWith("calc ")){
      try{ response = String(safeCalc(raw.slice(5))); } catch { response = "error"; }
    } else if(cmd === "clear"){
      out.innerHTML = "";
      e.target.value = "";
      return;
    } else {
      response = "command not found: " + raw;
    }

    out.innerHTML += `<div>&gt; ${escapeHtml(raw)}</div>`;
    out.innerHTML += `<div>${escapeHtml(response)}</div>`;
    e.target.value = "";
    out.scrollTop = out.scrollHeight;
  });
}
function escapeHtml(s){ return s.replace(/[&<>]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c])); }

/* Calendar (new feature) */
let calDate = new Date();
function renderCalendar(){
  const label = document.getElementById("calLabel");
  const grid = document.getElementById("calGrid");
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  label.innerText = months[calDate.getMonth()] + " " + calDate.getFullYear();

  grid.innerHTML = "";
  ["Su","Mo","Tu","We","Th","Fr","Sa"].forEach(d=>{
    const el = document.createElement("div");
    el.className = "dow"; el.innerText = d;
    grid.appendChild(el);
  });

  const first = new Date(calDate.getFullYear(), calDate.getMonth(), 1);
  const daysInMonth = new Date(calDate.getFullYear(), calDate.getMonth()+1, 0).getDate();
  const startOffset = first.getDay();
  const today = new Date();

  for(let i=0;i<startOffset;i++){
    const el = document.createElement("div");
    el.className = "day empty";
    grid.appendChild(el);
  }
  for(let d=1; d<=daysInMonth; d++){
    const el = document.createElement("div");
    const isToday = d===today.getDate() && calDate.getMonth()===today.getMonth() && calDate.getFullYear()===today.getFullYear();
    el.className = "day" + (isToday ? " today" : "");
    el.innerText = d;
    grid.appendChild(el);
  }
}
function initCalendar(){
  document.getElementById("calPrev").addEventListener("click", ()=>{ calDate.setMonth(calDate.getMonth()-1); renderCalendar(); });
  document.getElementById("calNext").addEventListener("click", ()=>{ calDate.setMonth(calDate.getMonth()+1); renderCalendar(); });
}

/* Music player (new feature) */
const music = {
  initialized:false,
  tracks:[
    {title:"Aurora Drift", artist:"Late Signal", duration:198},
    {title:"Glass Horizon", artist:"Nine Rivers", duration:224},
    {title:"Static Bloom", artist:"Halide", duration:171}
  ],
  index:0,
  playing:false,
  elapsed:0,
  timer:null
};
function fmtTime(s){ const m=Math.floor(s/60), sec=Math.floor(s%60); return m+":"+String(sec).padStart(2,"0"); }
function musicRenderPlaylist(){
  const ul = document.getElementById("playlist");
  ul.innerHTML = "";
  music.tracks.forEach((t,i)=>{
    const li = document.createElement("li");
    li.className = i===music.index ? "active" : "";
    li.innerHTML = `<span>${t.title} &middot; ${t.artist}</span><span>${fmtTime(t.duration)}</span>`;
    li.addEventListener("click", ()=> musicLoad(i, true));
    ul.appendChild(li);
  });
}
function musicLoad(i, autoplay){
  music.index = i;
  music.elapsed = 0;
  const t = music.tracks[i];
  document.getElementById("trackTitle").innerText = t.title;
  document.getElementById("trackArtist").innerText = t.artist;
  document.getElementById("tTotal").innerText = fmtTime(t.duration);
  document.getElementById("tElapsed").innerText = "0:00";
  document.getElementById("progressFill").style.width = "0%";
  musicRenderPlaylist();
  if(autoplay) musicPlay();
}
function musicPlay(){
  music.playing = true;
  document.getElementById("viz").classList.add("playing");
  document.getElementById("playBtn").innerHTML = "&#10073;&#10073;";
  clearInterval(music.timer);
  music.timer = setInterval(()=>{
    const t = music.tracks[music.index];
    music.elapsed++;
    if(music.elapsed >= t.duration){ musicNext(); return; }
    document.getElementById("tElapsed").innerText = fmtTime(music.elapsed);
    document.getElementById("progressFill").style.width = (music.elapsed/t.duration*100) + "%";
  }, 1000);
}
function musicPause(){
  music.playing = false;
  document.getElementById("viz").classList.remove("playing");
  document.getElementById("playBtn").innerHTML = "&#9654;";
  clearInterval(music.timer);
}
function musicNext(){ musicLoad((music.index+1) % music.tracks.length, true); }
function musicPrev(){ musicLoad((music.index-1+music.tracks.length) % music.tracks.length, true); }

function initMusicUI(){
  music.initialized = true;
  musicLoad(0, false);
  document.getElementById("playBtn").addEventListener("click", ()=> music.playing ? musicPause() : musicPlay());
  document.getElementById("nextBtn").addEventListener("click", musicNext);
  document.getElementById("prevBtn").addEventListener("click", musicPrev);
}

/* Stopwatch */
let timerInterval, timerSeconds = 0;
function initTimer(){
  document.getElementById("startTimerBtn").addEventListener("click", ()=>{
    if(timerInterval) return;
    timerInterval = setInterval(()=>{
      timerSeconds++;
      document.getElementById("timeDisplay").innerText = timerSeconds + "s";
    }, 1000);
  });
  document.getElementById("stopTimerBtn").addEventListener("click", ()=>{
    clearInterval(timerInterval); timerInterval = null;
  });
  document.getElementById("resetTimerBtn").addEventListener("click", ()=>{
    clearInterval(timerInterval); timerInterval = null; timerSeconds = 0;
    document.getElementById("timeDisplay").innerText = "0s";
  });
}

/* Settings extras */
function initSettingsExtras(){
  document.getElementById("aboutBtn").addEventListener("click", ()=> notify("GOAT OS v2.0 "));
}

/* =========================================================
   Boot
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  initLogin();
  initClock();
  initTheme();
  initWallpaper();
  initDock();
  initWindowChrome();
  initContextMenu();
  initNotes();
  initBrowser();
  initCalc();
  initTerminal();
  initCalendar();
  initTimer();
  initSettingsExtras();
});