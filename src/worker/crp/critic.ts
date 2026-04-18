/** Whispr — CRP Self-Critique Module
 * Analyzes scored results to identify which principles are served vs violated.
 * Generates rule-based revision suggestions when appropriate.
 */
import { ScoreResult } from './scorer';

export interface CritiqueResult {
  serves: string[];           // principle IDs with score < 0.1
  violates: string[];         // principle IDs where triggered = true
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  suggested_revision: string | null;
  reasoning: string;
}

/**
 * Generate a self-critique of the CRP scoring results.
 * Identifies what the message does well and where it violates principles.
 */
export function critique(
  originalText: string,
  scores: ScoreResult[]
): CritiqueResult {
  const serves = scores
    .filter(s => s.score < 0.1)
    .map(s => s.principle_id);

  const violates = scores
    .filter(s => s.triggered)
    .map(s => s.principle_id);

  // Determine severity based on highest violation
  const maxViolationScore = Math.max(0, ...scores.filter(s => s.triggered).map(s => s.score));
  const hasBlock = scores.some(s => s.triggered && s.enforcement_mode === 'BLOCK');

  let severity: CritiqueResult['severity'] = 'none';
  if (hasBlock) severity = 'critical';
  else if (maxViolationScore > 0.8) severity = 'high';
  else if (maxViolationScore > 0.6) severity = 'medium';
  else if (maxViolationScore > 0) severity = 'low';

  // Generate reasoning
  const triggeredScores = scores.filter(s => s.triggered);
  let reasoning = '';
  if (triggeredScores.length === 0) {
    reasoning = 'Message complies with all constitutional principles.';
  } else {
    const reasons = triggeredScores.map(s =>
      `[${s.principle_id}: ${s.principle_name}] score ${s.score} (threshold ${scores.find(x => x.principle_id === s.principle_id)?.score || 'N/A'})`
    );
    reasoning = `Violations detected: ${reasons.join('; ')}`;
  }

  // Generate revision suggestion (rule-based, not LLM)
  const suggested_revision = generateRevision(originalText, triggeredScores);

  return { serves, violates, severity, suggested_revision, reasoning };
}

/**
 * Rule-based revision suggestion.
 * Attempts to sanitize the message by removing or replacing flagged content.
 */
function generateRevision(
  text: string,
  violations: ScoreResult[]
): string | null {
  if (violations.length === 0) return null;

  let revised = text;

  for (const v of violations) {
    // Replace matched keywords with [redacted]
    for (const keyword of v.matched_keywords) {
      const re = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      revised = revised.replace(re, '[redacted]');
    }

    // Apply pattern replacements
    for (const pattern of v.matched_patterns) {
      try {
        const re = new RegExp(pattern, 'gi');
        revised = revised.replace(re, '[content removed]');
      } catch {
        // Invalid regex — skip
      }
    }
  }

  // Only suggest if the revision is meaningfully different
  if (revised === text) return null;
  return revised;
}
