export const KNOWLEDGE_CATEGORIES = [
  { id: "understanding-pda", label: "Understanding PDA", blurb: "What a PDA profile is, and what is and is not known." },
  { id: "communication", label: "Communication", blurb: "How wording can raise or lower pressure." },
  { id: "demand-avoidance", label: "Demand avoidance", blurb: "Recognising demands and adapting them." },
  { id: "anxiety", label: "Anxiety", blurb: "The role of anxiety and uncertainty." },
  { id: "autonomy", label: "Autonomy", blurb: "Control, choice and trust." },
  { id: "sensory-processing", label: "Sensory processing", blurb: "How sensory load interacts with demands." },
  { id: "emotional-regulation", label: "Emotional regulation", blurb: "Overwhelm, meltdowns and recovery." },
  { id: "transitions", label: "Transitions", blurb: "Moving between activities and places." },
  { id: "education", label: "Education", blurb: "Working with school and settings." },
  { id: "family-support", label: "Family support", blurb: "Siblings, relatives and family life." },
  { id: "parent-wellbeing", label: "Parent wellbeing", blurb: "Looking after yourself too." },
] as const;

export type KnowledgeCategoryId = (typeof KNOWLEDGE_CATEGORIES)[number]["id"];

/**
 * How well supported an article's content is. Shown on every article.
 *  - organisation_guidance: reflects published guidance from an established organisation.
 *  - peer_reviewed: summarises peer-reviewed research (with its limitations).
 *  - lived_experience: draws mainly on accounts from PDA individuals and families.
 *  - general_guidance: sensible general guidance with no specific verified source.
 *  - placeholder: research not yet completed; awaiting content.
 */
export type EvidenceClass =
  | "organisation_guidance"
  | "peer_reviewed"
  | "lived_experience"
  | "general_guidance"
  | "placeholder";

export const EVIDENCE_LABELS: Record<EvidenceClass, { label: string; description: string }> = {
  organisation_guidance: {
    label: "Organisation guidance",
    description: "Reflects published guidance from an established organisation. Practice-based rather than trial-tested.",
  },
  peer_reviewed: {
    label: "Peer-reviewed research",
    description: "Summarises peer-reviewed studies. The PDA research base is small and has known limitations.",
  },
  lived_experience: {
    label: "Lived experience",
    description: "Draws mainly on accounts from PDA individuals and their families.",
  },
  general_guidance: {
    label: "General guidance",
    description: "General guidance without a specific verified source. Treat as suggestions.",
  },
  placeholder: {
    label: "Research pending",
    description: "This topic has not been researched and written yet.",
  },
};

export interface KnowledgeSource {
  title: string;
  publisher: string;
  year?: string;
  url?: string;
  type: "organisation" | "peer_reviewed" | "book" | "lived_experience";
}

export interface KnowledgeArticle {
  slug: string;
  category: KnowledgeCategoryId;
  title: string;
  summary: string;
  /** Paragraphs of main content. */
  content: string[];
  practicalExamples: string[];
  sources: KnowledgeSource[];
  evidence: EvidenceClass;
  /** ISO date the content was last reviewed. */
  reviewDate: string;
  tags: string[];
  status: "published" | "placeholder";
}
