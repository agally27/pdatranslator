import type { DemandLevel, DemandTrigger, DemandType, StyleId, ValidationChecks } from "@/lib/types";

/**
 * Deterministic, rule-based analysis of observable language features.
 *
 * Used in three places:
 *  1. as the demand detector of the demo (mock) provider;
 *  2. as a pre-pass that gives live AI models concrete phrases to consider;
 *  3. as a hard "lint" during validation, so that an alternative containing an
 *     obvious demand phrase is rejected even if an AI validator misses it.
 *
 * These are pattern matches on wording. They are not clinical measurements and
 * do not predict how any individual child will respond.
 */

const IMPERATIVE_VERBS = new Set([
  "put", "get", "go", "come", "stop", "sit", "stand", "eat", "drink", "brush", "wash", "clean", "tidy",
  "pick", "take", "give", "turn", "switch", "hurry", "wait", "listen", "look", "be", "finish", "leave",
  "say", "hold", "stay", "try", "wear", "pack", "shut", "close", "open", "move", "keep", "use", "walk",
  "calm", "share", "tell", "show", "make", "help", "feed", "bring", "hang", "wake", "lie", "read", "write",
  "start", "zip", "wipe", "flush", "dry", "change", "remember", "behave", "apologise", "apologize",
  "swallow", "play", "touch", "kick", "let", "run", "quiet", "don't", "dont", "never", "do", "have", "watch",
  "follow", "answer", "ask", "choose", "pay", "set", "lay", "throw", "drop", "push", "pull", "speak", "talk",
  "water", "practise", "practice", "empty", "fold", "carry", "fetch", "find", "check", "sort", "learn", "draw", "sing",
  "count", "spit", "rinse", "blow", "chew", "sleep", "rest", "cross", "join", "meet", "thank", "hug", "kiss",
]);

const LEADING_FILLER =
  /^(?:(?:(?:ok(?:ay)?|right|now|so|and|but|then|come on|please|hey|oi|just|quick|quickly|sweetheart|darling|love|mate)\s*[,!]?\s+)|(?:[A-Z][a-z]+\s*,\s+))+/i;

export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?…])\s+|\s+[—–]\s+|;\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Returns the imperative verb if a sentence opens with one, otherwise null. */
export function leadingImperative(sentence: string): string | null {
  const stripped = sentence.replace(LEADING_FILLER, "").replace(/^[“"'‘(]+/, "");
  const lower = stripped.toLowerCase();
  if (/^no\s+\w+ing\b/.test(lower)) return "no";
  const first = lower.match(/^[a-z’']+/)?.[0]?.replace(/’/g, "'") ?? "";
  if (!first || !IMPERATIVE_VERBS.has(first)) return null;
  // "Do you…?", "Have you…?" are questions, handled elsewhere.
  if ((first === "do" || first === "have") && /^(do|have)\s+(you|we|they|i)\b/.test(lower)) return null;
  if (first === "let" && /^let\s+me\s+know\b/.test(lower)) return null;
  return first;
}

type Rule = { type: DemandType; pattern: RegExp; explanation: string };

const RULES: Rule[] = [
  // Direct instructions
  { type: "direct_instruction", pattern: /\byou(?:'ve| have)? (?:need|have|got|ought) to\b|\byou must\b|\byou need\b/i, explanation: "States an obligation directly, leaving no room to decline." },
  { type: "direct_instruction", pattern: /\bi (?:need|want|told|asked) you to\b|\bdo as (?:you'?re|you are|i) (?:told|say)\b/i, explanation: "Tells the child exactly what the adult requires of them." },
  { type: "direct_instruction", pattern: /\bplease\b/i, explanation: "“Please” softens the tone but still marks the sentence as a request to comply with." },

  // Indirect instructions
  { type: "indirect_instruction", pattern: /\b(?:it'?s|it is) time (?:to|for)\b|\btime (?:to|for)\b/i, explanation: "Announces what must happen next without offering any say in it." },
  { type: "indirect_instruction", pattern: /\blet'?s\b/i, explanation: "Sounds shared, but usually means the adult has already decided." },
  { type: "indirect_instruction", pattern: /\bwe(?:'ve| have)? (?:need|have|got) to\b|\bwe must\b/i, explanation: "Frames the instruction as a joint obligation." },
  { type: "indirect_instruction", pattern: /\byou should\b|\byou'?d better\b|\bwhy don'?t you\b|\bhow about you\b|\bdon'?t forget\b|\bremember to\b|\b(?:you'?re|you are) supposed to\b|\bi'?d like you to\b|\bit would be (?:good|nice|great|helpful) if you\b/i, explanation: "A suggestion that carries a clear expectation to act." },

  // Implied expectations
  { type: "implied_expectation", pattern: /\byou know (?:you|that|how|what|we|the)\b|\bshould know better\b|\bat your age\b|\b(?:you'?re|you are) old enough\b|\bbig (?:boy|girl|kid)s?\b|\bi expect\b|\byou (?:always|never)\b|\blike (?:we|you) (?:agreed|promised)\b|\byou promised\b|\bas usual\b|\byou can do (?:it|this|better)\b/i, explanation: "Implies a standard the child is expected to meet." },

  // Time pressure
  { type: "time_pressure", pattern: /\bhurry\b|\bquick(?:ly)?\b|\bright now\b|\bimmediately\b|\bstraight ?away\b|\bthis (?:minute|instant|second)\b|\bat once\b|\bcome on\b/i, explanation: "Adds urgency, which can raise anxiety and the sense of being pushed." },
  { type: "time_pressure", pattern: /\bnow\b/i, explanation: "“Now” removes any control over timing." },
  { type: "time_pressure", pattern: /\b(?:be |running |going to be |we'?re |we are )late\b|\bno time\b|\bout of time\b|\b(?:\d+|one|two|three|five|ten) (?:more )?(?:minutes?|mins?|seconds?)\b|\bcount(?:ing)? to (?:\d+|three|five|ten)\b|\bbefore i count\b|\bby the time\b/i, explanation: "A deadline or countdown increases pressure to comply quickly." },

  // Questions that function as instructions
  { type: "question_as_instruction", pattern: /\b(?:can|could|will|would) you (?:please |just |at least )?\w+[^?]*\?/i, explanation: "Worded as a question, but the expected answer is to do it." },
  { type: "question_as_instruction", pattern: /\b(?:are you going to|have you (?:done|brushed|washed|put|got|packed|finished|tidied|eaten|been)|shall we|why (?:haven'?t|aren'?t|can'?t|won'?t|don'?t|didn'?t) you|do you want to (?:go|get|put|come|try|have|do|start|eat|brush|tidy)|where (?:are|is) your|did you hear|what did i (?:say|tell)|what do you say|is that how|how many times)\b[^?]*\?/i, explanation: "A question that is really checking on or prompting compliance." },

  // Conditional language
  { type: "conditional_language", pattern: /\bif you (?:don'?t|do not|can'?t|won'?t|keep|carry on|stop|eat|finish|tidy|get|put|brush|are|behave|do)\b|\bor else\b|\botherwise\b|\bunless you\b|\bno \w+(?: \w+)? (?:until|unless)\b|\b(?:not|nothing|won'?t|can'?t) [^.?!]*\buntil you\b|\bthen you can\b|\bonly if\b|\bas long as you\b|\bwhen you(?:'ve| have) [^.?!]*,? (?:then |you can)\b|\bfirst [^.?!]*,? then\b|\bor (?:there'?ll|there will|you won'?t|i'?ll|i will|we won'?t|we'?re not|no)\b/i, explanation: "Makes something the child wants depend on compliance, which can feel like a threat or a bargain." },

  // Loss of control
  { type: "loss_of_control", pattern: /\bbecause i said\b|\bi said (?:so|no)\b|\byou(?:'re| are) (?:coming|going|doing|wearing|eating|not (?:going|having|allowed|doing|staying))\b|\byou will\b|\byou'?ll (?:do|have to|wear|eat|go|come)\b|\bi(?:'m| am) (?:taking|turning|switching|putting|going to (?:take|turn|switch|carry|count))\b|\bi(?:'ll| will) (?:take|turn|switch|carry) \b|\bno (?:more|arguing|buts|discussion|excuses)\b|\bthat'?s (?:final|it|enough)\b|\byou can'?t\b|\b(?:you'?re|you are) not allowed\b|\bnot negotiable\b|\bend of (?:story|discussion)\b|\bi don'?t care\b|\benough\b/i, explanation: "Signals that the adult has taken the decision out of the child’s hands." },

  // Transitions
  { type: "transition", pattern: /\bstop (?:playing|watching|what you(?:'re| are) doing|that game|the game)\b|\b(?:turn|switch) (?:\w+ ){0,3}off\b|\bfinish(?:ed)? (?:up|now|your|the|that)\b|\btime to (?:go|leave|stop|come|get|finish)\b|\bwe(?:'re| are) (?:going|leaving|off)\b|\b(?:leave|leaving)\b|\bput (?:it|that|the \w+|your \w+) (?:down|away)\b|\bcome (?:in|inside|here|down|downstairs|off|out|on in|back|away|and)\b|\bget (?:in|into|out|off|up|ready|dressed|down)\b|\bbed ?time\b|\bhome ?time\b|\bpack (?:up|away)\b|\boff (?:the|your) (?:tablet|ipad|phone|game|xbox|switch|tv|telly|computer|screen)\b|\bgo (?:to|and|upstairs|outside|inside)\b/i, explanation: "Asks for a switch from one activity or place to another, which is often hard." },

  // Social expectations
  { type: "social_expectation", pattern: /\bsay (?:sorry|thank ?you|thanks|please|hello|hi|goodbye|bye)\b|\bbe (?:nice|kind|polite|good|sensible|quiet|friendly|gentle|a good)\b|\bshare\b|\beveryone(?: else)?\b|\bother (?:children|kids|people)\b|\bpeople are (?:looking|watching|staring)\b|\bmanners\b|\bbehave\b|\bgood (?:boy|girl)\b|\blook at me\b|\bembarrass\w*\b|\bwhat will \w+ think\b|\blike your (?:brother|sister|friends?)\b|\bnicely\b|\bproperly\b|\brude\b|\btake turns\b|\bgive \w+ a (?:hug|kiss|cuddle)\b/i, explanation: "Relies on social rules or comparison with others, which adds expectation." },

  // Repeated requests
  { type: "repeated_request", pattern: /\bi(?:'ve| have)? (?:already )?(?:told|asked) you\b|\bhow many times\b|\bi won'?t (?:ask|tell|say)(?: you| it)? again\b|\blast (?:time|chance|warning)\b|\bi keep (?:telling|asking|saying)\b|\bstill haven'?t\b|\bfor the last time\b|\bagain\b|\bi'?m not (?:going to )?(?:ask|tell|say)(?:ing)?(?: you| it)? (?:again|twice)\b|\balready (?:told|asked|said)\b/i, explanation: "Shows the request is being repeated, which stacks pressure on top of the original demand." },

  // Hidden demands
  { type: "hidden_demand", pattern: /\bi(?:'d| would) (?:love|like) it if\b|\bit would make (?:me|mummy|daddy|mum|dad) (?:so |very |really )?(?:happy|proud)\b|\bfor (?:me|mummy|daddy|mum|dad|grandma|nanny)\b|\bbe a (?:big|good|brave)\b|\bi bet you can'?t\b|\bwouldn'?t it be (?:nice|good|lovely)\b|\bdon'?t you want\b|\bwouldn'?t you\b|\bmake (?:me|mummy|daddy|mum|dad) (?:happy|proud|sad|cross)\b|\byou'?re so good at\b|\bshow (?:me|us|everyone) how (?:well|nicely|good|grown)\b|\bbrave\b|\bgood (?:job|listening|sitting|eating)\b/i, explanation: "Praise, persuasion or emotional appeal that carries an expectation underneath." },

  // Uncertainty
  { type: "uncertainty", pattern: /\bwe'?ll see\b|\bmaybe\b|\blater\b|\bsoon\b|\bin a (?:bit|minute|while|sec|moment)\b|\bat some point\b|\bsurprise\b|\bsomewhere\b|\bsomething (?:different|new|else)\b|\bnew (?:teacher|school|place|class|person|doctor)\b|\bdon'?t know (?:when|what|who|how long)\b|\bwait and see\b|\bsomeone (?:new|else)\b/i, explanation: "Leaves what will happen, or when, unclear – unpredictability can raise anxiety." },

  // Lack of autonomy
  { type: "lack_of_autonomy", pattern: /\bno choice\b|\b(?:whether|if) you like it or not\b|\blike it or not\b|\byou don'?t get to\b|\bi(?:'ll| will|'m going to) decide\b|\bnot up to you\b|\bhave to\b|\bmust\b|\bgot to\b|\bneed to\b|\b(?:you'?re|you are) (?:wearing|having|eating|taking)\b|\bno,? you(?:'re| are)? not\b|\bthere(?:'s| is) no (?:other|choice|option|way)\b/i, explanation: "Presents the outcome as fixed, with no room for the child’s input." },
];

const WEIGHTS: Record<DemandType, number> = {
  direct_instruction: 2,
  indirect_instruction: 1,
  implied_expectation: 1,
  time_pressure: 2,
  question_as_instruction: 1.5,
  conditional_language: 2,
  loss_of_control: 2,
  transition: 1,
  social_expectation: 1,
  repeated_request: 2,
  hidden_demand: 1,
  uncertainty: 1,
  lack_of_autonomy: 1.5,
};

export interface HeuristicDemandAnalysis {
  level: DemandLevel;
  score: number;
  triggers: DemandTrigger[];
  reasoning: string;
}

export function detectDemandsHeuristic(text: string): HeuristicDemandAnalysis {
  const triggers: DemandTrigger[] = [];
  const seen = new Set<string>();
  const add = (type: DemandType, phrase: string, explanation: string) => {
    const clean = phrase.trim().replace(/\s+/g, " ");
    const key = `${type}:${clean.toLowerCase()}`;
    if (!clean || seen.has(key)) return;
    if (triggers.filter((t) => t.type === type).length >= 2) return;
    seen.add(key);
    triggers.push({ type, phrase: clean, explanation });
  };

  // Sentences, plus later clauses introduced by a comma ("…, just get your shoes on").
  const clauses = splitSentences(text).flatMap((sentence) => {
    const [first, ...rest] = sentence.split(/,\s+/);
    return [first, ...rest.map((clause) => (sentence.trim().endsWith("?") && !clause.endsWith("?") ? `${clause}?` : clause))];
  });
  for (const sentence of clauses) {
    const verb = leadingImperative(sentence);
    if (verb && !sentence.trim().endsWith("?")) {
      add(
        "direct_instruction",
        sentence.replace(/[.!]+$/, "").split(/,\s/)[0].slice(0, 60),
        verb === "don't" || verb === "dont" || verb === "never" || verb === "no" || verb === "stop"
          ? "A direct command to stop or not do something."
          : "A direct command that begins with an instruction word.",
      );
    }
  }

  for (const rule of RULES) {
    const match = text.match(rule.pattern);
    if (match) add(rule.type, match[0].slice(0, 80), rule.explanation);
  }

  if (/[A-Z]{4,}/.test(text) || /!{2,}/.test(text)) {
    add("time_pressure", text.match(/[A-Z]{4,}|!{2,}/)![0], "Capitals or repeated exclamation marks read as raised intensity.");
  }

  const types = new Set(triggers.map((t) => t.type));
  let score = 0;
  for (const type of types) {
    score += WEIGHTS[type];
    if (triggers.filter((t) => t.type === type).length > 1) score += 0.5;
  }
  const level: DemandLevel = score >= 4 ? "high" : score >= 1.5 ? "moderate" : "low";
  return { level, score, triggers, reasoning: buildReasoning(level, triggers) };
}

function buildReasoning(level: DemandLevel, triggers: DemandTrigger[]): string {
  if (triggers.length === 0) {
    return "No obvious demand phrases were found in this wording. It mostly shares information, although tone, timing and context still shape how it lands.";
  }
  const count = new Set(triggers.map((t) => t.type)).size;
  const lead =
    level === "high"
      ? "This wording combines several features that can be experienced as pressure"
      : level === "moderate"
        ? "This wording contains some features that can be experienced as pressure"
        : "This wording contains only light signs of pressure";
  return `${lead} (${count} type${count === 1 ? "" : "s"} noticed). This is an assessment of the language itself, not a prediction of how any child will respond.`;
}

// ── Lint for generated alternatives ─────────────────────────────────────────

export interface LintIssue {
  check: keyof ValidationChecks;
  message: string;
}

const LINT_DIRECT =
  /\byou(?:'ve| have)? (?:need|have|got|ought) to\b|\byou must\b|\bi (?:need|want) you to\b|\bplease\b|\b(?:can|could|will|would) you [^?]*\?|\byou should\b|\byou'?d better\b/i;
const LINT_PRESSURE =
  /\bhurry\b|\bquick(?:ly)?\b|\bright now\b|\bimmediately\b|\bstraight ?away\b|\bthis (?:minute|instant)\b|\bat once\b|\bcome on\b|\b(?:be|running|going to be) late\b|\bnow[.!]*$|\bnow,|\bcount(?:ing)? to\b/i;
const LINT_CONDITIONAL =
  /\bif you (?:don'?t|do not|won'?t)\b|\bor else\b|\botherwise\b|\bunless you\b|\bno \w+(?: \w+)? until\b|\bthen you can\b|\blast (?:chance|warning)\b|\bi(?:'ve| have) (?:already )?(?:told|asked) you\b/i;
const LINT_PROMISE =
  /\bi promise\b|\bguarantee\w*\b|\bwill definitely\b|\bdefinitely will\b|\bnothing bad (?:will|can)\b|\b(?:won'?t|will not|doesn'?t) hurt\b|\bit'?ll be (?:fine|fun|easy|over in a second)\b|\byou'?ll (?:love|enjoy) it\b|\bnever have to\b/i;
const LINT_FALSE_CHOICE =
  /\bnow or\b|\bor now\b|\bthe easy way or the hard way\b|\b(?:are you going to|will you) [^?]* or (?:shall|do|should) i\b|\bor do i have to\b/i;
const LINT_CONTROL =
  /\bbecause i said\b|\bno choice\b|\blike it or not\b|\bnot up to you\b|\byou will\b|\bdo as (?:you'?re|i)\b|\bgood (?:boy|girl)\b/i;

export const MINIMAL_MAX_WORDS = 12;
export const MAX_WORDS = 70;

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Checks one generated alternative for observable problems.
 * Safety situations may legitimately need a clear, direct boundary, so the
 * imperative-opening check is relaxed when `involvesSafety` is true.
 */
export function lintAlternative(
  text: string,
  options: { style: StyleId; involvesSafety?: boolean; noQuestions?: boolean },
): LintIssue[] {
  const issues: LintIssue[] = [];
  const trimmed = text.trim();

  if (!trimmed) return [{ check: "natural", message: "The alternative is empty." }];
  if (/[{}]|undefined|\[object/.test(trimmed)) issues.push({ check: "natural", message: "Contains template or placeholder text." });
  if (/ {2,}/.test(trimmed)) issues.push({ check: "natural", message: "Contains doubled spaces." });
  if (!/[.!?…”"')]$/.test(trimmed)) issues.push({ check: "natural", message: "Does not end as a complete sentence." });
  const words = wordCount(trimmed);
  if (words > MAX_WORDS) issues.push({ check: "natural", message: "Too long to say naturally in the moment." });
  if (options.style === "minimal" && words > MINIMAL_MAX_WORDS) {
    issues.push({ check: "appropriate", message: `Minimal language should be ${MINIMAL_MAX_WORDS} words or fewer.` });
  }

  const direct = trimmed.match(LINT_DIRECT);
  if (direct) issues.push({ check: "noDirectDemand", message: `Contains demand wording (“${direct[0]}”).` });

  if (!options.involvesSafety) {
    for (const sentence of splitSentences(trimmed)) {
      const verb = leadingImperative(sentence);
      if (verb && !sentence.endsWith("?")) {
        issues.push({ check: "noDirectDemand", message: `A sentence opens with an instruction word (“${verb}”).` });
        break;
      }
    }
  }

  const pressure = trimmed.match(LINT_PRESSURE);
  if (pressure) issues.push({ check: "pressureReduced", message: `Contains time pressure (“${pressure[0]}”).` });
  const conditional = trimmed.match(LINT_CONDITIONAL);
  if (conditional) issues.push({ check: "pressureReduced", message: `Contains conditional or repeated-request wording (“${conditional[0]}”).` });
  const promise = trimmed.match(LINT_PROMISE);
  if (promise) issues.push({ check: "noUnrealisticPromise", message: `Makes a promise that may not hold (“${promise[0]}”).` });
  const falseChoice = trimmed.match(LINT_FALSE_CHOICE);
  if (falseChoice) issues.push({ check: "noFalseChoice", message: `Offers a choice that is not a real choice (“${falseChoice[0]}”).` });
  const control = trimmed.match(LINT_CONTROL);
  if (control) issues.push({ check: "respectsAutonomy", message: `Contains controlling wording (“${control[0]}”).` });
  if (options.noQuestions && trimmed.includes("?")) {
    issues.push({ check: "fitsProfile", message: "Contains a question, but this profile prefers fewer questions." });
  }

  return issues;
}

export function allChecksPassing(): ValidationChecks {
  return {
    intentPreserved: true,
    pressureReduced: true,
    noDirectDemand: true,
    natural: true,
    noFalseChoice: true,
    noUnrealisticPromise: true,
    respectsAutonomy: true,
    fitsProfile: true,
    appropriate: true,
    safetyPreserved: true,
  };
}

export const CHECK_LABELS: Record<keyof ValidationChecks, string> = {
  intentPreserved: "Keeps the original intention",
  pressureReduced: "Reduces unnecessary pressure",
  noDirectDemand: "No direct or disguised demand",
  natural: "Sounds natural",
  noFalseChoice: "No false choices",
  noUnrealisticPromise: "No unrealistic promises",
  respectsAutonomy: "Respects autonomy",
  fitsProfile: "Fits the child’s profile",
  appropriate: "Appropriate for the situation",
  safetyPreserved: "Keeps necessary safety boundaries",
};
