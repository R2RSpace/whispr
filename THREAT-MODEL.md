# Whispr Threat Model (v0.1-alpha)

This document defines the security boundaries of the Whispr prototype.

### 🛡️ What we DEFEND against:
1.  **Passive Network Eavesdropping**: All messages are E2EE via Double Ratchet (Classical). An ISP or attacker with packet access cannot read contents.
2.  **Semi-Honest Server**: The Cloudflare Worker/R2 backend only sees encrypted blobs and metadata (mailbox IDs). It cannot read message content.
3.  **Low-Level Content Violations**: The Constitutional AI (rule-based) effectively blocks accidental or public-level violations of the core principles defined in `constitution.json`.

### ⚠️ What we do NOT defend against:
1.  **Compromised Endpoints**: If your browser or OS is infected with malware, E2EE is bypassed (key/message theft).
2.  **Quantum Decryption**: Current v0.1-alpha uses classical crypto. "Harvest Now, Decrypt Later" applies until v0.2.
3.  **Advanced Filter Bypass**: Since the filter is rule-based and client-side, a technically proficient user can bypass it by modifying the locally running Javascript.
4.  **Metadata Leakage**: Access patterns to Cloudflare R2/KV may leak who you are talking to and when. We do not currently implement ORAM or padding.
5.  **Malicious Signaling**: A compromised Cloudflare account could disrupt signaling or potentially facilitate MITM if keys are not verified out-of-band.

### 🛑 Usage Warning
This is a prototype for researchers and developers. It is not intended for use by activists, journalists, or anyone in a high-risk environment.
