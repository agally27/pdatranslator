/** Gentle, non-prescriptive messages and tips for the dashboard. Rotated by day. */
export const DAILY_MESSAGES = [
  "You don’t have to get every word right. Connection matters more than phrasing.",
  "A hard day is not a failed day. You both got through it.",
  "Lowering a demand is not giving in. It is making room for what matters.",
  "You know your child better than any tool does. Trust what you notice.",
  "Repair counts. “I’m sorry, that came out wrong” is powerful.",
  "Rest is part of the plan, not a break from it.",
  "Small moments of ease add up. One was enough for today.",
];

export const COMMUNICATION_TIPS = [
  { title: "Share, don’t tell", text: "“The bath is ready” gives the same information as “Go and have your bath” – without requiring a reply." },
  { title: "Think out loud", text: "“I wonder where the other shoe went…” invites help without asking for it." },
  { title: "Offer real choices only", text: "If there is only one acceptable answer, it is not a choice. Hand over the “how” instead." },
  { title: "Leave room for silence", text: "After sharing information, pause. Processing time is not ignoring." },
  { title: "Drop the clock", text: "“Now” and “quickly” add pressure. Starting earlier lets urgency stay out of your voice." },
  { title: "Fewer words on hard days", text: "When anxiety is high, less language is easier to take in." },
];

export function pickByDay<T>(items: T[], date = new Date(), offset = 0): T {
  const day = Math.floor(date.getTime() / 86_400_000);
  return items[(day + offset) % items.length];
}

export function greeting(date = new Date()): string {
  const hour = date.getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}
