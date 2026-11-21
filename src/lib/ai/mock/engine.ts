import { DEMAND_LABELS, STYLE_IDS, STYLE_META, type StyleId } from "@/lib/types";
import { capitalise } from "@/lib/utils";
import type {
  DemandAnalysis,
  GeneratedAlternative,
  Generation,
  IntentAnalysis,
  Refinement,
  Validation,
} from "../schemas/translation.schema";
import {
  allChecksPassing,
  detectDemandsHeuristic,
  lintAlternative,
  MINIMAL_MAX_WORDS,
  wordCount,
} from "../translation/heuristics";
import {
  firstInterest,
  hasPreference,
  type BaseInput,
  type GenerateInput,
  type RefineInput,
  type ValidateInput,
} from "../translation/inputs";
import { contract, extractCore, firstSentence, removeQuestions, sanitiseStatement, type Core } from "./language";
import { findTopic, type Topic } from "./topics";

/**
 * Rule-based DEMO engine. It lets the whole product be explored without any AI
 * credentials. Output is assembled from hand-written examples and simple
 * language rules – it is always labelled as a demo response in the interface.
 */

const STYLE_INDEX: Record<StyleId, number> = {
  descriptive: 0, collaborative: 1, autonomy: 2, playful: 3, reassuring: 4, minimal: 5,
};

// ── Stage 1: intent ─────────────────────────────────────────────────────────

export function mockIntent(input: BaseInput): IntentAnalysis {
  const topic = findTopic(input.text, input.situation);
  if (topic) {
    return {
      summary: topic.summary,
      practicalObjective: topic.objective,
      topic: topic.category,
      involvesSafety: Boolean(topic.safety),
      safetyNote: topic.safety?.note ?? "",
    };
  }
  const core = extractCore(input.text);
  if (core.kind === "instruction") {
    return {
      summary: `The adult would like ${core.activity} to happen.`,
      practicalObjective: capitalise(core.activity) + ".",
      topic: "everyday",
      involvesSafety: false,
      safetyNote: "",
    };
  }
  if (core.kind === "prohibition") {
    return {
      summary: `The adult would like ${core.activity} to stop or change.`,
      practicalObjective: `A different way forward than ${core.activity}.`,
      topic: "everyday",
      involvesSafety: false,
      safetyNote: "",
    };
  }
  return {
    summary: "The adult wants to share this information with the child.",
    practicalObjective: "The child knowing what is happening.",
    topic: "everyday",
    involvesSafety: false,
    safetyNote: "",
  };
}

// ── Stage 2: demands ────────────────────────────────────────────────────────

export function mockDemands(input: BaseInput): DemandAnalysis {
  const { level, reasoning, triggers } = detectDemandsHeuristic(input.text);
  return { level, reasoning, triggers };
}

// ── Stage 4: generation ─────────────────────────────────────────────────────

type Bank = Record<StyleId, ((a: string) => string)[]>;

const INSTRUCTION_BANK: Bank = {
  descriptive: [
    (a) => `${capitalise(a)} is the next thing on my mind. I'm just saying it out loud — there's nothing to answer.`,
    (a) => `I've noticed that ${a} hasn't happened yet. I'm only mentioning it so it isn't a surprise.`,
  ],
  collaborative: [
    (a) => `I'm wondering how we could make ${a} work between us. I'd love to hear your ideas.`,
    (a) => `${capitalise(a)} is a puzzle I can't quite solve on my own. Maybe it's one we could figure out as a team.`,
  ],
  autonomy: [
    (a) => `${capitalise(a)} can happen your way — you're in charge of how it goes and when it starts.`,
    (a) => `There are probably a few ways of ${a}. You know best which one feels okay.`,
  ],
  playful: [
    (a) => `I wonder whether ${a} could be done in slow motion, or backwards, or like a robot.`,
    (a) => `Breaking news: ${a} has appeared on today's adventure map. Explorers may approach in their own time.`,
  ],
  reassuring: [
    (a) => `There's no rush. ${capitalise(a)} is the only thing coming up, and I'm right here with you.`,
    (a) => `Nothing tricky is hiding here. ${capitalise(a)} is all there is, and we can pause whenever you like.`,
  ],
  minimal: [(a) => `${capitalise(a)} — when you're ready.`, (a) => `${capitalise(a)}. No rush.`],
};

const PROHIBITION_BANK: Bank = {
  descriptive: [
    (b) => `I can see ${b}. I'm noticing it isn't working so well here.`,
    (b) => `I've spotted ${b}, and I'm a bit worried about how it might end.`,
  ],
  collaborative: [
    (b) => `I can see ${b}, and it's a problem for me here. I wonder what we could come up with together that works for us both.`,
    (b) => `It looks like ${b} is meeting a need. Maybe we could work out another way to meet it as a team.`,
  ],
  autonomy: [
    (b) => `${capitalise(b)} doesn't work here, and there are other places and ways that do. You know which of those would suit you.`,
    (b) => `I can't say yes to ${b} here. What happens instead is yours to decide.`,
  ],
  playful: [
    (b) => `I'm fairly sure ${b} is against the ancient laws of this house. The laws do mention an approved alternative somewhere.`,
    (b) => `Alert: ${b} detected. The official silly-alternative department has been called in.`,
  ],
  reassuring: [
    (b) => `You're not in trouble. I'm pausing ${b} to keep things okay, and I'm staying right here with you.`,
    (b) => `Nothing bad is happening. ${capitalise(b)} is the only thing I'm changing, and I'm here to help with what comes next.`,
  ],
  minimal: [(b) => `${capitalise(b)} isn't working here.`, (b) => `Pausing ${b}. You're okay.`],
};

const STATEMENT_BANK: Bank = {
  descriptive: [
    (s) => `Here's some information, with nothing to do about it yet: ${s}.`,
    (s) => `I'm sharing this so it isn't a surprise: ${s}.`,
  ],
  collaborative: [
    (s) => `Here's what I know: ${s}. I wonder how we could plan around it together.`,
    (s) => `${capitalise(s)}. I'd like us to work out together what would make that easier.`,
  ],
  autonomy: [
    (s) => `${capitalise(s)}. How you'd like to handle it is yours to decide, and I'll follow your lead.`,
    (s) => `${capitalise(s)}. There are different ways to go about it, and you know which suits you.`,
  ],
  playful: [
    (s) => `This just in from the news desk: ${s}. Our reporters are standing by for reactions.`,
    (s) => `Official announcement, delivered in my silliest voice: ${s}.`,
  ],
  reassuring: [
    (s) => `${capitalise(s)}. That's all there is to it, and I'm with you the whole way through.`,
    (s) => `${capitalise(s)}. Nothing else is changing, and I'm right here.`,
  ],
  minimal: [(s) => `Just so you know: ${s}.`, (s) => `For information: ${s}.`],
};

function lowerFirst(text: string): string {
  return /^I\b|^I'/.test(text) ? text : text.charAt(0).toLowerCase() + text.slice(1);
}

function bankFor(core: Core): { bank: Bank; subject: string } {
  if (core.kind === "instruction") return { bank: INSTRUCTION_BANK, subject: core.activity };
  if (core.kind === "prohibition") return { bank: PROHIBITION_BANK, subject: core.activity };
  const cleaned = sanitiseStatement(core.statement);
  // Only repeat the parent's own sentence if it carries no demand features itself.
  const safe =
    lintAlternative(`${capitalise(cleaned)}.`, { style: "descriptive" }).filter((i) => i.check !== "natural").length === 0 &&
    detectDemandsHeuristic(cleaned).triggers.length === 0;
  return { bank: STATEMENT_BANK, subject: safe && cleaned ? lowerFirst(cleaned) : "something is coming up that I'd like you to know about" };
}

function baseText(style: StyleId, topic: Topic | null, core: Core, variant: number, noChoice: boolean): string {
  if (topic && (variant === 0 || topic.safety)) {
    if (style === "autonomy" && noChoice && topic.autonomyNoChoice) return topic.autonomyNoChoice;
    return topic.styles[STYLE_INDEX[style]];
  }
  if (topic) {
    const options = INSTRUCTION_BANK[style];
    return options[(variant - 1) % options.length](topic.activity);
  }
  const { bank, subject } = bankFor(core);
  const options = bank[style];
  let text = options[variant % options.length](subject);
  if (style === "minimal" && wordCount(text) > MINIMAL_MAX_WORDS) {
    text =
      core.kind === "prohibition"
        ? "That isn't working here. You're okay."
        : core.kind === "instruction"
          ? `${capitalise(subject.split(/\s+/).slice(0, 6).join(" "))}. No rush.`
          : `${capitalise(subject.split(/\s+/).slice(0, 9).join(" "))}.`;
  }
  return text;
}

function removedPhrase(demands: DemandAnalysis): string {
  const labels = Array.from(new Set(demands.triggers.map((t) => DEMAND_LABELS[t.type].toLowerCase()))).slice(0, 2);
  if (labels.length === 0) return "It keeps the wording light and free of obvious pressure.";
  return `It avoids the ${labels.join(" and the ")} found in the original.`;
}

const STYLE_HOW: Record<StyleId, string> = {
  descriptive: "States what is true about the situation and leaves the child to make the connection.",
  collaborative: "Names the difficulty as a shared problem and invites the child’s ideas.",
  autonomy: "Keeps only what genuinely has to happen and hands over real control of the rest.",
  playful: "Moves the focus onto something funny or imaginative, so the request stops being the centre of attention.",
  reassuring: "Says exactly what will happen and that you are alongside, to reduce uncertainty.",
  minimal: "Uses very few words, so there is less language to process.",
};

export function mockGenerate(input: GenerateInput): Generation {
  const topic = findTopic(input.text, input.situation);
  const core = extractCore(input.text);
  const prefs = input.preferences;
  const noChoice = hasPreference(prefs, "choices_pressure");
  const noQuestions = hasPreference(prefs, "fewer_questions");
  const short = hasPreference(prefs, "short_explanations");
  const interest = firstInterest(input.childContext);
  const retryBump = Object.keys(input.previousIssues).length > 0 ? 1 : 0;

  const alternatives: GeneratedAlternative[] = input.styles.map((style) => {
    let text = baseText(style, topic, core, input.variant + retryBump, noChoice);
    if (style === "autonomy" && noChoice && !(topic && topic.autonomyNoChoice && (input.variant === 0 || topic.safety))) {
      text = text.replace(/\s*[—-]\s*[^.]*\bor\b[^.]*\./, ".");
    }
    if (style === "playful" && interest && !topic?.safety) {
      text = `${text} I wonder what ${interest} would make of it.`;
    }
    if (short && style !== "minimal" && !topic?.safety) text = firstSentence(text);
    if (noQuestions) text = removeQuestions(text);
    let explanation = `${STYLE_HOW[style]} ${removedPhrase(input.demands)}`;
    if (input.intent.involvesSafety) explanation += " The safety boundary itself is kept.";
    return { style, text, explanation };
  });

  const aim = input.intent.practicalObjective.replace(/[.]+$/, "");
  const overallExplanation =
    `Each alternative keeps the same aim (${lowerFirst(aim)}) but changes how it is communicated: sharing information, ` +
    "inviting collaboration, offering real choice, using play, reducing uncertainty or simply using fewer words. " +
    "None of them is guaranteed to work — they are different ways in, and you know your child best. " +
    "Demo examples sometimes include everyday details (such as the weather or what is for dinner); swap in what is true for you.";

  return { alternatives, overallExplanation };
}

// ── Stage 5: validation ─────────────────────────────────────────────────────

function keyTermsFor(text: string, situation: string): string[] {
  const topic = findTopic(text, situation);
  if (topic) {
    const fromActivity = topic.activity.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    return [...topic.keyTerms, ...fromActivity];
  }
  return extractCore(text).keyTerms;
}

export function mockValidate(input: ValidateInput): Validation {
  const keyTerms = keyTermsFor(input.text, input.situation);
  const noQuestions = hasPreference(input.preferences, "fewer_questions");
  return {
    results: input.alternatives.map((alt) => {
      const checks = allChecksPassing();
      const issues: string[] = [];
      for (const issue of lintAlternative(alt.text, {
        style: alt.style,
        involvesSafety: input.intent.involvesSafety,
        noQuestions,
      })) {
        checks[issue.check] = false;
        issues.push(issue.message);
      }
      const lower = alt.text.toLowerCase();
      const mentions = keyTerms.length === 0 || keyTerms.some((term) => lower.includes(term.toLowerCase()));
      if (!mentions) {
        checks.intentPreserved = false;
        issues.push("The original subject is no longer clearly present.");
        if (input.intent.involvesSafety) {
          checks.safetyPreserved = false;
          issues.push("The safety boundary is not clearly kept.");
        }
      }
      return { style: alt.style, checks, issues };
    }),
  };
}

// ── Refinement controls ─────────────────────────────────────────────────────

const PLAYFUL_TAILS = [
  "Slow-motion, robot-style and tiptoe-style all count.",
  "Silly voices are entirely optional but highly recommended.",
  "I may need a drum roll for this part.",
];

export function mockRefine(input: RefineInput): Refinement {
  const current = input.currentText.trim();
  const topic = findTopic(input.text, input.situation);
  const core = extractCore(input.text);
  const interest = firstInterest(input.childContext);
  const noChoice = hasPreference(input.preferences, "choices_pressure");
  const another = () => {
    for (let offset = 0; offset < 4; offset++) {
      const candidate = baseText(input.style, topic, core, input.variant + offset, noChoice);
      if (candidate !== current) return candidate;
    }
    return current;
  };

  switch (input.action) {
    case "shorter": {
      const first = firstSentence(current);
      let text = first !== current ? first : current.replace(/\s*[—–]\s*[^.!?]*(?=[.!?]$)/, "").replace(/,\s*and [^.!?]*(?=[.!?]$)/, "");
      if (text === current) text = current.split(/\s+/).slice(0, Math.max(4, Math.ceil(wordCount(current) * 0.6))).join(" ").replace(/[,;:—–-]+$/, "") + ".";
      return { text, explanation: "Trimmed to the essential part, so there is less language to take in." };
    }
    case "more_natural": {
      const text = contract(current)
        .replace(/\s*I'm just saying it out loud — there's nothing to answer\./, "")
        .replace(/\s*I'm only mentioning it so it isn't a surprise\./, "")
        .replace(/\bI wonder whether\b/g, "I wonder if")
        .trim();
      return {
        text: text !== current ? text : another(),
        explanation: "Reworded to sound more like everyday speech. Saying it in your own voice matters more than the exact words.",
      };
    }
    case "more_playful": {
      if (input.involvesSafety) {
        return { text: current, explanation: "Playfulness has been left as it is, because the safety boundary needs to stay clear here." };
      }
      const tail = interest
        ? `I wonder how ${interest} would do it.`
        : PLAYFUL_TAILS[input.variant % PLAYFUL_TAILS.length];
      const base = current.includes(tail) ? another() : current;
      return { text: `${base} ${tail}`, explanation: "Adds a light, imaginative touch to move attention away from the request itself." };
    }
    case "less_demanding": {
      let text = removeQuestions(current)
        .replace(/\b(?:right now|now|quickly|straight away)\b,?\s*/gi, "")
        .replace(/\s+/g, " ")
        .trim();
      if (!/no rush|whenever|when you're ready|can wait/i.test(text)) {
        text = input.style === "minimal" ? text : `${text} There's no rush — it can wait until you're ready.`;
      }
      if (text === current) text = another();
      return { text, explanation: "Removes questions and urgency, and makes it explicit that there is no time pressure." };
    }
    case "remove_questions": {
      const text = removeQuestions(current);
      return {
        text,
        explanation:
          text === current
            ? "This alternative already contains no questions — it is written as statements."
            : "Questions have been turned into statements, since a question can feel like it requires an answer.",
      };
    }
    case "explain": {
      const labels = Array.from(new Set(input.triggers.map((t) => DEMAND_LABELS[t.type].toLowerCase())));
      const original =
        labels.length > 0
          ? `The original wording contained ${labels.slice(0, 3).join(", ")}.`
          : "The original wording had few obvious demand phrases, though any request can still feel like one.";
      return {
        text: current,
        explanation: `${original} The ${STYLE_META[input.style].label.toLowerCase()} approach ${lowerFirst(STYLE_HOW[input.style])} The aim stays the same; what changes is how much pressure the words carry. This is an explanation of the language, not a prediction of how your child will respond.`,
      };
    }
    case "another":
    default: {
      let text = another();
      if (input.style === "playful" && interest && !input.involvesSafety) text = `${text} I wonder what ${interest} would make of it.`;
      return { text, explanation: `Another ${STYLE_META[input.style].label.toLowerCase()} way of saying it. ${STYLE_HOW[input.style]}` };
    }
  }
}

export const MOCK_STYLE_ORDER = STYLE_IDS;
