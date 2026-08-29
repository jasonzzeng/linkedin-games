export function differsByOneLetter(word1: string, word2: string): boolean {
  if (word1.length !== word2.length) return false;
  let diffCount = 0;
  for (let i = 0; i < word1.length; i++) {
    if (word1[i].toUpperCase() !== word2[i].toUpperCase()) {
      diffCount++;
    }
  }
  return diffCount === 1;
}
