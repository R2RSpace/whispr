# Constitutional AI Implementation Transparency

This document explains exactly how "Constitutional AI" works in the Whispr v0.1-alpha prototype. 

### 1. The Strategy: "Guardrail not Panopticon"
The goal isn't to police private thoughts, but to provide a safety net against objective harms (Violence, CSAM, Doxxing). 

### 2. Current Engine: Rule-Based (Regex)
Despite the "AI" label in common marketing, v0.1-alpha uses a **Rule-Based Engine**.
-   **NFKC Canonicalization**: Text is normalized to catch homoglyph attacks (e.g., using Cyrillic 'а' instead of Latin 'a').
-   **Regex Matching**: The engine checks the message against a list of patterns defined in `constitution.json`.
-   **Levenshtein Distance (Planned)**: Future versions will include fuzzy matching for misspelled keywords.

### 3. Known Flaws
-   **False Positives**: The filter may block non-harmful messages that happen to contain blacklisted strings in a different context.
-   **False Negatives**: It is trivial to bypass a Regex filter with enough creativity or code obfuscation.
-   **Privacy Trade-off**: The filter runs on the your device. Whispr never sees your raw text, but the code for the filter is public, meaning attackers also know exactly how to bypass it.

### 4. Roadmap to "True AI"
In v0.2, we plan to experiment with **ONNX Runtime Web** to run a distilled BERT or similar model locally within the Web Worker. This will provide true semantic understanding while maintaining the E2EE promise.
