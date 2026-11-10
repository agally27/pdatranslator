import { z } from "zod";
import { ChildContextSchema, ConfirmedPreferenceSchema } from "./translation.schema";

export const SpecialistReplySchema = z.object({
  /** The reply shown to the parent. Plain text with simple paragraphs and "- " bullets. */
  reply: z.string(),
  /** Slugs of the supplied knowledge articles the reply actually drew on. */
  usedSourceSlugs: z.array(z.string()),
  /** True when the message suggests risk of harm to anyone. */
  safetyConcern: z.boolean(),
  /** A short (≤ 6 words) title for the conversation. */
  suggestedTitle: z.string(),
});
export type SpecialistReply = z.infer<typeof SpecialistReplySchema>;

export const ChatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000),
      }),
    )
    .min(1)
    .max(40)
    .refine((m) => m[m.length - 1].role === "user", "The last message must be from the user."),
  childContext: ChildContextSchema.nullish(),
  preferences: z.array(ConfirmedPreferenceSchema).max(30).default([]),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
