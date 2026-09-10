const S = {
  settings: load(),
  quietUntil: 0,
  nextVisit: Date.now()+5*60000,
  nextWater: Date.now()+45*60000,
  messages:[]
};
const MSG={
  greeting:["Hi, how are you doing?","Hi, checking in.","Still doing okay?"],
  water:["Hi, want some water?","Hi, water check.","A little water break? 💧"],
  stretch:["Hi, quick stretch?","Tiny stretch break? 🐾"],
  break:["Hi, need a break?","Maybe a tiny break?"]
};
const pet=document.getElementById("pet"), world=document.getElementById("petWorld"),
      bubble=document.getElementById("bubble"), bubbleText=document.getElementById("bubbleText"),
      chat=document.getElementById("chatPanel"), messages=document.getElementById("messages"),
      input=document.getElementById("chatInput"), settings=document.getElementById("settings"),
      status=document.getElementById("status");

function load(){try{return {...{visit:5,water:45,checkins:true,waterOn:true},...JSON.parse(localStorage.dackelV2||"{}")}}catch{return {visit:5,water:45,checkins:true,waterOn:true}}}
function save(){localStorage.dackelV2=JSON.stringify(S.settings)}
function pick(a){return a[Math.floor(Math.random()*a.length)]}
function say(text,secs=8){
  bubbleText.textContent=text; bubble.classList.remove("hidden");
  pet.classList.remove("happy"); void pet.offsetWidth; pet.classList.add("happy");
  clearTimeout(say.t); say.t=setTimeout(()=>bubble.classList.add("hidden"),secs*1000);
  add("pet",text);
}
function add(who,text){
  S.messages.push({who,text}); if(S.messages.length>30)S.messages.shift();
  const e=document.createElement("div");e.className="message "+who;e.textContent=text;
  messages.appendChild(e);messages.scrollTop=messages.scrollHeight
}
function reply(t){
  const x=t.toLowerCase();
  if(/^(hi|hello|hey|hallo)\b/.test(x))return pick(["Hi! 🐾","Hello! Good to see you.","Hi there!"]);
  if(x.includes("tired")||x.includes("exhausted"))return "Then let's keep things gentle. A short break might help.";
  if(x.includes("water")||x.includes("thirst"))return "Good call. Go grab a few sips. 💧";
  if(x.includes("stress"))return "One slow breath first. Then the next small thing.";
  if(x.includes("stretch"))return "Paws up! Roll your shoulders and have a quick stretch. 🐾";
  if(x.includes("break"))return "Yes. Even a tiny break counts.";
  if(x.includes("how are you"))return "I'm good — tiny paws, full attention. 🐶";
  return pick(["I'm listening. 🐾","Got you. One small step at a time.","Okay. I'm right here."])
}
function walkIn(reason){
  world.style.transform="translateX(-42vw)";
  pet.classList.add("walk");
  setTimeout(()=>{world.style.transform="translateX(0)";pet.classList.remove("walk");reasonFor(reason)},1450)
}
function reasonFor(r){
  if(r==="water")say(pick(MSG.water));
  else if(r==="stretch")say(pick(MSG.stretch));
  else if(r==="break")say(pick(MSG.break));
  else say(pick(MSG.greeting))
}
function walkOut(){
  pet.classList.add("walk"); world.style.transform="translateX(42vw)";
  setTimeout(()=>{world.style.transform="translateX(0)";pet.classList.remove("walk");bubble.classList.add("hidden")},1500)
}
function visit(r){walkIn(r);setTimeout(()=>{if(r!=="manual")setTimeout(walkOut,11000)},1900)}
function quiet(){S.quietUntil=Date.now()+30*60000;say("Okay. Quiet paws for 30 minutes. 🤫",5)}
pet.addEventListener("click",()=>{chat.classList.remove("hidden");input.focus()})
document.getElementById("closeChat").onclick=()=>chat.classList.add("hidden")
document.getElementById("settingsButton").onclick=()=>settings.classList.toggle("hidden")
document.getElementById("closeSettings").onclick=()=>settings.classList.add("hidden")
document.getElementById("chatForm").addEventListener("submit",e=>{
  e.preventDefault();const t=input.value.trim();if(!t)return;input.value="";add("user",t);
  status.innerHTML="<span></span> Thinking…";setTimeout(()=>{status.innerHTML="<span></span> Hanging out quietly.";say(reply(t))},350)
})
document.querySelectorAll("[data-action]").forEach(b=>b.onclick=()=>{const a=b.dataset.action;
  if(a==="quiet")quiet(); else visit(a)
})
const vf=document.getElementById("visitFrequency"),wf=document.getElementById("waterFrequency"),
      ce=document.getElementById("checkins"),we=document.getElementById("water");
vf.value=S.settings.visit;wf.value=S.settings.water;ce.checked=S.settings.checkins;we.checked=S.settings.waterOn;
vf.onchange=()=>{S.settings.visit=+vf.value;save();S.nextVisit=Date.now()+S.settings.visit*60000}
wf.onchange=()=>{S.settings.water=+wf.value;save();S.nextWater=Date.now()+S.settings.water*60000}
ce.onchange=()=>{S.settings.checkins=ce.checked;save()}
we.onchange=()=>{S.settings.waterOn=we.checked;save()}

function tick(){
  if(Date.now()<S.quietUntil)return;
  const now=Date.now();
  if(S.settings.checkins&&now>=S.nextVisit){S.nextVisit=now+S.settings.visit*60000;visit("checkin");return}
  if(S.settings.waterOn&&now>=S.nextWater){S.nextWater=now+S.settings.water*60000;visit("water")}
}
setInterval(tick,15000);

// Keep the companion alive but cheap: CSS handles the continuous animation.
setInterval(()=>{if(Math.random()<.2){pet.style.transform="translateX(-50%) scaleY(.985)";setTimeout(()=>pet.style.transform="",110)}},1900);

// On initial opening, look like the dog has just wandered in.
setTimeout(()=>visit(new URLSearchParams(location.search).get("reason")||"manual"),500);
