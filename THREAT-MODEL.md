# Whispr Threat Model (v0.1-alpha)

This document outlines the realistic threat model for the Whispr prototype. 

## What IS Protected
- **In-Transit E2EE**: Messages are encrypted via classical Elliptic Curve Diffie-Hellman (X25519) before they leave your device. The Cloudflare edge servers cannot read them.
- **Data at Rest (Server)**: Messages are stored only as encrypted blobs in Cloudflare R2/D1.

## What is VULNERABLE
- **Device Compromise**: If the client device is compromised by malware or a malicious OS, the E2EE guarantees are voided. Keys are currently stored in memory and `localStorage`/`IndexedDB`.
- **Constitutional AI Bypass**: The current rule-based filter can be bypassed via slang or language modifications. It does not provide absolute physical prevention of harmful content against determined adversaries.
- **Side Channels**: Until tiered padding is finalized, it may be possible to gauge the semantic density of messages by observing ciphertext size.
- **Quantum Harvest Attacks**: The post-quantum keys (ML-KEM-768) are implemented in prototype but have **not** been mathematically audited for implementation flaws. Do not rely on them against present-day nation-state adversaries capturing traffic.

## Trust Boundaries
You are currently trusting the Whispr Web App host (Cloudflare pages) to serve un-tampered JavaScript. In the future, standalone desktop apps will eliminate this supply-chain risk.
