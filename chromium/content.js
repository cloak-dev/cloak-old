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
