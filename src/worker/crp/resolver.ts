/** Whispr — CRP Conflict Resolver
 * resolveConflict() is a PURE FUNCTION with no side effects.
 * Handles 3 documented conflict pairs between constitutional principles.
 * Returns the winning principle based on explicit logic.
 */

import { ConstitutionalPrinciple, ScoreResult } from './scorer';

export interface ConflictResolution {
  winner: string;          // principle ID
  loser: string;           // principle ID
  reason: string;
  resolution_rule: string;
}

/**
 * Resolve a conflict between two triggered principles.
 * Pure function — no side effects, no external state.
 * 
 * Conflict Pair 1: P1 (Non-Violence) vs P8 (Self-Harm Prevention)
 *   A message like "I want to hurt myself" triggers both.
 *   Winner: P8 — self-harm gets ANNOTATE (supportive), not BLOCK.
 * 
 * Conflict Pair 2: P3 (Epistemic Clarity) vs P7 (Autonomy Preservation)
 *   A message challenging someone's beliefs could be "manipulative framing"
 *   OR legitimate intellectual discourse.
 *   Winner: P7 (Autonomy) when message is conversational; P3 when mass-broadcast patterns detected.
 * 
 * Conflict Pair 3: P5 (Anti-Discrimination) vs P6 (Privacy Sovereignty)
 *   Reporting someone's protected characteristic could be discrimination OR privacy violation.
 *   Winner: whichever has the higher score — the more specific match wins.
 */
export function resolveConflict(
  p1Score: ScoreResult,
  p2Score: ScoreResult,
  messageText: string
): ConflictResolution {
  const p1 = p1Score.principle_id;
  const p2 = p2Score.principle_id;

  // Normalize pair order for consistent matching
  const pair = [p1, p2].sort().join(':');

  switch (pair) {
    // ---- Conflict Pair 1: Non-Violence vs Self-Harm Prevention ----
    // CRP [P1: Non-Violence] vs [P8: Self-Harm Prevention]
    case 'P1:P8': {
      // Self-harm messages contain self-directed language, not threats to others
      const selfDirected = /\b(myself|my\s+life|i\s+(want|need|going)\s+to\s+(die|end|hurt|cut|kill)\s+(myself|it))\b/i;
      const otherDirected = /\b(you|them|they|him|her|everyone)\b/i;

      const isSelfDirected = selfDirected.test(messageText);
      const targetsOthers = otherDirected.test(messageText) && !isSelfDirected;

      if (isSelfDirected && !targetsOthers) {
        return {
          winner: 'P8',
          loser: 'P1',
          reason: 'Message is self-directed — self-harm prevention (supportive annotation) takes precedence over violence block',
          resolution_rule: 'SELF_DIRECTED_OVERRIDES_VIOLENCE',
        };
      }
      return {
        winner: 'P1',
        loser: 'P8',
        reason: 'Message targets others — non-violence enforcement takes precedence',
        resolution_rule: 'OTHER_DIRECTED_VIOLENCE_WINS',
      };
    }

    // ---- Conflict Pair 2: Epistemic Clarity vs Autonomy Preservation ----
    // CRP [P3: Epistemic Clarity] vs [P7: Autonomy Preservation]
    case 'P3:P7': {
      // Mass-broadcast patterns → P3 wins (prevent misinformation campaigns)
      const massBroadcast = /\b(share this|forward|pass it on|tell everyone|spread the word|retweet|copy paste)\b/i;
      const conversational = /\b(i think|in my opinion|what if|have you considered|let's discuss|maybe)\b/i;

      if (massBroadcast.test(messageText)) {
        return {
          winner: 'P3',
          loser: 'P7',
          reason: 'Mass-broadcast pattern detected — epistemic clarity enforcement prevents misinformation spread',
          resolution_rule: 'MASS_BROADCAST_TRIGGERS_EPISTEMIC',
        };
      }
      if (conversational.test(messageText)) {
        return {
          winner: 'P7',
          loser: 'P3',
          reason: 'Conversational tone — autonomy preservation protects independent discourse',
          resolution_rule: 'CONVERSATIONAL_PROTECTS_AUTONOMY',
        };
      }
      // Default: higher score wins
      return p1Score.score >= p2Score.score
        ? { winner: p1, loser: p2, reason: 'Higher violation score wins', resolution_rule: 'SCORE_TIEBREAK' }
        : { winner: p2, loser: p1, reason: 'Higher violation score wins', resolution_rule: 'SCORE_TIEBREAK' };
    }

    // ---- Conflict Pair 3: Anti-Discrimination vs Privacy Sovereignty ----
    // CRP [P5: Anti-Discrimination] vs [P6: Privacy Sovereignty]
    case 'P5:P6': {
      // More specific match wins — whoever has more pattern/keyword matches
      const p1Specificity = p1Score.matched_keywords.length + p1Score.matched_patterns.length;
      const p2Specificity = p2Score.matched_keywords.length + p2Score.matched_patterns.length;

      if (p1Specificity > p2Specificity) {
        return {
          winner: p1,
          loser: p2,
          reason: `${p1} has more specific matches (${p1Specificity} vs ${p2Specificity})`,
          resolution_rule: 'SPECIFICITY_WINS',
        };
      }
      if (p2Specificity > p1Specificity) {
        return {
          winner: p2,
          loser: p1,
          reason: `${p2} has more specific matches (${p2Specificity} vs ${p1Specificity})`,
          resolution_rule: 'SPECIFICITY_WINS',
        };
      }
      // Equal specificity: discrimination enforcement wins (higher weight)
      return {
        winner: 'P5',
        loser: 'P6',
        reason: 'Equal specificity — anti-discrimination has higher enforcement weight',
        resolution_rule: 'WEIGHT_TIEBREAK',
      };
    }

    // ---- Default: Higher weight wins ----
    default: {
      return p1Score.score * (p1Score.enforcement_mode === 'BLOCK' ? 1.5 : 1) >=
             p2Score.score * (p2Score.enforcement_mode === 'BLOCK' ? 1.5 : 1)
        ? { winner: p1, loser: p2, reason: 'Higher weighted score wins', resolution_rule: 'DEFAULT_WEIGHT' }
        : { winner: p2, loser: p1, reason: 'Higher weighted score wins', resolution_rule: 'DEFAULT_WEIGHT' };
    }
  }
}

/**
 * Resolve all conflicts in a set of triggered scores.
 * Returns the final list of active enforcements after conflict resolution.
 */
export function resolveAllConflicts(
  scores: ScoreResult[],
  messageText: string
): { activeScores: ScoreResult[]; resolutions: ConflictResolution[] } {
  const triggered = scores.filter(s => s.triggered);
  if (triggered.length <= 1) {
    return { activeScores: triggered, resolutions: [] };
  }

  const resolutions: ConflictResolution[] = [];
  const suppressed = new Set<string>();

  // Check all pairs of triggered principles
  for (let i = 0; i < triggered.length; i++) {
    for (let j = i + 1; j < triggered.length; j++) {
      const resolution = resolveConflict(triggered[i], triggered[j], messageText);
      resolutions.push(resolution);
      suppressed.add(resolution.loser);
    }
  }

  const activeScores = triggered.filter(s => !suppressed.has(s.principle_id));
  return { activeScores, resolutions };
}
