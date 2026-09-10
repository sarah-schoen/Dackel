const DEFAULTS = {
  visitMinutes: 5,
  waterMinutes: 45,
  checkinsEnabled: true,
  waterEnabled: true,
  animationSpeed: 1
};

const MESSAGES = {
  greeting: [
    "Hi, how are you doing?",
    "Hi, checking in.",
    "Still doing okay?",
    "Hi! Just checking on you."
  ],
  water: [
    "Hi, want some water?",
    "Hi, water check.",
    "A little water break? 💧"
  ],
  stretch: [
    "Hi, quick stretch?",
    "Tiny stretch break? 🐾"
  ],
  break: [
    "Hi, need a break?",
    "Maybe a tiny break?"
  ]
};

const appState = {
  settings: loadSettings(),
  messages: [],
  quietUntil: 0,
  nextVisit: 0,
  nextWater: 0,
  inMeeting: false
};

const params = new URLSearchParams(location.search);
const widgetMode = params.get("mode") === "widget";
const reason = params.get("reason") || "manual";

if (widgetMode) document.body.classList.add("widget");

const petButton = document.getElementById("petButton");
const pet = document.getElementById("pet");
const bubble = document.getElementById("bubble");
const bubbleText = document.getElementById("bubbleText");
const fullPanel = document.getElementById("fullPanel");
const messagesEl = document.getElementById("messages");
const statusText = document.getElementById("statusText");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const closeButton = document.getElementById("closeButton");

function loadSettings() {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem("dackelSettings") || "{}")) };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveSettings() {
  localStorage.setItem("dackelSettings", JSON.stringify(appState.settings));
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function showBubble(text, seconds = 8) {
  bubbleText.textContent = text;
  bubble.classList.remove("hidden");
  clearTimeout(showBubble.timer);
  showBubble.timer = setTimeout(() => bubble.classList.add("hidden"), seconds * 1000);
}

function addMessage(who, text) {
  appState.messages.push({ who, text });
  if (appState.messages.length > 30) appState.messages.shift();

  const row = document.createElement("div");
  row.className = `message-row ${who}-row`;

  if (who === "pet") {
    const avatar = document.createElement("img");
    avatar.className = "message-avatar";
    avatar.src = "assets/dackel.png";
    avatar.alt = "";
    row.appendChild(avatar);
  }

  const el = document.createElement("div");
  el.className = `message ${who}`;
  el.textContent = text;
  row.appendChild(el);

  const time = document.createElement("span");
  time.className = "message-time";
  time.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  row.appendChild(time);

  messagesEl.appendChild(row);
  requestAnimationFrame(() => {
    messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: "smooth" });
  });
}

function petSay(text, seconds = 8, floating = true) {
  if (floating) showBubble(text, seconds);
  addMessage("pet", text);
  petButton.classList.remove("happy");
  void petButton.offsetWidth;
  petButton.classList.add("happy");
}

function userSay(text) {
  addMessage("user", text);
}

function offlineReply(input) {
  const text = input.toLowerCase().trim();

  if (/^(hi|hello|hey|hallo|hey there)\b/.test(text)) {
    return pick(["Hi! 🐾", "Hi there! Good to see you.", "Hello! I'm right here."]);
  }
  if (text.includes("nice to meet")) {
    return "Nice to meet you too. I think we'll get along nicely. 🐶";
  }
  if (text.includes("how are you") || text.includes("how're you")) {
    return "I'm good — tiny paws, full attention. 🐾";
  }
  if (text.includes("tired") || text.includes("exhausted")) {
    return "Then let's keep things gentle. A short break might help.";
  }
  if (text.includes("water") || text.includes("thirst")) {
    return "Good call. Go grab a few sips. 💧";
  }
  if (text.includes("stress") || text.includes("stressed")) {
    return "Take one slow breath with me. Then we can tackle the next thing.";
  }
  if (text.includes("break")) {
    return "Yes. Even a tiny break counts.";
  }
  if (text.includes("stretch")) {
    return "Paws up! Roll your shoulders and have a quick stretch. 🐾";
  }
  if (text.includes("bye") || text.includes("good night")) {
    return "Bye! I'll be here when you get back. 🐶";
  }

  return pick([
    "I'm listening. 🐾",
    "Got you. What do you need right now?",
    "Okay. One small step at a time."
  ]);
}

function setThinking(isThinking) {
  const indicator = document.getElementById("typingIndicator");
  if (!indicator) return;
  indicator.classList.toggle("hidden", !isThinking);
  if (isThinking) {
    requestAnimationFrame(() => {
      messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: "smooth" });
    });
  }
}

async function aiReply(input) {
  // Optional hook: set window.DACKEL_AI_ENDPOINT to your own HTTPS proxy.
  // The proxy should accept {message, history} and return {reply}.
  if (!window.DACKEL_AI_ENDPOINT) return offlineReply(input);

  try {
    const response = await fetch(window.DACKEL_AI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: input,
        history: appState.messages.slice(-12)
      })
    });
    if (!response.ok) throw new Error("AI endpoint error");
    const data = await response.json();
    return data.reply || offlineReply(input);
  } catch {
    return offlineReply(input);
  }
}

function handleReason(value) {
  if (value === "water") petSay(pick(MESSAGES.water));
  else if (value === "checkin") petSay(pick(MESSAGES.greeting));
  else if (value === "stretch") petSay(pick(MESSAGES.stretch));
  else if (value === "break") petSay(pick(MESSAGES.break));
  else petSay(pick(MESSAGES.greeting));
}

function schedule() {
  const now = Date.now();
  appState.nextVisit = now + appState.settings.visitMinutes * 60000;
  appState.nextWater = now + appState.settings.waterMinutes * 60000;
}

function tick() {
  if (appState.inMeeting || Date.now() < appState.quietUntil) return;

  const now = Date.now();

  if (appState.settings.checkinsEnabled && now >= appState.nextVisit) {
    appState.nextVisit = now + appState.settings.visitMinutes * 60000;
    petSay(pick(MESSAGES.greeting));
    return;
  }

  if (appState.settings.waterEnabled && now >= appState.nextWater) {
    appState.nextWater = now + appState.settings.waterMinutes * 60000;
    petSay(pick(MESSAGES.water));
  }
}

function setupSettings() {
  const visit = document.getElementById("visitFrequency");
  const water = document.getElementById("waterFrequency");
  const checkins = document.getElementById("checkinsEnabled");
  const waterEnabled = document.getElementById("waterEnabled");

  visit.value = String(appState.settings.visitMinutes);
  water.value = String(appState.settings.waterMinutes);
  checkins.checked = appState.settings.checkinsEnabled;
  waterEnabled.checked = appState.settings.waterEnabled;

  visit.addEventListener("change", () => {
    appState.settings.visitMinutes = Number(visit.value);
    saveSettings();
    schedule();
  });

  water.addEventListener("change", () => {
    appState.settings.waterMinutes = Number(water.value);
    saveSettings();
    schedule();
  });

  checkins.addEventListener("change", () => {
    appState.settings.checkinsEnabled = checkins.checked;
    saveSettings();
  });

  waterEnabled.addEventListener("change", () => {
    appState.settings.waterEnabled = waterEnabled.checked;
    saveSettings();
  });
}

petButton.addEventListener("click", () => {
  if (widgetMode) return;
  if (fullPanel) fullPanel.classList.remove("hidden");
  chatInput?.focus();
});

closeButton?.addEventListener("click", () => {
  // A RoomOS WebView can be closed by the macro; here we simply hide the panel.
  fullPanel.classList.add("hidden");
});

chatForm?.addEventListener("submit", async event => {
  event.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  chatInput.value = "";
  chatInput.disabled = true;
  const sendButton = chatForm.querySelector("button");
  if (sendButton) sendButton.disabled = true;

  userSay(text);
  statusText.textContent = "Dackel denkt …";
  setThinking(true);

  // A tiny pause makes the typing state feel natural even for instant/offline replies.
  const started = Date.now();
  const reply = await aiReply(text);
  const remaining = Math.max(0, 650 - (Date.now() - started));
  setTimeout(() => {
    setThinking(false);
    statusText.textContent = "Just hanging out.";
    // Chat replies stay inside the messenger — never in the floating speech bubble.
    petSay(reply, 8, false);
    chatInput.disabled = false;
    if (sendButton) sendButton.disabled = false;
    chatInput.focus();
  }, remaining);
});

document.querySelectorAll("[data-action]").forEach(button => {
  button.addEventListener("click", () => {
    const action = button.dataset.action;
    if (action === "water") petSay(pick(MESSAGES.water));
    if (action === "stretch") petSay(pick(MESSAGES.stretch));
    if (action === "break") petSay(pick(MESSAGES.break));
    if (action === "quiet") {
      appState.quietUntil = Date.now() + 30 * 60000;
      petSay("Okay. Quiet paws for 30 minutes. 🤫", 5);
    }
  });
});

setupSettings();
schedule();
handleReason(reason);

// Low-cost idle animation: CSS does the visual work; JS only handles reminders.
setInterval(tick, 15000);
setInterval(() => {
  if (!widgetMode && Math.random() < 0.14) {
    petButton.classList.add("walking");
    setTimeout(() => petButton.classList.remove("walking"), 900);
  }
}, 7000);

// Tiny blink using a transform rather than redrawing the supplied image.
setInterval(() => {
  if (Math.random() < 0.18) {
    pet.style.transform = "scaleY(.985)";
    setTimeout(() => pet.style.transform = "", 110);
  }
}, 1800);
