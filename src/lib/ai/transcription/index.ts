import { serverConfig } from "@/lib/config";
import { withTimeout } from "../json";
import { mapOpenAIStatus } from "../providers/openai";
import { AIError } from "../types";
import { logUsage } from "../usage";

export interface TranscriptionResult {
  text: string;
  /** True when the transcript is a canned demo sentence, not a real transcription. */
  isDemo: boolean;
  provider: string;
  model: string;
}

export interface TranscriptionProvider {
  transcribe(audio: Blob, filename: string): Promise<TranscriptionResult>;
}

export const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
export const ALLOWED_AUDIO_TYPES = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav", "audio/x-m4a", "audio/aac", "video/webm", "video/mp4"];

const DEMO_TRANSCRIPTS = [
  "Put your shoes on now, we're going to be late.",
  "Can you please turn the tablet off and come for dinner?",
  "You need to brush your teeth before bed.",
];

/**
 * Used when no OpenAI key is configured. Audio is discarded unread; the
 * returned sentence is a fixed example so the review-and-edit flow can be tried.
 */
export class DemoTranscriptionProvider implements TranscriptionProvider {
  async transcribe(audio: Blob): Promise<TranscriptionResult> {
    const text = DEMO_TRANSCRIPTS[audio.size % DEMO_TRANSCRIPTS.length];
    return { text, isDemo: true, provider: "demo", model: "demo" };
  }
}

export class OpenAITranscriptionProvider implements TranscriptionProvider {
  constructor(
    private options: { apiKey: string; model: string; timeoutMs: number; baseUrl?: string; fetchImpl?: typeof fetch },
  ) {}

  async transcribe(audio: Blob, filename: string): Promise<TranscriptionResult> {
    const started = Date.now();
    const doFetch = this.options.fetchImpl ?? fetch;
    try {
      const form = new FormData();
      form.append("file", audio, filename);
      form.append("model", this.options.model);
      form.append("response_format", "json");
      form.append("language", "en");
      const response = await withTimeout(
        (signal) =>
          doFetch(`${this.options.baseUrl ?? "https://api.openai.com/v1"}/audio/transcriptions`, {
            method: "POST",
            signal,
            headers: { Authorization: `Bearer ${this.options.apiKey}` },
            body: form,
          }),
        this.options.timeoutMs,
      );
      if (!response.ok) throw mapOpenAIStatus(response.status);
      const data = (await response.json()) as { text?: string };
      if (typeof data.text !== "string") throw new AIError("invalid_response", "The transcription response was empty.", true);
      logUsage({ provider: "openai", model: this.options.model, task: "transcribe", ok: true, durationMs: Date.now() - started });
      return { text: data.text.trim(), isDemo: false, provider: "openai", model: this.options.model };
    } catch (err) {
      const mapped = err instanceof AIError ? err : new AIError("provider_error", "Could not reach the transcription service.", true);
      logUsage({ provider: "openai", model: this.options.model, task: "transcribe", ok: false, durationMs: Date.now() - started, errorCode: mapped.code });
      throw mapped;
    }
  }
}

export function getTranscriptionProvider(): TranscriptionProvider {
  const config = serverConfig();
  if (config.openaiApiKey) {
    return new OpenAITranscriptionProvider({ apiKey: config.openaiApiKey, model: config.transcriptionModel, timeoutMs: config.timeoutMs });
  }
  return new DemoTranscriptionProvider();
}
