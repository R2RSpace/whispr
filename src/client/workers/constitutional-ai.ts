/** Whispr — Constitutional AI Wrapper 
 * This file serves as the architecture stub for future semantic AI models.
 * 
 * NOTE: Currently this delegates to `crp/scorer.ts`, which is a RULE-BASED REGEX ENGINE.
 * This is NOT semantic AI. 
 * // TODO: ganti dengan real semantic model (ONNX LLM) saat bundle size allow.
 */
import { runPipeline, CRPInput, CRPOutput } from '../../worker/crp/pipeline';
import type { ConstitutionalPrinciple } from '../../worker/crp/scorer';

/**
 * Evaluates content against the local constitution.
 */
export function evaluateContent(
  text: string, 
  authorId: string, 
  principles: ConstitutionalPrinciple[]
): CRPOutput {
  const input: CRPInput = {
    raw_text: text,
    author_id: authorId,
    channel_id: '',
    timestamp: Date.now(),
  };

  // Currently executes rule-based matching
  return runPipeline(input, principles);
}
