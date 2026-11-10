import { SOURCES as S } from "./sources";
import type { KnowledgeArticle } from "./types";

const REVIEWED = "2026-11-10";

/**
 * Initial curated knowledge base.
 *
 * Editorial rules (see docs/AI_FOUNDATION.md):
 *  - no invented research, statistics or citations;
 *  - every article states its evidence classification;
 *  - where no verified source exists, content is marked as general guidance;
 *  - topics that have not been researched yet are explicit placeholders.
 */
export const ARTICLES: KnowledgeArticle[] = [
  {
    slug: "what-is-pda",
    category: "understanding-pda",
    title: "What is a PDA profile?",
    summary:
      "PDA describes a pattern in which everyday demands trigger intense anxiety and a strong need for control. In the UK it is most often described as a profile within autism.",
    content: [
      "PDA stands for Pathological Demand Avoidance. The term was introduced by Professor Elizabeth Newson in the 1980s to describe a group of children she saw in Nottingham who resisted ordinary, everyday demands to an extreme degree. Many people in the PDA community prefer other wording, such as “Persistent Drive for Autonomy”, because it describes the experience without implying fault.",
      "The PDA Society and the National Autistic Society describe PDA as a profile seen in some autistic people. Its central feature is that demands and expectations – including small, indirect and even enjoyable ones – can cause very high anxiety. Avoiding the demand is a way of coping with that anxiety and regaining a sense of control. Families often find the phrase “can’t, not won’t” helpful.",
      "Descriptions of the profile commonly include: resisting and avoiding the ordinary demands of life; using social strategies as part of avoidance (distraction, negotiation, excuses, humour); appearing sociable on the surface; sudden changes in mood; being comfortable in role play and fantasy; and an intense focus, often on other people.",
      "PDA is not a separate diagnosis in the main diagnostic manuals (DSM-5 and ICD-11). In the UK some clinicians describe it within an autism diagnosis, for example “autism with a demand avoidant profile”, and practice varies between areas. This app cannot assess or diagnose anyone. If you are wondering whether this profile fits your child, your GP or the service that knows your child is the place to start.",
    ],
    practicalExamples: [
      "A child who desperately wants to go to a party may still be unable to put their shoes on to leave – the demand, not the destination, is the difficulty.",
      "Avoidance can look like negotiating, changing the subject, becoming “too tired”, making a joke, or slipping into a character.",
    ],
    sources: [S.pdaSocietyWhatIs, S.nasDemandAvoidance, S.newson2003],
    evidence: "organisation_guidance",
    reviewDate: REVIEWED,
    tags: ["pda", "profile", "autism", "diagnosis", "newson", "definition", "can't not won't", "what is"],
    status: "published",
  },
  {
    slug: "what-research-says",
    category: "understanding-pda",
    title: "What the research does and does not tell us",
    summary:
      "PDA is widely recognised by families and many professionals, but the research base is small and experts disagree about how best to understand it.",
    content: [
      "It helps to be honest about the evidence. PDA was first described in clinical case series (Newson and colleagues, 2003). Since then researchers have developed a parent-report questionnaire for research use, the EDA-Q (O’Nions and colleagues, 2014) – it is a research measure, not a diagnostic test.",
      "A population study in the Faroe Islands (Gillberg and colleagues, 2015) reported that features of extreme demand avoidance were present in a proportion of autistic children and appeared less marked by adolescence in many of them. Other work has explored why demand avoidance happens: one study of parent reports found links between extreme demand avoidance, anxiety and difficulty tolerating uncertainty (Stuart and colleagues, 2020).",
      "There is real debate. Green and colleagues (2018) argued that demand avoidance is better understood as a set of symptoms that can arise for different reasons than as a distinct syndrome. A systematic review (Kildahl and colleagues, 2021) concluded that the existing studies have significant methodological limitations and that firm conclusions cannot yet be drawn.",
      "What this means in practice: the approaches families find helpful – reducing unnecessary demands, lowering anxiety, working collaboratively – come mainly from clinical experience and lived experience rather than from controlled trials. That does not make them wrong. It does mean they should be offered as things to try, not as proven treatments, and it is why this app never promises that any wording will work.",
    ],
    practicalExamples: [
      "Treat any strategy as an experiment: try it, notice what happens for your child, and keep what helps.",
      "If a professional is unfamiliar with PDA, describing your child’s specific needs (“direct instructions raise his anxiety; indirect wording helps”) is often more useful than debating the label.",
    ],
    sources: [S.newson2003, S.onions2014, S.gillberg2015, S.green2018, S.stuart2020, S.kildahl2021],
    evidence: "peer_reviewed",
    reviewDate: REVIEWED,
    tags: ["research", "evidence", "studies", "debate", "eda-q", "diagnosis", "science", "proof"],
    status: "published",
  },
  {
    slug: "declarative-language",
    category: "communication",
    title: "Declarative language: sharing instead of telling",
    summary:
      "Declarative language shares information, observations and thoughts without requiring a response. Many families find it lowers the feeling of demand.",
    content: [
      "Most of the language adults use with children is imperative: it asks for a response or an action. “Put your coat on.” “What do you say?” “Can you sit down?” Declarative language does something different. It comments, notices, wonders or thinks aloud, and leaves the other person free to respond or not.",
      "The idea is described in detail by speech and language therapist Linda Murphy in the Declarative Language Handbook, and it fits closely with the indirect communication recommended by the PDA Society. A declarative statement gives the child the information they need to work out what to do for themselves, which protects their sense of autonomy.",
      "Useful sentence openers include: “I notice…”, “I wonder…”, “I’m thinking about…”, “It looks like…”, “I’m not sure whether…”, and simple statements of fact such as “The bath is ready.” Tone matters as much as words: a declarative sentence said through gritted teeth is still a demand.",
      "Declarative language is not a trick for getting compliance by stealth. If the child senses a hidden agenda, the statement becomes a demand again. It works best when the adult is genuinely sharing information and is genuinely able to tolerate the child not acting on it straight away.",
    ],
    practicalExamples: [
      "Instead of “Put your coat on” → “It’s really cold out there today. I’m taking mine.”",
      "Instead of “What do you want for breakfast?” → “There’s toast and there’s cereal. I’m having toast.”",
      "Instead of “Say thank you” → “That was kind of Grandma. I’m going to say thanks.”",
    ],
    sources: [S.murphy2020, S.pdaSocietyApproaches],
    evidence: "organisation_guidance",
    reviewDate: REVIEWED,
    tags: ["declarative", "language", "wording", "phrases", "instructions", "communication", "indirect", "say", "talk"],
    status: "published",
  },
  {
    slug: "why-phrases-feel-demanding",
    category: "communication",
    title: "Why everyday phrases can feel demanding",
    summary:
      "Urgency, questions that expect a “yes”, conditions and even praise can all carry pressure. Knowing the common patterns makes them easier to spot.",
    content: [
      "A demand is anything that carries an expectation. Some are obvious – “Brush your teeth now.” Others are easy to miss because they sound polite or kind. The PDA Society notes that indirect demands, expectations, praise and even things the person wants to do can all be experienced as demands.",
      "Common patterns include: direct instructions; questions that are really instructions (“Can you get in the car?”); time pressure (“quickly”, “now”, “we’re late”); conditions and rewards (“if you… then you can…”); repeated requests (“I’ve already asked you”); comparisons and social expectations (“everyone else is ready”); and praise that signals an expectation to do the same again.",
      "Uncertainty can add pressure too. “We’ll see” or “maybe later” leaves the child not knowing what will happen, which can be harder than a clear answer.",
      "The translator in this app looks for these patterns in wording. It is assessing the language, not your child: the same sentence can be fine on a calm day and too much on a hard one. Capacity for demands rises and falls with anxiety, tiredness and sensory load.",
    ],
    practicalExamples: [
      "“Can you put your shoes on?” expects a yes, so it works as an instruction. “Shoes are by the door” shares the same information without requiring an answer.",
      "“Good boy for sitting nicely!” can create pressure to keep performing. A neutral observation such as “It’s nice eating together” carries less expectation.",
    ],
    sources: [S.pdaSocietyWhatIs, S.pdaSocietyApproaches, S.nasDemandAvoidance],
    evidence: "organisation_guidance",
    reviewDate: REVIEWED,
    tags: ["demands", "phrases", "questions", "praise", "time pressure", "language", "hidden demand", "why", "demanding"],
    status: "published",
  },
  {
    slug: "recognising-demands",
    category: "demand-avoidance",
    title: "Recognising the demands in a day",
    summary:
      "Demands are not only instructions. Routines, expectations, bodily needs and a child’s own wishes can all add to the load.",
    content: [
      "It can help to think of a child’s tolerance for demands as a container that fills during the day. Each demand adds a little; when the container is full, even a tiny request can be impossible. The PDA Society describes how tolerance varies from day to day and is closely linked to anxiety.",
      "Direct demands are requests and instructions from other people. Indirect demands include timetables, queues, expectations, questions, decisions, praise and social conventions. Internal demands come from the child’s own body and mind: hunger, needing the toilet, and things they have decided they want to do. This is why a child may be unable to do something they are looking forward to.",
      "Seen this way, the goal is not to remove every demand – that is impossible – but to notice how full the container is and reduce the demands that do not matter today, so there is capacity left for the ones that do.",
    ],
    practicalExamples: [
      "After a school day full of demands, the “container” may already be full. Lowering expectations after school (snack ready, no questions, quiet space) can make the evening easier.",
      "Ask yourself: does this need to happen at all? Does it need to happen now? Does it need to happen this way?",
    ],
    sources: [S.pdaSocietyWhatIs, S.pdaSocietyApproaches, S.christie2012],
    evidence: "organisation_guidance",
    reviewDate: REVIEWED,
    tags: ["demands", "tolerance", "capacity", "indirect", "internal demands", "after school", "avoidance", "refusing"],
    status: "published",
  },
  {
    slug: "panda-approach",
    category: "demand-avoidance",
    title: "The PANDA approach",
    summary:
      "PANDA is a memory aid from the PDA Society that summarises approaches many families find helpful.",
    content: [
      "The PDA Society uses the word PANDA to summarise helpful approaches. P – Pick battles: keep rules to a minimum, allow some choice and control, and explain reasons. A – Anxiety management: reduce uncertainty, recognise the signs of rising anxiety, and treat distressed behaviour as panic rather than defiance.",
      "N – Negotiation and collaboration: stay calm, work things out together, and aim for fairness and trust. D – Disguise and manage demands: word requests indirectly, keep an eye on how many demands are in play, and do things together. A – Adaptation: use humour, distraction, novelty and role play, be flexible, have a plan B, and allow plenty of time.",
      "These approaches differ from conventional parenting advice, which often relies on firm boundaries, rewards and consequences. Many families of PDA children report that rewards and consequences increase pressure and make things harder. The PANDA approaches are grounded in practice and lived experience rather than controlled trials, so treat them as a framework to adapt to your own child.",
    ],
    practicalExamples: [
      "Pick battles: decide the two or three things that truly matter (often safety) and let other things go for now.",
      "Adaptation: if getting dressed is impossible this morning, plan B might be travelling in pyjamas with clothes in a bag.",
    ],
    sources: [S.pdaSocietyApproaches],
    evidence: "organisation_guidance",
    reviewDate: REVIEWED,
    tags: ["panda", "strategies", "approaches", "pick battles", "negotiation", "rewards", "consequences", "flexible", "what can i try"],
    status: "published",
  },
  {
    slug: "anxiety-and-uncertainty",
    category: "anxiety",
    title: "Anxiety, uncertainty and the need for control",
    summary:
      "Demand avoidance is widely understood as driven by anxiety. Research suggests difficulty tolerating uncertainty may be an important part of the picture.",
    content: [
      "Organisations supporting PDA families describe avoidance as anxiety-driven: a demand threatens the child’s sense of control, anxiety rises sharply, and avoiding or controlling the situation brings that anxiety down. From the outside this can look like defiance; from the inside it is often closer to panic.",
      "Research is beginning to explore this. In a study based on parent reports, Stuart and colleagues (2020) found that intolerance of uncertainty and anxiety were both associated with extreme demand avoidance, and parents described controlling behaviour as one way their children coped with uncertainty. The study was small and relied on parent report, so it is a useful lead rather than a final answer.",
      "If uncertainty feeds anxiety, then predictability can help: saying what will happen, in what order, and what will stay the same. At the same time, rigid schedules can become demands in themselves. Many families settle on “predictable but flexible” – sharing the plan as information while leaving the child room to shape it.",
    ],
    practicalExamples: [
      "“First the dentist, then straight home. I’ll be with you the whole time.” – gives certainty without adding a condition.",
      "Avoid vague answers where you can. “Not today – we can go on Saturday” is easier to hold than “We’ll see”.",
      "Only state what you can actually deliver. A broken reassurance costs trust.",
    ],
    sources: [S.stuart2020, S.pdaSocietyApproaches, S.nasAnxiety],
    evidence: "peer_reviewed",
    reviewDate: REVIEWED,
    tags: ["anxiety", "uncertainty", "control", "panic", "predictability", "worry", "reassurance", "anxious"],
    status: "published",
  },
  {
    slug: "real-choices-and-autonomy",
    category: "autonomy",
    title: "Autonomy and offering real choices",
    summary:
      "A sense of control lowers anxiety. Choices help when they are genuine – and can add pressure when they are not, or when there are too many.",
    content: [
      "Guidance for PDA consistently emphasises giving the child as much genuine control as is safely possible. Collaborative approaches, such as Ross Greene’s Collaborative & Proactive Solutions, start from the same place: solve the problem with the child rather than imposing a solution on them.",
      "Choices are one way of sharing control, but they are not automatically helpful. A false choice (“Do you want to put your shoes on now or in two minutes?”) is still a demand and children often see straight through it. Having to choose is also a demand, and for some children any choice adds pressure – especially when anxiety is already high.",
      "Alternatives to either/or choices include: saying what has to happen and handing over the “how” (“The seatbelt has to be on; who clicks it is up to you”), leaving things available without comment, and inviting the child’s own idea. If you have noticed that choices are hard for your child, you can record that in their profile and the app will avoid either/or wording.",
    ],
    practicalExamples: [
      "Separate the fixed part from the flexible part: “Medicine is part of today. Spoon or syringe, before or after your drink – that’s yours.”",
      "Offer control over something real: who goes first, which route, what comes along, when to pause.",
    ],
    sources: [S.pdaSocietyApproaches, S.greene],
    evidence: "organisation_guidance",
    reviewDate: REVIEWED,
    tags: ["autonomy", "choice", "choices", "control", "collaboration", "false choice", "decisions", "negotiation"],
    status: "published",
  },
  {
    slug: "sensory-load-and-demands",
    category: "sensory-processing",
    title: "Sensory load and capacity for demands",
    summary:
      "Sensory differences are common in autistic children. Sensory discomfort uses up capacity, leaving less available for demands.",
    content: [
      "The National Autistic Society describes how autistic people may be over- or under-sensitive to sound, light, touch, taste, smell, balance and body awareness. Many everyday tasks that become battlegrounds – clothes, tooth brushing, hair washing, mealtimes, busy shops – have a large sensory component.",
      "When a task is both a demand and a sensory challenge, the two add together. A child who cannot bear the seams in socks is not avoiding getting dressed for the sake of it. Reducing the sensory load can be the most effective way of reducing the demand.",
      "This is general guidance: there is little research looking specifically at sensory processing and demand avoidance together. An occupational therapist with sensory training can assess your child’s individual sensory profile.",
    ],
    practicalExamples: [
      "Clothes: soft, seamless, label-free options, and the same favourite items washed often.",
      "Teeth: unflavoured toothpaste, a softer brush, or brushing somewhere other than the echoey bathroom.",
      "Outings: ear defenders or headphones available without comment, and a short list so the end is in sight.",
    ],
    sources: [S.nasSensory],
    evidence: "general_guidance",
    reviewDate: REVIEWED,
    tags: ["sensory", "noise", "clothes", "textures", "teeth", "food", "overload", "touch", "sound", "light", "smell"],
    status: "published",
  },
  {
    slug: "overwhelm-and-meltdowns",
    category: "emotional-regulation",
    title: "Overwhelm and meltdowns",
    summary:
      "A meltdown is an intense response to being overwhelmed, not a deliberate behaviour. In the moment the priorities are safety, fewer words and less pressure.",
    content: [
      "The National Autistic Society describes a meltdown as an intense response to an overwhelming situation, in which a person temporarily loses control of their behaviour. It is not the same as a temper tantrum and it is not a choice. Some children shut down or withdraw instead.",
      "During a meltdown the child is not able to reason, negotiate or learn. Guidance from autism organisations is consistent: keep everyone safe, reduce input (fewer words, lower lights, less noise, fewer people), remove demands, give space or stay quietly close depending on what your child prefers, and do not try to teach or discuss in the moment.",
      "Afterwards, children often feel exhausted, ashamed or frightened by what happened. Recovery time without demands, and reconnection without blame, help rebuild safety. Reflection – if it happens at all – belongs much later, when everyone is calm, and works best as curiosity about what was hard rather than a review of the behaviour.",
      "If meltdowns involve serious risk of harm to your child or others, or are becoming more frequent, speak to your GP or the service involved with your child. In an emergency call 999.",
    ],
    practicalExamples: [
      "In the moment: “I’m here. You’re safe.” Then stop talking.",
      "Afterwards: a drink and snack left nearby, a familiar programme, no questions.",
      "Later, on a calm day: “That morning was really hard. I wonder what made it so tricky – I’d like to make it easier.”",
    ],
    sources: [S.nasMeltdowns, S.pdaSocietyApproaches],
    evidence: "organisation_guidance",
    reviewDate: REVIEWED,
    tags: ["meltdown", "overwhelm", "overwhelmed", "shutdown", "distress", "calm", "regulation", "panic", "crisis", "hitting", "screaming"],
    status: "published",
  },
  {
    slug: "easing-transitions",
    category: "transitions",
    title: "Easing transitions",
    summary:
      "Stopping one thing and starting another involves several demands at once. Information, time and control over the ending can help.",
    content: [
      "A transition – leaving the house, switching off a screen, coming in from the garden – asks a child to stop something, let go of control, face uncertainty about what comes next, and start something new. Each part is a demand, which is why transitions are among the hardest moments of the day for many PDA children.",
      "Approaches recommended for PDA apply directly: share what is coming as information rather than instruction, allow extra time, and hand over control of how the ending happens. Countdowns and timers help some autistic children but can feel like mounting pressure to PDA children; notice which is true for yours.",
      "A bridge between activities can help: something from the current activity that comes along (a toy, the game’s music, a conversation about it), or a role for the child in the next step.",
    ],
    practicalExamples: [
      "“The game is finishing for today. You know the best stopping point – a save point, or the end of this level.”",
      "“I’m heading to the car. The explorer backpack is by the door if anyone wants to bring supplies.”",
      "Leave more time than you think you need, so that your own urgency does not leak into your voice.",
    ],
    sources: [S.pdaSocietyApproaches],
    evidence: "general_guidance",
    reviewDate: REVIEWED,
    tags: ["transitions", "leaving", "leaving the house", "screens", "stopping", "switching", "morning", "bedtime", "countdown", "timer"],
    status: "published",
  },
  {
    slug: "working-with-school",
    category: "education",
    title: "Working with school",
    summary:
      "School is full of demands. Sharing what works at home, in writing and in specific terms, helps staff adapt their approach.",
    content: [
      "A school day contains hundreds of direct and indirect demands, and many PDA children mask their distress at school and release it at home. The PDA Society publishes resources for education staff which stress relationships, flexibility, indirect language and reduced demands over conventional behaviour systems based on rewards and sanctions.",
      "When talking with school it often helps to be concrete: describe what your child finds hard, what the early signs of rising anxiety look like, and which specific adaptations help (for example, instructions phrased as information, a safe space they can go to without asking, flexibility over uniform or homework). A one-page profile written with your child, where possible, gives staff something practical to use.",
      "In England, children with special educational needs are entitled to support, and where needs are greater an Education, Health and Care (EHC) needs assessment can be requested. The systems differ in Scotland, Wales and Northern Ireland. IPSEA provides free, legally based information about the system in England.",
      "If your child is unable to attend school, you are not alone – this is a common experience for PDA families. Keep communicating with school in writing, and seek advice early from the organisations listed in the sources.",
    ],
    practicalExamples: [
      "In an email: “Direct instructions raise her anxiety. What helps: giving information (‘The worksheets are on the table’) and letting her choose where to start.”",
      "Ask for one key adult your child trusts, and an agreed signal for “I need a break”.",
    ],
    sources: [S.pdaSocietyEducation, S.ipsea],
    evidence: "organisation_guidance",
    reviewDate: REVIEWED,
    tags: ["school", "education", "teacher", "ehcp", "send", "homework", "attendance", "masking", "communicate with school", "senco"],
    status: "published",
  },
  {
    slug: "siblings-and-family",
    category: "family-support",
    title: "Siblings, relatives and family life",
    summary:
      "PDA-informed parenting can look unfair or permissive to others. Simple explanations and protected one-to-one time can help.",
    content: [
      "Parenting a PDA child often means doing things differently from other families: fewer rules, more flexibility, different expectations for different children. Siblings may feel this is unfair, and relatives may read it as “giving in”. These reactions are common and understandable.",
      "This article is general guidance drawn from common family experience rather than research. Many parents find it helps to explain to siblings, in simple terms, that fairness means everyone getting what they need rather than everyone getting the same; to protect some one-to-one time with each child; and to give siblings a safe space and a plan for difficult moments.",
      "With relatives, a short factual explanation (“Her anxiety spikes when she is told what to do, so we give information instead – it works much better”) and one or two specific requests are usually more effective than a general debate about parenting.",
    ],
    practicalExamples: [
      "To a sibling: “Your brother’s brain sounds an alarm when he’s told what to do. We’re all learning ways to keep the alarm quiet.”",
      "To a grandparent: “It really helps if you don’t ask for a hug or a thank-you. A wave is great.”",
    ],
    sources: [S.pdaSocietyWhatIs, S.cat2018],
    evidence: "general_guidance",
    reviewDate: REVIEWED,
    tags: ["siblings", "brother", "sister", "family", "grandparents", "relatives", "fairness", "relationships", "partner"],
    status: "published",
  },
  {
    slug: "looking-after-yourself",
    category: "parent-wellbeing",
    title: "Looking after yourself",
    summary:
      "Parenting a child with a PDA profile is demanding. Your wellbeing matters in its own right, and it also shapes what you have available for your child.",
    content: [
      "Parents of PDA children frequently describe exhaustion, isolation and being judged by others. If that is how you feel, it is not a sign that you are doing it wrong. Staying calm, flexible and creative all day is hard work, and nobody manages it all the time.",
      "This is general guidance rather than research. Things many parents say help: connecting with other PDA families (the PDA Society lists support options), lowering the bar on hard days, taking small pockets of rest where they exist, and repairing rather than aiming for perfection – “I’m sorry I shouted; I was overwhelmed” is powerful modelling.",
      "You may be entitled to support as a carer. In the UK you can ask your local authority for a carer’s assessment, and Carers UK provides information about rights and benefits. If you are feeling persistently low, anxious or unable to cope, please speak to your GP. If you are in crisis or feel unable to keep yourself safe, call 999, or contact Samaritans on 116 123 (free, any time).",
    ],
    practicalExamples: [
      "On a hard day, choose one thing that matters and let the rest go.",
      "Find one person or group who “gets it”, so you do not have to explain from the beginning each time.",
    ],
    sources: [S.pdaSocietyWhatIs, S.carersUk],
    evidence: "general_guidance",
    reviewDate: REVIEWED,
    tags: ["parent", "wellbeing", "exhausted", "struggling", "support", "self-care", "carer", "burnout", "coping", "tired", "guilt"],
    status: "published",
  },

  // ── Placeholders: research not yet completed ──────────────────────────────
  {
    slug: "sleep",
    category: "family-support",
    title: "Sleep",
    summary: "Placeholder – this article has not been researched and written yet.",
    content: [
      "Sleep is a common difficulty and this topic is planned. Verified sources have not yet been reviewed for it, so no guidance is offered here. In the meantime the PDA Specialist can share general suggestions, clearly labelled as such.",
    ],
    practicalExamples: [],
    sources: [],
    evidence: "placeholder",
    reviewDate: REVIEWED,
    tags: ["sleep", "bedtime", "night", "settling"],
    status: "placeholder",
  },
  {
    slug: "eating-and-drinking",
    category: "sensory-processing",
    title: "Eating and drinking",
    summary: "Placeholder – this article has not been researched and written yet.",
    content: [
      "Eating and drinking involve sensory, health and demand factors and deserve careful, properly sourced content. That research has not been completed yet. If you have concerns about your child’s eating, weight or hydration, please speak to your GP or health visitor.",
    ],
    practicalExamples: [],
    sources: [],
    evidence: "placeholder",
    reviewDate: REVIEWED,
    tags: ["eating", "food", "drinking", "mealtimes", "arfid"],
    status: "placeholder",
  },
  {
    slug: "personal-care",
    category: "autonomy",
    title: "Personal care",
    summary: "Placeholder – this article has not been researched and written yet.",
    content: [
      "Washing, teeth, hair and toileting are frequent pressure points. A sourced article is planned but has not been written yet. The articles on sensory load and on autonomy contain related general guidance.",
    ],
    practicalExamples: [],
    sources: [],
    evidence: "placeholder",
    reviewDate: REVIEWED,
    tags: ["personal care", "washing", "teeth", "bath", "toilet", "hygiene"],
    status: "placeholder",
  },
];

export function getArticle(slug: string): KnowledgeArticle | undefined {
  return ARTICLES.find((article) => article.slug === slug);
}

export function articlesByCategory(category: string): KnowledgeArticle[] {
  return ARTICLES.filter((article) => article.category === category);
}
