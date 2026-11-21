import { ARTICLES } from "./articles";
import type { KnowledgeArticle } from "./types";

const STOPWORDS = new Set([
  "the", "and", "for", "that", "this", "with", "are", "was", "but", "not", "you", "your", "can", "has", "have",
  "had", "how", "what", "why", "when", "who", "does", "did", "its", "it's", "our", "out", "from", "they", "them",
  "their", "about", "would", "could", "should", "will", "just", "been", "being", "into", "than", "then", "there",
  "here", "some", "any", "all", "get", "got", "him", "her", "his", "she", "he", "we", "me", "my", "is", "it", "to",
  "of", "in", "on", "a", "an", "i", "am", "do", "at", "as", "be", "or", "if", "so", "up", "really", "very", "help",
  "need", "want", "child", "son", "daughter", "today",
]);

export function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^'+|'+$/g, ""))
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .map(stem);
}

/** Very light stemmer so "transitions" matches "transition", "meltdowns" matches "meltdown". */
function stem(word: string): string {
  if (word.length > 5 && word.endsWith("ing")) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

interface IndexedArticle {
  article: KnowledgeArticle;
  fields: { weight: number; tokens: string[] }[];
}

let index: IndexedArticle[] | null = null;
let documentFrequency: Map<string, number> | null = null;

function buildIndex() {
  index = ARTICLES.map((article) => ({
    article,
    fields: [
      { weight: 4, tokens: tokenise(article.title) },
      { weight: 4, tokens: tokenise(article.tags.join(" ")) },
      { weight: 2, tokens: tokenise(article.summary) },
      { weight: 1, tokens: tokenise([...article.content, ...article.practicalExamples].join(" ")) },
    ],
  }));
  documentFrequency = new Map();
  for (const doc of index) {
    const unique = new Set(doc.fields.flatMap((f) => f.tokens));
    for (const token of unique) documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
  }
}

export interface SearchHit {
  article: KnowledgeArticle;
  score: number;
}

/** Weighted keyword search (TF-IDF style) over the bundled knowledge base. */
export function searchArticles(query: string, options: { limit?: number; includePlaceholders?: boolean } = {}): SearchHit[] {
  if (!index || !documentFrequency) buildIndex();
  const terms = Array.from(new Set(tokenise(query)));
  if (terms.length === 0) return [];
  const total = index!.length;

  const hits: SearchHit[] = [];
  for (const doc of index!) {
    if (doc.article.status === "placeholder" && !options.includePlaceholders) continue;
    let score = 0;
    for (const term of terms) {
      const df = documentFrequency!.get(term) ?? 0;
      if (df === 0) continue;
      const idf = Math.log(1 + total / df);
      for (const field of doc.fields) {
        const tf = field.tokens.filter((t) => t === term).length;
        if (tf > 0) score += field.weight * idf * (1 + Math.log(tf));
      }
    }
    if (score > 0) hits.push({ article: doc.article, score });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, options.limit ?? 5);
}
