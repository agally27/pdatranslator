/**
 * Deterministic safety screen for specialist conversations. It runs on every
 * message regardless of provider, so signposting never depends on a model.
 */
const SAFETY_PATTERNS: RegExp[] = [
  /\b(kill|hurt|harm|end) (my|him|her|them|your)?self\b|\bsuicid\w*\b|\bself[- ]?harm\w*\b|\bwant(s|ed)? to die\b|\bend (it all|my life|his life|her life)\b|\bdon'?t want to (be here|live|be alive)\b/i,
  /\b(can'?t|cannot) (keep|go on|cope|do this) (any ?more|any longer)\b|\bat breaking point\b|\bi(?:'m| am) (going to|scared i'?ll) (hurt|hit|harm)\b|\bafraid (i|i'll) (will )?(hurt|harm)\b/i,
  /\b(knife|knives|weapon|strangl\w*|chok\w*|set fire|ran into (the )?(road|traffic)|ran away|missing|overdose\w*|swallowed|unconscious|not breathing|bleeding)\b/i,
  /\b(abus\w*|neglect\w*|unsafe at home|hits? me|hurt(s|ing)? (me|his sister|her sister|his brother|her brother|the baby)|attack(s|ed|ing)?|injur\w*|black eye|bruis\w*)\b/i,
  /\b(emergency|a&e|999|ambulance|police)\b/i,
];

export function detectSafetyConcern(text: string): boolean {
  return SAFETY_PATTERNS.some((pattern) => pattern.test(text));
}

export const SAFETY_SIGNPOST =
  "If anyone is in immediate danger, call 999. For urgent medical or mental health advice in the UK you can call NHS 111. " +
  "If you are struggling to cope yourself, Samaritans are available free at any time on 116 123. " +
  "I’m an AI assistant, not a clinician or an emergency service, so please use these if there is any risk of harm.";

export function ensureSignpost(reply: string): string {
  return /\b999\b/.test(reply) ? reply : `${reply.trim()}\n\n${SAFETY_SIGNPOST}`;
}
