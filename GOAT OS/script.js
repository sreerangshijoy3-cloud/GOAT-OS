function login(){
document.getElementById("login").style.display="none";
document.getElementById("os").style.display="block";
}

setInterval(()=>{
document.getElementById("time").innerText=new Date().toLocaleTimeString();
let c=document.getElementById("bigClock");
if(c) c.innerText=new Date().toLocaleTimeString();
},1000);

let z=1;
function openApp(id){
let el=document.getElementById(id);
el.style.display="block";
z++;el.style.zIndex=z;
}
function closeApp(id){
document.getElementById(id).style.display="none";
}

function search(){
let q=document.getElementById("search").value;
window.open("https://google.com/search?q="+encodeURIComponent(q));
}

function calculate(){
try{
document.getElementById("calcResult").innerText=
eval(document.getElementById("calcInput").value);
}catch{document.getElementById("calcResult").innerText="Error";}
}

function terminalRun(e){
  if(e.key==="Enter"){
    let cmd = e.target.value.trim().toLowerCase();
    let out = document.getElementById("output");

    let response = "";

    if(cmd==="help"){
      response = "help, date, clear, whoami";
    }
    else if(cmd==="date"){
      response = new Date().toString();
    }
    else if(cmd.startsWith("echo ")){
      response = cmd.slice(5);
    }
    else if(cmd==="whoami"){
      response = "GOAT OS user";
    }
    else if(cmd==="clear"){
      out.innerHTML="";
      e.target.value="";
      return;
    }
    else{
      response = "command not found";
    }

    out.innerHTML += "<div>> " + cmd + "</div>";
    out.innerHTML += "<div>" + response + "</div>";

    e.target.value="";
    out.scrollTop = out.scrollHeight;
  }
}

function setWallpaper(n){
let os=document.getElementById("os");

if(n===1) os.style.backgroundImage="url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e')";
if(n===2) os.style.backgroundImage="url('https://images.unsplash.com/photo-1757269267274-085b02b0ce8a?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')";
if(n===3) os.style.backgroundImage="url('https://images.unsplash.com/photo-1519681393784-d120267933ba')";
}


function wall(n){
 
}

let activeWindow = null;
let offsetX = 0;
let offsetY = 0;

document.querySelectorAll(".window").forEach(win => {
  let header = win.querySelector(".header");

  header.addEventListener("mousedown", (e) => {
    activeWindow = win;
    offsetX = e.clientX - win.offsetLeft;
    offsetY = e.clientY - win.offsetTop;

    activeWindow.style.zIndex = Date.now();
  });
});

document.addEventListener("mousemove", (e) => {
  if (activeWindow) {
    activeWindow.style.left = (e.clientX - offsetX) + "px";
    activeWindow.style.top = (e.clientY - offsetY) + "px";
  }
});

document.addEventListener("mouseup", () => {
  activeWindow = null;
});

