# Whipsr — Future Features (Out of Scope)

These features are documented for future implementation and are **not** included in the current zero-budget build.

---

## FUTURE-01: Oblivious RAM (ORAM) over D1
**Why not now:** ORAM requires O(log N) read/write operations per access pattern hide, which exceeds Cloudflare Worker CPU time limits (10ms on free tier). Implementing Path ORAM or Ring ORAM would need dedicated compute (e.g., a persistent VM).
**When viable:** When Whipsr moves to a paid compute tier with >50ms CPU allowance per request.

## FUTURE-02: ZK-SNARKs (groth16) for Key Ownership Proof
**Why not now:** Libraries like `snarkjs` produce bundles >5MB, exceeding Worker bundle size limits (1MB compressed). Additionally, ZK proof generation requires significant client-side memory (~500MB for typical circuits).
**When viable:** When WebAssembly SNARK provers become lightweight enough for browser deployment, or when a dedicated ZK microservice is budgeted.

## FUTURE-03: Traffic Chaffing (continuous dummy packets)
**Why not now:** Continuous chaff packets consume Durable Object compute on the free tier (limited to 1000 WebSocket messages/min). With typical usage, this would exhaust the free tier within hours.
**When viable:** On Cloudflare Workers Paid plan where DO compute is metered but generous.

## FUTURE-04: Combiner Cryptography (FrodoKEM + Secp256k1)
**Why not now:** ML-KEM-768 + X25519 already provides IND-CCA2 security against both classical and quantum adversaries. FrodoKEM adds ~20KB to key sizes and 10x latency to key encapsulation.
**When viable:** If NIST downgrades ML-KEM confidence or lattice-based attacks improve, adding FrodoKEM as a combiner provides defense-in-depth.

---

## Out-of-Scope Features (Not Planned for v1)

| Feature | Reason |
|---------|--------|
| Group chats | Multi-party key agreement (MLS protocol) is a separate project |
| Voice/video calls | WebRTC SRTP + SRTP key ratcheting requires media servers |
| Read receipts | Privacy concern; conflicts with blind server architecture |
| Typing indicators | Metadata leakage risk |
| Push notifications | Requires Firebase/APNs integration (not zero-cost) |
| User search / discovery | Server-side search conflicts with blind server |
| File preview | Client-side preview requires sandboxed rendering engine |
| Emoji reactions | Requires additional message mutation protocol |
