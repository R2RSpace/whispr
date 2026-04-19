# Whispr – Early Prototype 🛡️

> :warning: **EXPERIMENTAL PROTOTYPE – JANGAN PAKAI UNTUK KOMUNIKASI SENSITIF – BELUM DI-AUDIT**
>
> Whispr is currently an early-stage prototype experimenting with the intersection of End-to-End Encryption (E2EE) and optional client-side content filtering. 
> All cryptography and filtering mechanisms are **experimental and have not received independent security audits**.

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)
[![Deployed on Cloudflare](https://img.shields.io/badge/Deployed_on-Cloudflare-F38020?logo=cloudflare)](https://workers.cloudflare.com/)

Whispr is an experimental, serverless messaging prototype that aims to combine E2EE with a client-side safety guardrail.

---

## 🌟 Current State (v0.1-alpha)

* **Optional Client-Side Content Filter (Rule-based)**: Client-side pattern analysis runs in an isolated Web Worker before encryption. This is currently implemented as a **rule-based/Regex filter**, *not* a fully intelligent semantic AI. 
* **Blind Server Architecture**: The backend utilizes opaque mailboxes via Cloudflare KV and R2 for blob storage. Durable Objects (D1/DO) are used to enforce quotas, while message content bypasses the DB and is stored as encrypted ephemeral blobs on R2.
* **Classical Key Exchange & Ratcheting**: Standard cryptographic primitives are currently employed as fallbacks while post-quantum layers undergo internal testing.
* **Memory Shredding**: Sensitive arrays are double-wiped via `typedArray.fill(0)` within Web Workers after usage.

### 🚧 Future/Planned Features
The following features are currently **OUT OF SCOPE** or **PLANNED FOR V2**. They are implemented conceptually in code but are not verified or are disabled by architectural limits:
* **Real-time Constitutional AI**: Moving from Regex to On-device LLM semantic scanning.
* **PQXDH Key Exchange**: X25519 + ML-KEM-768 for future-proof security against harvest-now-decrypt-later.
* **Triple Ratchet (SPQR)**: Forward secrecy and post-compromise security via a dual DH + KEM ratchet.

> For a full list of architectural limitations and out-of-scope features due to Free Tier boundaries, please see [CURRENT-LIMITATIONS.md](./CURRENT-LIMITATIONS.md).

---

## 🏗️ Architecture

Whispr delegates primary security to the endpoints while offloading routing to Cloudflare.

1. **Client**: A React 18 / Material 3 app utilizing memory-shredded Web Workers for Cryptography and Content Evaluation pipelines.
2. **Server**: Cloudflare Hono routes mapping encrypted blobs to R2 and WebRTC signaling via Cloudflare KV.

---

## 🚀 Getting Started

### Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/R2RSpace/whispr.git
   cd whispr
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Initialize Local Database**:
   ```bash
   npm run db:init
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   # Runs Vite alongside Wrangler API Proxy 
   ```

---

## 📜 The Constitution (v1 Prototype)

Whispr's optional filtering is governed by `constitution.json`. To prevent subjective overreach, the constitution currently implements **3 core blocking principles**:
- **P1**: Non-Violence (BLOCK)
- **P2**: Child Safety (BLOCK)
- **P3**: Anti-Harassment / Doxxing (BLOCK)

For implementation details, false positive rates, and known limitations, please see [CONSTITUTION-IMPLEMENTATION.md](./CONSTITUTION-IMPLEMENTATION.md).

---

## 🛡️ Security Posture

Whispr makes aggressive attempts at experimental security concepts. However, we strongly emphasize that **these have not been audited by third-party professionals.**

See [SECURITY.md](./SECURITY.md) for details on the status of our targeted security patches.
See [THREAT-MODEL.md](./THREAT-MODEL.md) for full transparency on our threat protections and current vulnerabilities.

---

*Whispr: An experiment in balancing privacy with responsibility.*
