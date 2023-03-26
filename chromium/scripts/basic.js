class E2EE {
    arrayBufferToString(buffer) {
        return new TextDecoder().decode(buffer);
    }

    stringToArrayBuffer(text) {
        return new TextEncoder().encode(text);
    }

    generateIv() {
        return crypto.getRandomValues(new Uint8Array(16));
    }

    /**
     * @see https://github.com/mdn/dom-examples/blob/master/web-crypto/derive-bits/ecdh.js
     */
    async generateKey() {
        this.key = await window.crypto.subtle.generateKey(
            { name: "ECDH", namedCurve: "P-256" },
            false,
            ["deriveBits"]
        );
    }

    async encrypt(plaintext) {
        const counter = this.generateIv();
        const buffer = await crypto.subtle.encrypt(
            {
                name: "AES-CTR",
                counter: counter,
                length: 128,
            },
            this.importedKey,
            this.stringToArrayBuffer(plaintext)
        );
        return { buffer, counter };
    }

    async decrypt(data) {
        const buffer = await crypto.subtle.decrypt(
            {
                name: "AES-CTR",
                counter: data.counter,
                length: 128,
            },
            this.importedKey,
            data.buffer
        );
        return this.arrayBufferToString(buffer);
    }

    getPublicKey() {
        return { publicKey: this.key.publicKey };
    }

    async setRemotePublicKey(key) {
        this.clientKey = key;

        this.sharedSecret = await window.crypto.subtle.deriveBits(
            { name: "ECDH", namedCurve: "P-256", public: this.clientKey },
            this.key.privateKey,
            256
        );

        this.importedKey = await crypto.subtle.importKey(
            "raw",
            this.sharedSecret,
            "AES-CTR",
            false,
            ["encrypt", "decrypt"]
        );
    }

    async marshal(key) {
        const exported = await window.crypto.subtle.exportKey("jwk", key);
        return JSON.stringify(exported);
    }

    async unmarshal(jwk) {
        const key = await window.crypto.subtle.importKey(
            "jwk",
            JSON.parse(jwk),
            { name: "ECDH", namedCurve: "P-256" },
            true,
            []
        );
        return key;
    }
}

let pub;
async function setup() {
    const e2ee = new E2EE();
    await e2ee.generateKey();
    pub = e2ee.marshal(e2ee.getPublicKey().publicKey);
    socket.on("message", async function listener({ message }) {
        if (!message.startsWith("MIXEDKEY")) return;
        socket.off("message", listener);
        const shared = message.slice("MIXEDKEY".length);
        const key = await e2ee.unmarshal(shared);
        // arrive at shared key
        await e2ee.setRemotePublicKey(key);
    });

    const currentOnSubmit = form.onsubmit;

    form.onsubmit = async e => {
        e.preventDefault();
        const message = form.elements.message.value;
        const { buffer, counter } = await e2ee.encrypt(message);
        const serialized = JSON.stringify({
            buffer: window.btoa(String.fromCharCode(...new Uint8Array(buffer))),
            counter: window.btoa(String.fromCharCode(...new Uint8Array(counter))),
        });

        form.elements.message.value = serialized;

        currentOnSubmit(e);

        messages.querySelector("li:last-child").remove();
        messages.appendChild(mkmsg({ message, username, self: true }));

        return false;
    };

    socket.on("message", async ({ message, username }) => {
        if (message.startsWith("MIXEDKEY")) return;
        const deserialized = JSON.parse(message);
        const buffer = new Uint8Array(
            [...window.atob(deserialized.buffer)].map(c => c.charCodeAt(0))
        );
        const counter = new Uint8Array(
            [...window.atob(deserialized.counter)].map(c => c.charCodeAt(0))
        );
        const decrypted = await e2ee.decrypt({ buffer, counter });
        messages.querySelector("li:last-child").remove();
        messages.appendChild(mkmsg({ message: decrypted, username: username }));
    });
}

function sendPublicKey() {
    return pub.then(key => socket.emit("message", { message: `MIXEDKEY${key}`, username }));
}

const button = document.createElement("button");
button.innerText = "setup";
button.style.position = "fixed";
button.style.bottom = "0";
button.style.right = "0";
button.style.zIndex = "99 !important";

button.addEventListener("click", function setupHandler() {
    button.innerText = "setting up...";
    setup().then(() => {
        button.innerText = "run";
        button.removeEventListener("click", setupHandler);
        button.addEventListener("click", async () => {
            button.innerText = "running...";
            sendPublicKey().then(() => {
                button.style.display = "none";
            });
        });
    });
});

document.body.appendChild(button);

// setup();
