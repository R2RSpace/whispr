/** Whispr — Constitutional AI Worker (Rule-based Placeholder)
 * 
 * NOTE: This is currently a rule-based regex and Levenshtein filter.
 * True Semantic AI analysis is PLANNED for v0.2 once bundle size constraints are addressed.
 * This runs locally on the Web Worker before encryption.
 */
import constitution from '../../constitution.json';

export interface ConstitutionalResult {
  action: 'BLOCK' | 'WARN' | 'ANNOTATE' | 'PASS';
  reason: string | null;
}

export function filterMessage(text: string): ConstitutionalResult {
  const normalized = text.normalize('NFKC').replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  
  for (const principle of (constitution.principles as any[])) {
    let score = 0;
    
    for (const kw of (principle.keywords || [])) {
      if (normalized.includes(kw.toLowerCase())) score += 0.5;
    }
    
    for (const pattern of (principle.patterns || [])) {
      try {
        if (new RegExp(pattern, 'gi').test(normalized)) score += 1.0;
      } catch (e) {}
    }
    
    if (score >= 0.5) {
      if (principle.enforcement_mode === 'BLOCK') {
        return { action: 'BLOCK', reason: `Blocked by Constitution: Violates [${principle.name}]` };
      }
    }
  }
  
  return { action: 'PASS', reason: null };
}
