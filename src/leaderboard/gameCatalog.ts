/**
 * The gameId → title map, kept here because the ids are strings scattered
 * across the game components and the participants dashboard needs to print
 * them. Krishna's Wheel is listed even though it records no score — a row can
 * never appear for it, but a stray link to its dashboard should still say what
 * game it means.
 */
export const GAME_TITLES: Record<string, string> = {
  'dahi-handi': 'Dahi Handi',
  'krishna-wheel': "Krishna's Wheel of Wisdom",
  'yudhishtira-quest': "Yudhishthira's Quest",
  arrange: 'Krishna Lila Puzzle',
  'math-monsoon': 'Math Monsoon',
  'memory-matrix': 'Memory Matrix',
  'lexicon-ascent': 'Lexicon Ascent',
  'match-wisdom': 'Match the Wisdom',
  'govardhan-lift': 'Lift Govardhan Together',
};

export const gameTitle = (gameId: string): string => GAME_TITLES[gameId] ?? gameId;
