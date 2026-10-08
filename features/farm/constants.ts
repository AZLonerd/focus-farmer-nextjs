export const tracks = [
  "Upbeat_Focus_Investigation.mp3",
  "Azure_Archipelago_SunsetMusic.mp3",
  "Azure_Isle_Thinking.mp3",
  "Midnight_Rain_JPN.mp3",
  "Azure_Horizon_Zen.mp3",
  "Rainy_Day_Orchestral_Study_Session.mp3",
  "focus_music.mp3",
];
export const tips = [
  "Plant one small task and give it your full attention.",
  "Put your phone away and let your focus grow.",
  "A short break can make your next harvest stronger.",
  "Start with the hardest row while your mind is fresh.",
];
export const jokes = [
  "Why did the farmer study? To grow their knowledge!",
  "What did the corn say after focusing? A-maize-ing!",
  "Why are farmers great at focus? They stay grounded.",
];
export const petAssets: Record<string, string> = {
  wave: "Piskel Penguin Wave_Kangadrew.gif",
  yellow_hat: "Piskel Penguin with a Yellow Hat.png",
  matcha: "Piskel Penguin with Matcha Latte v1.1.png",
  wizard: "Piskel Wizard Penguin_Kangadrew.png",
  surfer: "Piskel Penguin Surfer Bro WhiteAndGold_Kangadrew.png",
};
/** Builds a public asset URL, including filenames containing spaces. */
export const asset = (name: string) => `/assets/${encodeURIComponent(name)}`;
/** Formats milliseconds as MM:SS, rounding up and clamping expired timers to zero. */
export const clock = (ms: number) => {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
};
