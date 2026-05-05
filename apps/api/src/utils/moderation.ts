// ── Content moderation for public room messages ─────────
// IMPORTANT: Never call this on DM messages — they are encrypted ciphertext.
// This module uses a local bad-words filter as the default fallback.
// In production, swap in Google Perspective API for better accuracy.

const BAD_WORDS: string[] = [
  // Slurs and hate speech terms
  "nigger", "nigga", "faggot", "fag", "retard", "retarded",
  "kike", "spic", "chink", "wetback", "tranny",
  // Violent threats
  "kill yourself", "kys", "kill you", "die", 
  // Spam/scam patterns (can be extended)
  "telegram me", "whatsapp me",
];

// Precompile regex patterns for performance
const BAD_WORD_PATTERNS: RegExp[] = BAD_WORDS.map(
  (word) => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i")
);

interface ModerationResult {
  flagged: boolean;
  score: number;
}

/**
 * Check content against the moderation filter.
 * Returns a score between 0 and 1. Score > 0.85 → flagged.
 *
 * In production, replace this with Google Perspective API:
 *   POST https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze
 *   with requestedAttributes: { TOXICITY: {} }
 */
export async function checkContent(text: string): Promise<ModerationResult> {
  const normalized = text.toLowerCase().trim();

  let matchCount = 0;
  for (const pattern of BAD_WORD_PATTERNS) {
    if (pattern.test(normalized)) {
      matchCount++;
    }
  }

  // Score: each match adds 0.5, capped at 1.0
  const score = Math.min(matchCount * 0.5, 1.0);

  return {
    flagged: score > 0.85,
    score,
  };
}
