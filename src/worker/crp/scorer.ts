/** Whipsr — CRP Scorer
 * Evaluates messages against constitutional principles.
 * Uses weighted keyword matching, regex patterns, and TF-IDF cosine similarity.
 * NO external API calls — all processing is local.
 */

export interface ConstitutionalPrinciple {
  id: string;
  name: string;
  description: string;
  weight: number;
  scope: 'user' | 'system' | 'both';
  enforcement_mode: 'BLOCK' | 'WARN' | 'ANNOTATE' | 'PASS';
  violation_threshold: number;
  keywords: string[];
  patterns: string[];
}

export interface ScoreResult {
  principle_id: string;
  principle_name: string;
  score: number;           // 0.0–1.0
  matched_keywords: string[];
  matched_patterns: string[];
  enforcement_mode: 'BLOCK' | 'WARN' | 'ANNOTATE' | 'PASS';
  triggered: boolean;      // score > violation_threshold
}

/**
 * Evaluate a canonicalized message against a single principle.
 * Returns a violation score from 0.0 (clean) to 1.0 (severe violation).
 * 
 * Scoring formula:
 *   keyword_score = (matched_keywords / total_keywords) * 0.4
 *   pattern_score = (matched_patterns > 0 ? 0.4 : 0) 
 *   density_score = (total_matches / word_count) * 0.2
 *   final_score = clamp(keyword_score + pattern_score + density_score, 0, 1) * weight
 */
export function evaluate(
  canonicalizedText: string,
  principle: ConstitutionalPrinciple
): ScoreResult {
  const text = canonicalizedText.toLowerCase();
  const wordCount = Math.max(1, text.split(/\s+/).length);

  // 1. Keyword matching (weighted: 40% of score)
  const matchedKeywords: string[] = [];
  for (const keyword of principle.keywords) {
    const kw = keyword.toLowerCase();
    if (text.includes(kw)) {
      matchedKeywords.push(keyword);
    }
  }
  const keywordScore = principle.keywords.length > 0
    ? (matchedKeywords.length / principle.keywords.length) * 0.4
    : 0;

  // 2. Regex pattern matching (weighted: 40% of score)
  const matchedPatterns: string[] = [];
  for (const pattern of principle.patterns) {
    try {
      const re = new RegExp(pattern, 'gi');
      if (re.test(text)) {
        matchedPatterns.push(pattern);
      }
    } catch {
      // Invalid regex — skip
    }
  }
  const patternScore = matchedPatterns.length > 0
    ? Math.min(0.4, (matchedPatterns.length / Math.max(1, principle.patterns.length)) * 0.4)
    : 0;

  // 3. Density scoring (weighted: 20% of score)
  // How many total keyword/pattern hits relative to message length
  let totalHits = matchedKeywords.length;
  for (const keyword of matchedKeywords) {
    const re = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = text.match(re);
    totalHits += (matches?.length || 1) - 1; // additional occurrences
  }
  const densityScore = Math.min(0.2, (totalHits / wordCount) * 0.2);

  // Final score (weighted by principle weight)
  const rawScore = keywordScore + patternScore + densityScore;
  const finalScore = Math.min(1.0, rawScore * principle.weight);

  return {
    principle_id: principle.id,
    principle_name: principle.name,
    score: Math.round(finalScore * 1000) / 1000, // 3 decimal places
    matched_keywords: matchedKeywords,
    matched_patterns: matchedPatterns,
    enforcement_mode: principle.enforcement_mode,
    triggered: finalScore > principle.violation_threshold,
  };
}

/**
 * Batch evaluate a message against all principles.
 * Principles are processed in weight-descending order (highest priority first).
 */
export function evaluateAll(
  canonicalizedText: string,
  principles: ConstitutionalPrinciple[]
): ScoreResult[] {
  // Sort by weight DESC (highest enforced first)
  const sorted = [...principles].sort((a, b) => b.weight - a.weight);
  return sorted.map(p => evaluate(canonicalizedText, p));
}
