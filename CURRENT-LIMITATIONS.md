# Current Architectural Limitations (v0.1-alpha)

Whispr is currently hosted on the **Cloudflare Free Tier**, which imposes strict resource constraints. As an honest prototype, we must disclose that several "advanced" features are currently impossible or severely limited by this environment.

### 1. The "Zero Infrastructure" Paradox
While Whispr aims for serverless, it relies on Cloudflare's infrastructure. We cannot claim "zero infrastructure overhead" while running on a commercial cloud provider.

### 2. Cloudflare Free Tier Constraints
-   **No ORAM (Oblivious RAM)**: Accessing KV or R2 leaks access patterns. True ORAM requires massive compute and memory overhead that exceeds Free Tier limits.
-   **No ZK-SNARKs**: Verification of Zero-Knowledge proofs for group state or message validity is computationally expensive and frequently times out on edge workers.
-   **Limited Storage**: R2 storage is capped. While we encrypt blobs, we cannot provide infinite storage for 9GB per user without a paid subscription.

### 3. Client-Side Constraints
-   **No Semantic AI**: Loading a >100MB LLM into a browser tab's Web Worker isn't feasible for a lightweight messaging app. We use Regex/NFKC rules instead.
-   **Single Point of Failure**: If the client device is compromised, the "Constitutional AI" can be bypassed by modifying the local source code. This prototype protects data *in transit*, not *on device*.

### 4. Networking
-   **WebRTC Leaks**: Real-time signaling via KV is slower than traditional WebSockets. Under high load, signaling may experience significant latency.

---

**Summary**: Whispr is a prototype of what is *possible* within these constraints, but it is not a production-ready "privacy fortress."
