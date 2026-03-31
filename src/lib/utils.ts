/**
 * Normalize a string answer for comparison:
 * - Trim whitespace
 * - Convert to lowercase
 * - Collapse internal whitespace to a single space
 */
export function normalizeAnswer(answer: string): string {
  return answer.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Group an array of answers by their normalized form.
 * Returns a map from normalized answer -> original answers that match it.
 */
export function groupAnswers(answers: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();

  for (const answer of answers) {
    const key = normalizeAnswer(answer);
    const existing = groups.get(key);
    if (existing) {
      existing.push(answer);
    } else {
      groups.set(key, [answer]);
    }
  }

  return groups;
}

/** Generate a random 4-digit room code string, e.g. "4827" */
export function generateRoomCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}
