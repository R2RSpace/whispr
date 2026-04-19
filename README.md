# Whispr – Early Prototype (v0.1-alpha) 🛡️

<div align="center">
  <img src="https://raw.githubusercontent.com/R2RSpace/whispr/main/public/logo.png" width="120" alt="Whispr Logo" />
  <br />
  <div style="background:#ff4444;color:white;text-align:center;padding:12px;font-weight:bold;border-radius:8px;margin:10px 0;">
    ⚠️ WARNING: PROTOTYPE EXPERIMENTAL – BELUM DI-AUDIT – JANGAN PAKAI UNTUK KOMUNIKASI SENSITIF
  </div>
</div>

Whispr is currently an early-stage **prototype** exploring the intersection of End-to-End Encryption (E2EE) and optional client-side content filtering. 

**This is not a finished product.** It is a technical demonstration of an "Honest Prototype" where all advanced features are clearly labeled as planned or experimental.

---

## 🌟 Reality Check (v0.1-alpha)

*   **Rule-based Filtering**: Client-side pattern analysis is currently **Regex-based**. There is no "Semantic AI" or "LLM" running yet. It catches keywords based on the [Constitution](./constitution.json).
*   **Minimum Viable E2EE**: Currently uses **Classical Double Ratchet (X25519 + AES-GCM)**. This is stable but standard; non-quantum.
*   **Memory Shredding**: Implements a `double-wipe` mechanism for sensitive buffers in Web Workers.
*   **Blind Server**: Message content is never seen by the server. Only encrypted blobs are stored in R2.

## 🚧 Planned for v0.2+ (The "Hype" Section)

These features are **NOT** currently implemented but are our active R&D goals:
*   **PQXDH & Triple Ratchet**: Post-quantum security to defend against future quantum computer attacks.
*   **Semantic AI Scanning**: Moving from Regex to on-device small language models (ONNX/TensorFlow.js) for intelligent safety.
*   **20 Security Patches**: A series of advanced mitigations (OPRF, Tiered Padding, etc.) currently in conceptual stages.

> [!IMPORTANT]
> For a full list of architectural limitations and out-of-scope features due to Cloudflare Free Tier boundaries, please see **[CURRENT-LIMITATIONS.md](./CURRENT-LIMITATIONS.md)**.

---

## 🏗️ Technical Stack

-   **Frontend**: React 18 / Material 3
-   **Crypto Worker**: Web Workers using `@noble/curves` (X25519)
-   **Safety Worker**: Regex engine driven by `constitution.json`
-   **Backend**: Cloudflare Workers (Hono) + R2 Storage + KV Signaling

---

## 🚀 Development

1.  `npm install`
2.  `npm run dev`
3.  Type "kill him" in the chat to test the **Constitutional AI** block.

---

## 🛡️ Trust but Verify

-   See [SECURITY.md](./SECURITY.md) for the actual status of security features.
-   See [THREAT-MODEL.md](./THREAT-MODEL.md) for what this prototype does (and doesn't) protect you from.
-   See [CONSTITUTION-IMPLEMENTATION.md](./CONSTITUTION-IMPLEMENTATION.md) for how the filter actually works.

*Whispr: An experiment in balancing privacy with responsibility.*
