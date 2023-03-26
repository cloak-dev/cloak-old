const url = chrome.runtime.getURL("assets/logo.png");

const img = document.createElement("img");
img.id = "cloak-logo";
img.src = url;
img.style.transform = "scale(0.5)";
img.style.visibility = "hidden";

const button = document.createElement("button");
button.id = "cloak-button";
button.style.position = "fixed";
button.style.top = "10px";
button.style.right = "10px";
button.style.background = "none";
button.style.outline = "none";
button.style.fontSize = "1.2rem";
button.style.visibility = "hidden";
button.style.cursor = "pointer";
button.innerText = "Start Encrypting";

document.body.appendChild(button);
document.body.appendChild(img);

const scripts = {
    localhost: { path: "scripts/basic.js" },
    "meet.google.com": { path: "scripts/google-meet.js" },
    "web.whatsapp.com": { path: "scripts/whatsapp.js" },
};

const s = document.createElement("script");

const hostname = new URL(window.location.href).hostname;

s.src = chrome.runtime.getURL(scripts[hostname].path);
(document.head || document.documentElement).appendChild(s);
s.onload = () => s.parentNode.removeChild(s);
