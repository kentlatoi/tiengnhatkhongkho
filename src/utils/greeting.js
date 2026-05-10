export function getJapaneseGreeting() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return { text: 'おはよう', emoji: '👋' };
  }

  if (hour >= 12 && hour < 18) {
    return { text: 'こんにちは', emoji: '🌸' };
  }

  return { text: 'こんばんは', emoji: '🌙' };
}
