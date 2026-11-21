import { NextResponse } from "next/server";
import { ALLOWED_AUDIO_TYPES, MAX_AUDIO_BYTES, getTranscriptionProvider } from "@/lib/ai/transcription";
import { ApiError, assertSameOrigin, enforceRateLimit, requireUser, withApi } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/transcribe – multipart form with an `audio` file.
 * The recording is held in memory for the duration of the request only and is
 * never written to disk, storage or logs.
 */
export const POST = withApi("transcribe", async (request) => {
  assertSameOrigin(request);
  const user = await requireUser(request);
  enforceRateLimit(user, "transcribe", 10);

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_AUDIO_BYTES + 4096) throw new ApiError(413, "too_large", "That recording is too long. Please keep it under about two minutes.");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new ApiError(400, "invalid_request", "The recording could not be read.");
  }
  const audio = form.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) throw new ApiError(400, "invalid_request", "No recording was received.");
  if (audio.size > MAX_AUDIO_BYTES) throw new ApiError(413, "too_large", "That recording is too long. Please keep it under about two minutes.");
  const type = (audio.type || "").split(";")[0].toLowerCase();
  if (!ALLOWED_AUDIO_TYPES.includes(type)) throw new ApiError(415, "unsupported_media", "That audio format is not supported.");

  const extension = type.includes("mp4") || type.includes("m4a") || type.includes("aac") ? "mp4" : type.includes("ogg") ? "ogg" : type.includes("wav") ? "wav" : type.includes("mpeg") ? "mp3" : "webm";
  const result = await getTranscriptionProvider().transcribe(audio, `recording.${extension}`);
  return NextResponse.json(result);
});
