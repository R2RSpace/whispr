/** Whispr — CRP Pipeline
 * Constitutional Review Pipeline — runs client-side in crp.worker.ts.
 * PATCH 17: NFKC canonicalization (Step 0) before scoring.
 * PATCH 01: CRP flags embedded in E2EE payload — server never sees them.
 * PATCH 05: Dual enforcement (sender + receiver side).
 */

import { ConstitutionalPrinciple, ScoreResult, evaluateAll } from './scorer';
import { critique, CritiqueResult } from './critic';
import { resolveAllConflicts, ConflictResolution } from './resolver';
import { applyHomoglyphMap } from './homoglyphs';

export interface CRPInput {
  raw_text: string;
  author_id: string;
  channel_id: string;
  timestamp: number;
}

export interface CRPOutput {
  action: 'BLOCK' | 'WARN' | 'ANNOTATE' | 'PASS';
  scores: ScoreResult[];
  critique: CritiqueResult;
  conflicts: ConflictResolution[];
  active_enforcements: ScoreResult[];
  canonicalized_text: string;
  reason: string | null;
}

/**
 * STEP 0 — NFKC Canonicalization (PATCH 17)
 * Normalizes Unicode, removes zero-width chars, maps homoglyphs.
 * Must run BEFORE scorer.evaluate().
 */
export function canonicalize(text: string): string {
  // Step 1: NFKC normalization (expand homoglyphs to base form)
  let s = text.normalize('NFKC');

  // Step 2: Remove zero-width characters
  s = s.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '');

  // Step 3: Remove Bidi override characters
  s = s.replace(/[\u202A-\u202E\u2066-\u2069]/g, '');

  // Step 4: Homoglyph mapping (Cyrillic → Latin, etc.)
  s = applyHomoglyphMap(s);

  // Step 5: Collapse excessive whitespace
  s = s.replace(/\s+/g, ' ').trim();

  return s;
}

/**
 * Run the full CRP pipeline on a message.
 * Returns the enforcement action and full analysis.
 * 
 * This is the main entry point used by both:
 * - Sender-side CRP (before encryption)
 * - Receiver-side CRP (after decryption, PATCH 05)
 */
export function runPipeline(
  input: CRPInput,
  principles: ConstitutionalPrinciple[]
): CRPOutput {
  // STEP 0: Canonicalize (PATCH 17)
  const canonicalizedText = canonicalize(input.raw_text);

  // STEP 1: Principle Scan — score against all principles
  const scores = evaluateAll(canonicalizedText, principles);

  // STEP 1.5: Conflict Resolution
  const { activeScores, resolutions } = resolveAllConflicts(scores, canonicalizedText);

  // STEP 2: Self-Critique
  const critiqueResult = critique(input.raw_text, scores);

  // STEP 3: Determine final action
  let action: CRPOutput['action'] = 'PASS';
  let reason: string | null = null;

  // Priority: BLOCK > WARN > ANNOTATE > PASS
  for (const score of activeScores) {
    if (score.enforcement_mode === 'BLOCK' && score.triggered) {
      action = 'BLOCK';
      reason = `Blocked by ${score.principle_name}: ${critiqueResult.reasoning}`;
      break;
    }
  }

  if (action !== 'BLOCK') {
    for (const score of activeScores) {
      if (score.enforcement_mode === 'WARN' && score.triggered) {
        action = 'WARN';
        reason = `Warning: ${score.principle_name} - ${critiqueResult.reasoning}`;
        break;
      }
    }
  }

  if (action === 'PASS') {
    for (const score of activeScores) {
      if (score.enforcement_mode === 'ANNOTATE' && score.triggered) {
        action = 'ANNOTATE';
        reason = `${score.principle_name}: ${critiqueResult.reasoning}`;
        break;
      }
    }
  }

  return {
    action,
    scores,
    critique: critiqueResult,
    conflicts: resolutions,
    active_enforcements: activeScores,
    canonicalized_text: canonicalizedText,
    reason,
  };
}

/**
 * CRP Demo — runs pipeline on 5 test messages.
 * 2 PASS, 1 WARN, 1 ANNOTATE, 1 BLOCK.
 * Returns full scored output for each.
 */
export function runCRPDemo(principles: ConstitutionalPrinciple[]): CRPOutput[] {
  const testMessages: CRPInput[] = [
    {
      raw_text: "Hey, want to grab coffee tomorrow? I found a great new café downtown.",
      author_id: "user-1",
      channel_id: "ch-1",
      timestamp: Date.now(),
    },
    {
      raw_text: "Thanks for helping me with the project! Your feedback was really valuable.",
      author_id: "user-2",
      channel_id: "ch-1",
      timestamp: Date.now(),
    },
    {
      raw_text: "They don't want you to know the truth! Wake up sheeple, do your own research about the conspiracy!",
      author_id: "user-3",
      channel_id: "ch-2",
      timestamp: Date.now(),
    },
    {
      raw_text: "Can you send me your password and credit card number? I need to verify your account.",
      author_id: "user-4",
      channel_id: "ch-3",
      timestamp: Date.now(),
    },
    {
      raw_text: "I'm going to kill you and your whole family. I know where you live.",
      author_id: "user-5",
      channel_id: "ch-4",
      timestamp: Date.now(),
    },
  ];

  return testMessages.map(msg => runPipeline(msg, principles));
}
