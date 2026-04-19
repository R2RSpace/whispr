# Constitution Implementation Details (v0.1-alpha)

This document provides full transparency into how the Constitutional Review Pipeline (CRP) is currently implemented in Whispr.

## Architecture

Whispr is currently in an early prototype phase. The "Constitutional AI" layer is **not** a true semantic AI (like a local LLM or transformer model). It is currently a **rule-based engine** running in a background Web Worker (`src/client/workers/crp.worker.ts`).

### Current Mechanisms
1. **Keyword Matching**: Scans for exact hardcoded terms.
2. **Regex Pattern Analysis**: Uses regular expressions to match specific harmful sentence structures.
3. **NFKC Canonicalization**: Strips zero-width characters and resolves homoglyphs before scanning to prevent simple obfuscation (e.g. bypassing filters by replacing 'a' with an identical-looking Cyrillic 'а').

### Why Not Real AI?
Browser bundle size limitations (1MB max for fast Cloudflare Workers sync) and low-end mobile device constraints mean that deploying a quantized ML model (like ONNX runtime) is deferred to future versions. 

## Known Weaknesses & Limitations

We are explicitly documenting these so users do not have a false sense of security:

* **High False Positive Rate**: Rule-based engines lack context. A user discussing a violent video game or quoting a news article containing the word "kill" may trigger the filter incorrectly.
* **High False Negative Rate**: The filter does not understand nuance, slang, or complex metaphors. Bad actors can easily bypass the current filter using creative language or base64 encoding.
* **Client-Side Vulnerabilities**: Because this filter runs client-side, a technically savvy malicious user could theoretically fork the code, patch out the Web Worker verification, and send harmful payloads. (Note: Receiver-side verification exists to catch this, but it requires the receiver to also be on a standard client).

## Path Forward
In `v2`, we plan to implement a lightweight embedding model using TensorFlow.js or ONNX Web to perform true semantic clustering, drastically reducing false positives and improving detection of nuanced hostility.
