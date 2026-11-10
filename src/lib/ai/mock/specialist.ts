import type { SpecialistReply } from "../schemas/specialist.schema";
import type { SpecialistInput } from "../specialist/context";
import { SAFETY_SIGNPOST } from "../specialist/safety";
import { firstInterest, hasPreference } from "../translation/inputs";

/**
 * Rule-based DEMO specialist. Replies are assembled from hand-written
 * passages chosen by keyword, with knowledge-base articles attached as
 * sources. Always labelled as a demo response in the interface.
 */
interface DemoTopic {
  id: string;
  match: RegExp;
  title: string;
  opening: string;
  ideas: string[];
  closing: string;
  /** Knowledge articles this reply draws on (cited only if retrieved). */
  slugs: string[];
}

const TOPICS: DemoTopic[] = [
  {
    id: "parent",
    match: /\b(i'?m|i am|i feel|feeling) (so |really |just |completely )?(struggling|exhausted|tired|drained|overwhelmed|failing|alone|lonely|lost|done|broken)\b|\bneed (some )?support\b|\bcan'?t cope\b|\bburn(t|ed)? ?out\b|\bbad (mum|dad|parent|mother|father)\b|\bfailing\b|\bguilt\w*\b/i,
    title: "Support for you",
    opening:
      "That sounds really heavy, and I'm glad you said it. Parenting in a way that keeps demands low takes constant thought and patience, and nobody can do that all day without running low. Struggling is not a sign you're getting it wrong.",
    ideas: [
      "On days like this, picking one thing that matters and letting the rest go is a legitimate plan, not giving up.",
      "A small pocket of rest counts — ten minutes with a hot drink while a screen does the babysitting is allowed.",
      "Many parents say that finding even one other PDA family who “gets it” lightens the load. The PDA Society lists support options, and Carers UK explains carers’ assessments.",
    ],
    closing:
      "If the low feeling is sticking around, your GP is a good person to tell. What has today been like for you?",
    slugs: ["looking-after-yourself"],
  },
  {
    id: "morning",
    match: /\b(morning|mornings|get(ting)? (up|ready|dressed)|before school|school run|wake|waking)\b/i,
    title: "Difficult mornings",
    opening:
      "Mornings pack a lot of demands into a short time — waking, dressing, eating, leaving — usually with a clock ticking in the background. It makes sense that they're hard; one possibility is that the sheer number of demands fills up your child's capacity before the day has even started.",
    ideas: [
      "Strip the morning back to what truly has to happen. Could breakfast happen in the car, or clothes go on over pyjamas?",
      "Share information instead of instructions: “Clothes are on the chair”, “The car's warming up”. It gives the same message without requiring an answer.",
      "Build in more time than seems necessary, so your own urgency doesn't leak into your voice — children often pick that up before the words.",
    ],
    closing: "Which part of the morning tends to be the sticking point?",
    slugs: ["recognising-demands", "easing-transitions", "declarative-language"],
  },
  {
    id: "overwhelm",
    match: /\b(overwhelm\w*|meltdown\w*|melt down|shut ?down|explod\w*|screams?|screaming|lash(es|ing)? out|distress\w*|panic\w*|rage|hitting|hits|violent|throws?|throwing)\b/i,
    title: "When your child is overwhelmed",
    opening:
      "Those moments are hard for everyone, including your child. Autism organisations describe a meltdown as an intense response to being overwhelmed rather than a choice — so in the moment, the aim is safety and less input, not teaching.",
    ideas: [
      "Use very few words. Something like “I'm here. You're safe.” — and then quiet.",
      "Reduce what's coming in: fewer people, lower light and noise, and no demands at all, even small ones.",
      "Afterwards, allow recovery time with no questions. A drink and a snack left nearby says “we're okay” without needing a conversation.",
    ],
    closing:
      "Later, on a calm day, curiosity about what made it so hard (rather than a review of what happened) can help you both. Would it help to think through what tends to come before these moments?",
    slugs: ["overwhelm-and-meltdowns", "anxiety-and-uncertainty"],
  },
  {
    id: "school",
    match: /\b(school|teacher|senco|class|classroom|ehcp|homework|attendance|nursery|education)\b/i,
    title: "Communicating with school",
    opening:
      "School is one of the most demand-heavy places a child can be, and many families find their child holds it together there and releases it at home. Working with school usually goes best when the conversation is concrete.",
    ideas: [
      "Describe what you see rather than debating labels: “Direct instructions raise their anxiety; giving information works better.”",
      "Ask for two or three specific adaptations — for example a trusted key adult, a safe space they can use without asking, and flexibility on homework.",
      "Put it in writing. A one-page profile of what helps and what doesn't gives staff something practical to use.",
    ],
    closing:
      "The PDA Society publishes resources aimed at schools, and IPSEA explains the legal side of SEND support in England. Would you like help drafting a short message to school?",
    slugs: ["working-with-school"],
  },
  {
    id: "language",
    match: /\b(why (might|does|is|would)|language|wording|phrase|words?|say(ing)?|demanding|instruction|ask(ing)?|tell(ing)?)\b/i,
    title: "Why language can feel demanding",
    opening:
      "It's a really useful thing to be curious about. A demand is anything that carries an expectation, and plenty of everyday phrases carry one even when they sound gentle.",
    ideas: [
      "Questions that expect a “yes” (“Can you get your shoes?”) work as instructions.",
      "Urgency (“now”, “quickly”), conditions (“if you… then…”) and repeats (“I've already asked”) each add pressure on top of the request.",
      "Even praise can signal an expectation to do the same again.",
    ],
    closing:
      "Declarative language — sharing information or thinking aloud, like “Shoes are by the door” — leaves your child free to work out the next step themselves. If you have a specific phrase in mind, the Translator can show where the pressure sits in it.",
    slugs: ["why-phrases-feel-demanding", "declarative-language"],
  },
  {
    id: "sleep",
    match: /\b(sleep|bed ?time|night|nights|settle|settling|awake)\b/i,
    title: "Sleep and bedtime",
    opening:
      "Bedtime asks a child to stop what they're doing, separate from you and lie still with their thoughts — that's several demands at once, right when everyone is tired. I should be upfront that the Knowledge Hub doesn't yet have a sourced article on sleep, so these are general suggestions rather than established guidance.",
    ideas: [
      "Take the word “sleep” out of it. “Resting in bed is enough” removes a demand nobody can meet on command.",
      "Keep the run-up predictable but let your child shape it: which story, lamp or dark, audiobook or quiet.",
      "Describe rather than instruct: “The lamp's on and your bed's warm” instead of “Time for bed.”",
    ],
    closing: "If sleep problems are persistent, it's worth raising with your GP. What does bedtime look like at the moment?",
    slugs: ["easing-transitions", "real-choices-and-autonomy"],
  },
  {
    id: "eating",
    match: /\b(eat|eating|food|meal|mealtimes?|dinner|breakfast|lunch|drink|drinking|fussy|picky)\b/i,
    title: "Eating and drinking",
    opening:
      "Food brings together sensory experience, bodily signals and a lot of expectation from adults, so it's a very common pressure point. The Knowledge Hub doesn't yet have a sourced article on eating, so please take these as general suggestions.",
    ideas: [
      "Lower the stakes at the table: food offered without comment, no praise for eating and no “just one bite”.",
      "Keep reliable “safe” foods available alongside anything new, so there is always something manageable.",
      "Think about the setting — some children eat far more easily away from the table, or alongside a screen or a book.",
    ],
    closing:
      "If you're worried about weight, hydration or a very narrow range of foods, please speak to your GP or health visitor. Is it the eating itself, or the sitting together, that's hardest?",
    slugs: ["sensory-load-and-demands"],
  },
  {
    id: "leaving",
    match: /\b(leav(e|ing) the house|go(ing)? out|out of the house|car|transition\w*|screen|tablet|switch(ing)? off|stop(ping)? play\w*)\b/i,
    title: "Transitions and leaving the house",
    opening:
      "Transitions ask a lot: stop something, give up control of it, face uncertainty about what's next, and start something new. One possibility is that it's the switch itself, rather than the destination, that's hard.",
    ideas: [
      "Share what's coming as information (“I'm heading to the car”) rather than an instruction.",
      "Hand over the ending: “You know the best stopping point — a save point, or the end of the level.”",
      "Offer a bridge: something from the current activity that comes along, or a real job for the next bit.",
    ],
    closing:
      "Countdowns help some children and feel like mounting pressure to others — it's worth noticing which is true for yours. Which transition is the trickiest at the moment?",
    slugs: ["easing-transitions", "real-choices-and-autonomy"],
  },
  {
    id: "care",
    match: /\b(teeth|bath|shower|wash(ing)?|hair|toilet|nappy|nails|personal care|hygiene|dressed|clothes)\b/i,
    title: "Personal care",
    opening:
      "Personal care is often a double load: it's a demand, and it's a sensory experience too. A child who can't bear the feel of a toothbrush or wet hair isn't avoiding it for the sake of it.",
    ideas: [
      "Look for the sensory part and soften it — unflavoured toothpaste, a softer brush, a flannel wash instead of a bath.",
      "Give real control over the how: who holds the brush, where it happens, when to pause.",
      "Lower the frequency or standard on hard days. A “good enough” version protects trust for tomorrow.",
    ],
    closing: "An occupational therapist can look at sensory needs in more detail. Which bit of personal care is the hardest right now?",
    slugs: ["sensory-load-and-demands", "real-choices-and-autonomy"],
  },
  {
    id: "family",
    match: /\b(sibling\w*|brother|sister|grandparent\w*|grandma|grandad|partner|husband|wife|relatives?|family)\b/i,
    title: "Family relationships",
    opening:
      "Parenting differently for one child can look unfair to siblings and like “giving in” to relatives. Those reactions are common, and they don't mean you're doing the wrong thing.",
    ideas: [
      "With siblings: fairness can be explained as everyone getting what they need, rather than everyone getting the same.",
      "Protect a little one-to-one time with each child where you can, even ten minutes.",
      "With relatives: a short, factual explanation plus one specific request (“A wave is great — please don't ask for a hug”) tends to land better than a debate about parenting.",
    ],
    closing: "This is general guidance from common family experience rather than research. Who are you finding it hardest to get on the same page with?",
    slugs: ["siblings-and-family"],
  },
  {
    id: "understand",
    match: /\b(what is pda|understand(ing)? pda|pda profile|pathological demand|diagnos\w*|research|evidence|explain pda|is pda)\b/i,
    title: "Understanding PDA",
    opening:
      "PDA is most often described in the UK as a profile seen in some autistic people, where everyday demands — even small or enjoyable ones — trigger very high anxiety and a strong need to feel in control. Families often find “can't, not won't” a helpful way to hold it.",
    ideas: [
      "It isn't a separate diagnosis in the main diagnostic manuals, and practice varies between areas.",
      "The research base is still small, and experts disagree about how best to understand it.",
      "The approaches families find helpful come mainly from clinical and lived experience, so they're things to try rather than proven treatments.",
    ],
    closing:
      "I can't assess or diagnose, but I'm happy to talk through what you're noticing. The Knowledge Hub articles below go into more detail.",
    slugs: ["what-is-pda", "what-research-says"],
  },
];

const REFLECT: DemoTopic = {
  id: "reflect",
  match: /\b(what happened|today|yesterday|this (morning|afternoon|evening)|earlier|just now|understand)\b/i,
  title: "Thinking it through",
  opening:
    "I'd like to help you make sense of it. I can't know for certain why something happened, but it often helps to look at what was going on just before — how many demands had already stacked up, how tired or hungry everyone was, and whether anything unexpected changed.",
  ideas: [
    "Capacity for demands tends to go up and down with anxiety, so the same request can be fine one day and impossible the next.",
    "The moment things tipped over is often the last small demand, not the biggest one.",
  ],
  closing: "Tell me what happened in whatever order it comes — a few lines is plenty.",
  slugs: ["recognising-demands", "anxiety-and-uncertainty"],
};

const DEFAULT: DemoTopic = {
  id: "default",
  match: /.*/,
  title: "New conversation",
  opening:
    "Thanks for sharing that. I can't know exactly what's going on for your child, but I can offer some PDA-informed ways of thinking about it.",
  ideas: [
    "Ask whether the thing needs to happen at all, needs to happen now, or needs to happen this way — dropping non-essential demands leaves capacity for the ones that matter.",
    "Try sharing information instead of giving instructions, and see what your child does with it.",
    "Look for something real you can hand over control of: the how, the when, or the order.",
  ],
  closing: "Tell me a bit more about the situation and I can be more specific.",
  slugs: ["panda-approach", "recognising-demands", "declarative-language"],
};

function pickTopic(text: string): DemoTopic {
  return TOPICS.find((topic) => topic.match.test(text)) ?? (REFLECT.match.test(text) ? REFLECT : DEFAULT);
}

export function mockSpecialist(input: SpecialistInput): SpecialistReply {
  const userMessages = input.messages.filter((m) => m.role === "user");
  const latest = userMessages[userMessages.length - 1]?.content ?? "";
  const topic = pickTopic(latest);
  const isFollowUp = input.messages.filter((m) => m.role === "assistant").length > 0;

  const parts: string[] = [];
  if (input.safetyConcern) {
    parts.push(
      "What you've described sounds serious, and safety comes first — yours and your child's. " + SAFETY_SIGNPOST,
    );
  }
  parts.push(isFollowUp && topic.id === "default" ? "Thank you — that helps me picture it." : topic.opening);

  let ideas = topic.ideas;
  if (hasPreference(input.preferences, "short_explanations")) ideas = ideas.slice(0, 2);
  parts.push(`Some things you could try:\n${ideas.map((idea) => `- ${idea}`).join("\n")}`);

  // Personalisation uses only details the parent has shared and confirmed.
  const personal: string[] = [];
  const interest = firstInterest(input.childContext);
  if (interest && topic.id !== "parent") {
    personal.push(`You've told me your child loves ${interest} — weaving that in playfully can take the weight off a request.`);
  }
  if (input.childContext?.effectiveStrategies.trim() && topic.id !== "parent") {
    personal.push(`You've also noted what tends to help (“${input.childContext.effectiveStrategies.trim().slice(0, 120)}”) — that's worth leaning on here.`);
  }
  if (hasPreference(input.preferences, "choices_pressure")) {
    personal.push("Since you've confirmed that choices can add pressure, I'd avoid either/or options and hand over the “how” instead.");
  }
  if (personal.length > 0) parts.push(personal.join(" "));

  parts.push(`${topic.closing} None of this is guaranteed to work — you know your child best.`);

  const retrieved = new Set(input.passages.map((p) => p.slug));
  const used = topic.slugs.filter((slug) => retrieved.has(slug));

  return {
    reply: parts.join("\n\n"),
    usedSourceSlugs: used.length > 0 ? used : input.passages.slice(0, 1).map((p) => p.slug),
    safetyConcern: input.safetyConcern,
    suggestedTitle: topic.title,
  };
}
