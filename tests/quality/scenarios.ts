import type { DemandType } from "@/lib/types";

/**
 * Translation quality scenarios (initial set).
 * Each scenario is run through the full pipeline and checked for semantic
 * preservation, naturalness, hidden demands and safety. `expectTriggers`
 * lists demand types the analysis must detect in the ORIGINAL wording.
 */
export interface Scenario {
  id: string;
  category:
    | "direct" | "indirect" | "disguised" | "question" | "transition" | "safety" | "medical"
    | "school" | "eating" | "personal-care" | "sleep" | "play" | "family";
  text: string;
  situation?: string;
  expectTriggers: DemandType[];
  safety?: boolean;
  /** Minimum level expected from the analysis. */
  minLevel?: "moderate" | "high";
}

const s = (id: string, category: Scenario["category"], text: string, expectTriggers: DemandType[], extra: Partial<Scenario> = {}): Scenario => ({ id, category, text, expectTriggers, ...extra });

export const SCENARIOS: Scenario[] = [
  // ── Direct demands ────────────────────────────────────────────────────────
  s("direct-01", "direct", "Put your shoes on now.", ["direct_instruction", "time_pressure"], { minLevel: "high" }),
  s("direct-02", "direct", "Get dressed.", ["direct_instruction"], { minLevel: "moderate" }),
  s("direct-03", "direct", "You need to put your coat on.", ["direct_instruction"], { minLevel: "moderate" }),
  s("direct-04", "direct", "Tidy your room right now!", ["direct_instruction", "time_pressure"], { minLevel: "high" }),
  s("direct-05", "direct", "Sit down at the table.", ["direct_instruction"], { minLevel: "moderate" }),
  s("direct-06", "direct", "Stop shouting!", ["direct_instruction"], { minLevel: "moderate" }),
  s("direct-07", "direct", "Come here this minute.", ["direct_instruction", "time_pressure"], { minLevel: "high" }),
  s("direct-08", "direct", "You must wash your hands before dinner.", ["direct_instruction"], { minLevel: "moderate" }),
  s("direct-09", "direct", "Hurry up and get in the car!", ["time_pressure"], { minLevel: "moderate" }),
  s("direct-10", "direct", "I need you to feed the dog.", ["direct_instruction"], { minLevel: "moderate" }),
  s("direct-11", "direct", "Water the plants.", ["direct_instruction"], { minLevel: "moderate" }),
  s("direct-12", "direct", "Because I said so, you're wearing your jumper.", ["loss_of_control"], { minLevel: "moderate" }),

  // ── Indirect demands ──────────────────────────────────────────────────────
  s("indirect-01", "indirect", "It's time to brush your teeth.", ["indirect_instruction"]),
  s("indirect-02", "indirect", "Let's get your shoes on.", ["indirect_instruction"]),
  s("indirect-03", "indirect", "We need to leave in five minutes.", ["indirect_instruction", "time_pressure"], { minLevel: "moderate" }),
  s("indirect-04", "indirect", "You should really tidy those toys away.", ["indirect_instruction"]),
  s("indirect-05", "indirect", "Don't forget to pack your bag.", ["indirect_instruction"]),
  s("indirect-06", "indirect", "Why don't you go and play outside?", ["indirect_instruction"]),
  s("indirect-07", "indirect", "It would be nice if you said thank you to Grandma.", ["social_expectation"]),
  s("indirect-08", "indirect", "You know you have to do your homework.", ["implied_expectation", "lack_of_autonomy"], { minLevel: "moderate" }),
  s("indirect-09", "indirect", "Remember to flush the toilet.", ["indirect_instruction"]),
  s("indirect-10", "indirect", "We've got to go to the shop.", ["indirect_instruction"]),

  // ── Disguised / hidden demands ────────────────────────────────────────────
  s("disguised-01", "disguised", "I'd love it if you ate your vegetables.", ["hidden_demand"]),
  s("disguised-02", "disguised", "Be a big boy and put your shoes on for mummy.", ["hidden_demand"], { minLevel: "moderate" }),
  s("disguised-03", "disguised", "If you tidy your toys then you can have the tablet.", ["conditional_language"], { minLevel: "moderate" }),
  s("disguised-04", "disguised", "No tablet until you have had your bath.", ["conditional_language"], { minLevel: "moderate" }),
  s("disguised-05", "disguised", "I bet you can't get dressed before I count to ten.", ["hidden_demand", "time_pressure"], { minLevel: "moderate" }),
  s("disguised-06", "disguised", "Everyone else has their coat on.", ["social_expectation"]),
  s("disguised-07", "disguised", "It would make me so happy if you tried a bite.", ["hidden_demand"]),
  s("disguised-08", "disguised", "Good boy for sitting nicely, now eat your dinner.", ["social_expectation"], { minLevel: "moderate" }),
  s("disguised-09", "disguised", "You're so good at tidying, show me how well you can do it.", ["hidden_demand"]),
  s("disguised-10", "disguised", "I've already told you three times to brush your teeth.", ["repeated_request"], { minLevel: "moderate" }),
  s("disguised-11", "disguised", "If you don't turn the TV off there will be no pudding.", ["conditional_language"], { minLevel: "moderate" }),
  s("disguised-12", "disguised", "We'll see about the park later, just get your shoes on.", ["uncertainty"], { minLevel: "moderate" }),

  // ── Questions that function as instructions ───────────────────────────────
  s("question-01", "question", "Can you put your shoes on?", ["question_as_instruction"], { minLevel: "moderate" }),
  s("question-02", "question", "Could you please turn the tablet off?", ["question_as_instruction"], { minLevel: "moderate" }),
  s("question-03", "question", "Will you sit down at the table?", ["question_as_instruction"], { minLevel: "moderate" }),
  s("question-04", "question", "Have you brushed your teeth yet?", ["question_as_instruction"], { minLevel: "moderate" }),
  s("question-05", "question", "Are you going to get dressed today?", ["question_as_instruction"], { minLevel: "moderate" }),
  s("question-06", "question", "Shall we get your coat on?", ["question_as_instruction"], { minLevel: "moderate" }),
  s("question-07", "question", "Why haven't you tidied your room?", ["question_as_instruction"], { minLevel: "moderate" }),
  s("question-08", "question", "How many times do I have to ask you to wash your hands?", ["repeated_request"], { minLevel: "moderate" }),
  s("question-09", "question", "Would you like to do your homework now?", ["time_pressure"], { minLevel: "moderate" }),
  s("question-10", "question", "What do you say to Grandma?", ["question_as_instruction"]),

  // ── Transitions ───────────────────────────────────────────────────────────
  s("transition-01", "transition", "Turn the tablet off, it's dinner time.", ["direct_instruction", "transition"], { minLevel: "moderate" }),
  s("transition-02", "transition", "Stop playing, we're leaving the park.", ["direct_instruction", "transition"], { minLevel: "moderate" }),
  s("transition-03", "transition", "Time to go, get in the car.", ["transition"], { minLevel: "moderate" }),
  s("transition-04", "transition", "Switch off the Xbox now, it's bedtime.", ["transition", "time_pressure"], { minLevel: "high" }),
  s("transition-05", "transition", "Come inside, playtime is over.", ["transition"], { minLevel: "moderate" }),
  s("transition-06", "transition", "Finish your game, we need to go out.", ["transition"], { minLevel: "moderate" }),
  s("transition-07", "transition", "Two more minutes and then the TV goes off.", ["time_pressure"], { minLevel: "moderate" }),
  s("transition-08", "transition", "Get ready, we're going to the supermarket.", ["transition"], { minLevel: "moderate" }),
  s("transition-09", "transition", "Come on, we're going home now.", ["time_pressure", "transition"], { minLevel: "moderate" }),
  s("transition-10", "transition", "Put the iPad down and come for your tea.", ["direct_instruction", "transition"], { minLevel: "moderate" }),

  // ── Safety instructions ───────────────────────────────────────────────────
  s("safety-01", "safety", "Stop! Don't run into the road!", ["direct_instruction"], { safety: true }),
  s("safety-02", "safety", "Hold my hand when we cross the road.", ["direct_instruction"], { safety: true }),
  s("safety-03", "safety", "Put your seatbelt on now.", ["direct_instruction", "time_pressure"], { safety: true }),
  s("safety-04", "safety", "Don't touch the oven, it's hot!", ["direct_instruction"], { safety: true }),
  s("safety-05", "safety", "Stop hitting your sister!", ["direct_instruction"], { safety: true }),
  s("safety-06", "safety", "Put those scissors down right now.", ["direct_instruction", "time_pressure"], { safety: true }),
  s("safety-07", "safety", "Stay close to me in the car park.", ["direct_instruction"], { safety: true }),
  s("safety-08", "safety", "Get down from there, it's too high!", ["direct_instruction"], { safety: true }),
  s("safety-09", "safety", "You have to keep your seat belt on while I'm driving.", ["lack_of_autonomy"], { safety: true }),
  s("safety-10", "safety", "Stop kicking the dog!", ["direct_instruction"], { safety: true }),

  // ── Medical appointments ──────────────────────────────────────────────────
  s("medical-01", "medical", "We have to go to the dentist today.", ["lack_of_autonomy"]),
  s("medical-02", "medical", "You need to take your medicine.", ["direct_instruction"], { safety: true }),
  s("medical-03", "medical", "Sit still for the doctor.", ["direct_instruction"]),
  s("medical-04", "medical", "You're going to have your injection whether you like it or not.", ["lack_of_autonomy"], { minLevel: "moderate" }),
  s("medical-05", "medical", "Be brave for the nurse.", ["direct_instruction", "hidden_demand"], { minLevel: "moderate" }),
  s("medical-06", "medical", "Open your mouth for the dentist, please.", ["direct_instruction"]),
  s("medical-07", "medical", "Hurry up, we'll be late for your appointment.", ["time_pressure"], { minLevel: "moderate" }),
  s("medical-08", "medical", "Use your inhaler now.", ["direct_instruction", "time_pressure"], { safety: true }),

  // ── School situations ─────────────────────────────────────────────────────
  s("school-01", "school", "You have to go to school today.", ["direct_instruction"], { minLevel: "moderate" }),
  s("school-02", "school", "Put your uniform on.", ["direct_instruction"]),
  s("school-03", "school", "Do your homework before you play.", ["direct_instruction"]),
  s("school-04", "school", "Pack your bag for school.", ["direct_instruction"]),
  s("school-05", "school", "Tell me what you did at school today.", ["direct_instruction"]),
  s("school-06", "school", "Come on, we're going to be late for school again!", ["time_pressure", "repeated_request"], { minLevel: "high" }),
  s("school-07", "school", "You need to listen to your teacher.", ["direct_instruction"]),
  s("school-08", "school", "Practise your spellings.", ["direct_instruction"]),
  s("school-09", "school", "How was school?", []),

  // ── Eating and drinking ───────────────────────────────────────────────────
  s("eating-01", "eating", "Eat your dinner.", ["direct_instruction"]),
  s("eating-02", "eating", "Just try one bite.", ["direct_instruction"]),
  s("eating-03", "eating", "You need to drink some water.", ["direct_instruction"]),
  s("eating-04", "eating", "No pudding until you finish your vegetables.", ["conditional_language"], { minLevel: "moderate" }),
  s("eating-05", "eating", "Come and sit at the table for breakfast.", ["direct_instruction"]),
  s("eating-06", "eating", "Finish what's on your plate.", ["direct_instruction"]),
  s("eating-07", "eating", "Can you eat a bit more, please?", ["question_as_instruction"], { minLevel: "moderate" }),
  s("eating-08", "eating", "Dinner is ready.", []),

  // ── Personal care ─────────────────────────────────────────────────────────
  s("care-01", "personal-care", "Brush your teeth.", ["direct_instruction"]),
  s("care-02", "personal-care", "It's bath time, get in the bath.", ["transition"], { minLevel: "moderate" }),
  s("care-03", "personal-care", "Let me brush your hair.", ["direct_instruction"]),
  s("care-04", "personal-care", "Wash your hands, they're filthy.", ["direct_instruction"]),
  s("care-05", "personal-care", "Go to the toilet before we leave.", ["direct_instruction"]),
  s("care-06", "personal-care", "You need a shower, you smell.", ["direct_instruction"]),
  s("care-07", "personal-care", "We need to cut your nails.", ["indirect_instruction"]),
  s("care-08", "personal-care", "Put some sun cream on.", ["direct_instruction"]),

  // ── Sleep ─────────────────────────────────────────────────────────────────
  s("sleep-01", "sleep", "Go to bed.", ["direct_instruction"]),
  s("sleep-02", "sleep", "It's bedtime, lights out now.", ["time_pressure"], { minLevel: "moderate" }),
  s("sleep-03", "sleep", "Put your pyjamas on.", ["direct_instruction"]),
  s("sleep-04", "sleep", "Stay in your bed!", ["direct_instruction"]),
  s("sleep-05", "sleep", "Close your eyes and go to sleep.", ["direct_instruction"]),
  s("sleep-06", "sleep", "Wake up, it's time to get up.", ["direct_instruction"], { minLevel: "moderate" }),
  s("sleep-07", "sleep", "I won't tell you again, get back into bed.", ["repeated_request"], { minLevel: "moderate" }),

  // ── Play ──────────────────────────────────────────────────────────────────
  s("play-01", "play", "Share your toys with your brother.", ["direct_instruction", "social_expectation"], { minLevel: "moderate" }),
  s("play-02", "play", "Let your sister have a turn.", ["direct_instruction"]),
  s("play-03", "play", "Play nicely!", ["direct_instruction", "social_expectation"], { minLevel: "moderate" }),
  s("play-04", "play", "Go and play outside.", ["direct_instruction"]),
  s("play-05", "play", "Tidy up the Lego before you get anything else out.", ["direct_instruction"]),
  s("play-06", "play", "Turn that game off, you've had long enough.", ["direct_instruction", "transition"], { minLevel: "moderate" }),

  // ── Everyday family situations ────────────────────────────────────────────
  s("family-01", "family", "Say sorry to your sister.", ["direct_instruction", "social_expectation"], { minLevel: "moderate" }),
  s("family-02", "family", "Say thank you.", ["direct_instruction", "social_expectation"], { minLevel: "moderate" }),
  s("family-03", "family", "Give Grandma a hug.", ["direct_instruction", "social_expectation"], { minLevel: "moderate" }),
  s("family-04", "family", "Be quiet, I'm on the phone.", ["direct_instruction"]),
  s("family-05", "family", "Calm down!", ["direct_instruction"]),
  s("family-06", "family", "Wait a minute, I'm busy.", ["direct_instruction"]),
  s("family-07", "family", "Stop being mean to your brother.", ["direct_instruction"]),
  s("family-08", "family", "Lay the table for dinner, please.", ["direct_instruction"]),
  s("family-09", "family", "Listen to me when I'm talking to you.", ["direct_instruction"]),
  s("family-10", "family", "We're going to the supermarket and you're coming.", ["loss_of_control"], { minLevel: "moderate" }),
  s("family-11", "family", "Stop jumping on the sofa.", ["direct_instruction"]),
  s("family-12", "family", "Hang your coat up.", ["direct_instruction"]),
];
