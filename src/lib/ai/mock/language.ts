import { capitalise } from "@/lib/utils";
import { leadingImperative, splitSentences } from "../translation/heuristics";

const DOUBLING = new Set([
  "put", "get", "sit", "run", "stop", "shut", "zip", "hug", "tap", "pat", "chat", "plan", "grab", "drop",
  "swim", "cut", "hit", "let", "set", "dig", "hop", "skip", "clap", "wrap", "rub", "scrub", "pop", "nap",
  "pin", "win", "spit", "step", "tip",
]);

export function gerund(verb: string): string {
  const v = verb.toLowerCase();
  if (v.endsWith("ing")) return v;
  if (v === "be") return "being";
  if (v.endsWith("ie")) return `${v.slice(0, -2)}ying`;
  // Short consonant-vowel-consonant verbs double the final letter (slam → slamming).
  if (DOUBLING.has(v) || /^[^aeiou]*[aeiou][^aeiouwxy]$/.test(v)) return `${v}${v.slice(-1)}ing`;
  if (v.endsWith("e") && !/(ee|ye|oe)$/.test(v)) return `${v.slice(0, -1)}ing`;
  return `${v}ing`;
}

const PREFIX =
  /^(?:please|now|ok(?:ay)?|right|so|then|come on(?: and)?|hey|just|quick(?:ly)?|can you|could you|will you|would you|you need to|you have to|you'?ve got to|you must|you should|you'?d better|i need you to|i want you to|i'?d like you to|i told you to|i asked you to|it'?s time to|it is time to|time to|let'?s|go and|come and|don'?t forget to|remember to|why don'?t you|hurry up and|we need to|we have to|we must|try to|try and|[A-Z][a-z]+,)\s+/i;

const TRAILING =
  /\s*(?:,?\s*(?:right now|now|please|immediately|quickly|at once|this minute|this instant|straight ?away|for me|for mummy|for daddy|ok(?:ay)?|alright|then))+\s*$/i;

const STOPWORDS = new Set([
  "your", "you", "the", "and", "with", "this", "that", "them", "then", "from", "have", "some", "into", "onto",
  "for", "are", "was", "all", "can", "its", "it's", "our", "out", "off", "about", "there", "here", "what",
  "when", "going", "being", "just", "very", "really", "they", "their", "will", "would", "could", "should",
  "need", "want", "time", "today", "been", "does", "doing", "more", "much", "over", "down", "back", "away",
]);

export type CoreKind = "instruction" | "prohibition" | "statement";

export interface Core {
  kind: CoreKind;
  /** Gerund phrase for instructions ("feeding the cat") or the behaviour for prohibitions ("jumping on the sofa"). */
  activity: string;
  /** Cleaned original sentence, used for statements. */
  statement: string;
  keyTerms: string[];
}

function contentWords(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z'\s-]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !STOPWORDS.has(w)),
    ),
  );
}

/** Rule-based extraction of what a sentence is asking for. Demo engine only. */
export function extractCore(text: string): Core {
  const first = splitSentences(text)[0] ?? text;
  let rest = first.trim().replace(/[.!?…]+$/, "");
  let strippedPrefix = false;
  for (let i = 0; i < 6; i++) {
    const next = rest.replace(PREFIX, "");
    if (next === rest) break;
    rest = next;
    strippedPrefix = true;
  }
  const isInstruction = strippedPrefix || Boolean(leadingImperative(first));
  const statement = first.trim().replace(/[.!?…]+$/, "").replace(TRAILING, "");

  if (!isInstruction || !rest) {
    return { kind: "statement", activity: "", statement, keyTerms: contentWords(statement) };
  }

  // Cut trailing clauses that carry the pressure rather than the request.
  rest = rest
    .split(/\s+(?:or else|otherwise|because|before|so that|or (?:i|we|you|there)|and then|if you)\b/i)[0]
    .split(/[,;:]/)[0]
    .replace(TRAILING, "")
    .trim()
    .toLowerCase();

  const prohibition = rest.match(/^(?:stop|don'?t|do not|no|never|quit)\s+(.*)$/);
  if (prohibition && prohibition[1]) {
    const words = prohibition[1].split(/\s+/);
    words[0] = gerund(words[0]);
    const behaviour = words.join(" ");
    return { kind: "prohibition", activity: behaviour, statement, keyTerms: contentWords(behaviour) };
  }

  const words = rest.split(/\s+/);
  words[0] = gerund(words[0]);
  const activity = words.join(" ");
  return { kind: "instruction", activity, statement, keyTerms: contentWords(activity) };
}

export function firstSentence(text: string): string {
  const match = text.trim().match(/^.*?[.!?…](?=\s|$)/);
  return (match ? match[0] : text).trim();
}

const CONTRACTIONS: [RegExp, string][] = [
  [/\bI am\b/g, "I'm"], [/\bit is\b/gi, "it's"], [/\bthat is\b/gi, "that's"], [/\bthere is\b/gi, "there's"],
  [/\bdo not\b/gi, "don't"], [/\bcannot\b/gi, "can't"], [/\bwill not\b/gi, "won't"], [/\bI will\b/g, "I'll"],
  [/\bwe are\b/gi, "we're"], [/\byou are\b/gi, "you're"], [/\bI have\b/g, "I've"], [/\bis not\b/gi, "isn't"],
  [/\bwe will\b/gi, "we'll"], [/\bI would\b/g, "I'd"],
];

export function contract(text: string): string {
  return CONTRACTIONS.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), text);
}

/** Turns question sentences into declarative "wondering" statements. */
export function removeQuestions(text: string): string {
  const parts = text.trim().match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) ?? [text];
  const out = parts.map((raw) => {
    const s = raw.trim();
    if (!s.endsWith("?")) return s;
    const body = s.slice(0, -1).trim();
    const lower = body.charAt(0).toLowerCase() + body.slice(1);
    let m: RegExpMatchArray | null;
    if ((m = body.match(/^shall we (.*)$/i))) return `We could ${m[1]}.`;
    if ((m = body.match(/^(?:do you want|would you like) to (.*)$/i))) return `There's the option to ${m[1]}.`;
    if ((m = body.match(/^(?:do you want|would you like) (.*)$/i))) return `${capitalise(m[1])} is there if you'd like.`;
    if ((m = body.match(/^(?:can|could|will|would) you (.*)$/i))) return `I'm wondering about the idea to ${m[1]}.`;
    if (/^(what|which|where|who|how|when|why)\b/i.test(body)) return `I wonder ${lower}.`;
    if (/^i wonder\b/i.test(body)) return `${body}.`;
    return `I'm wondering: ${lower}.`;
  });
  return out.join(" ").replace(/\s+/g, " ").trim();
}

export function sanitiseStatement(text: string): string {
  return text
    .replace(/\b(?:right now|now|please|immediately|quick(?:ly)?|hurry(?: up)?|at once|straight ?away|come on)\b,?/gi, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/^[,\s]+/, "")
    .trim();
}
