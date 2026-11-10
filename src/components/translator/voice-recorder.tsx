"use client";

import { Mic, Square, TriangleAlert } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import { errorMessage, postForm } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type Status = "idle" | "requesting" | "recording" | "transcribing" | "error";

export const MAX_RECORDING_SECONDS = 90;

/** Picks a container the current browser can record (Safari/iOS needs mp4). */
export function pickMimeType(isSupported: (type: string) => boolean): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return candidates.find((type) => isSupported(type)) ?? "";
}

export function describeMicError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "Microphone access was blocked. You can allow it in your browser’s site settings, or type instead.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No microphone was found on this device. You can type instead.";
  if (name === "NotReadableError") return "The microphone is being used by another app. Close it and try again.";
  return "The microphone could not be started. You can type instead.";
}

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

interface Props {
  onTranscript(text: string, isDemo: boolean): void;
  disabled?: boolean;
}

/**
 * Records in the browser, sends the audio once for transcription and then
 * discards it. Nothing is stored; the transcript is handed back for editing.
 */
export function VoiceRecorder({ onTranscript, disabled }: Props) {
  const [status, setStatus] = React.useState<Status>("idle");
  const [seconds, setSeconds] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const timerRef = React.useRef<number | null>(null);

  const supported = typeof window !== "undefined" && typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== "undefined";

  const cleanup = React.useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  React.useEffect(() => cleanup, [cleanup]);

  const stop = React.useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }, []);

  const start = async () => {
    setError(null);
    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      const mimeType = pickMimeType((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        cleanup();
        setError("Recording stopped unexpectedly. Please try again.");
        setStatus("error");
      };
      recorder.onstop = async () => {
        const type = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        cleanup();
        if (blob.size === 0) {
          setError("Nothing was recorded. Please try again.");
          setStatus("error");
          return;
        }
        setStatus("transcribing");
        try {
          const form = new FormData();
          form.append("audio", blob, "recording");
          const result = await postForm<{ text: string; isDemo: boolean }>("/api/transcribe", form);
          if (!result.text.trim()) {
            setError("We couldn’t make out any words. Please try again, a little closer to the microphone.");
            setStatus("error");
            return;
          }
          onTranscript(result.text, result.isDemo);
          setStatus("idle");
        } catch (err) {
          setError(errorMessage(err));
          setStatus("error");
        }
      };

      recorder.start(1000);
      setSeconds(0);
      setStatus("recording");
      timerRef.current = window.setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_RECORDING_SECONDS) stop();
          return s + 1;
        });
      }, 1000);
    } catch (err) {
      cleanup();
      setError(describeMicError(err));
      setStatus("error");
    }
  };

  if (!supported) {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-amber-soft-100 p-4 text-sm text-amber-soft-600" role="note">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>Voice recording isn’t available in this browser. You can type your sentence instead.</p>
      </div>
    );
  }

  const recording = status === "recording";
  const busy = status === "requesting" || status === "transcribing";

  return (
    <div className="flex flex-col items-center gap-4 rounded-(--radius-card) border border-ink-100 bg-sage-50/60 px-4 py-7 text-center">
      <button
        type="button"
        onClick={recording ? stop : start}
        disabled={disabled || busy}
        aria-pressed={recording}
        aria-label={recording ? "Stop recording" : "Start recording"}
        className={cn(
          "relative flex size-20 items-center justify-center rounded-full text-white shadow-md transition-colors disabled:opacity-60",
          recording ? "bg-rose-soft-600" : "bg-sage-600 hover:bg-sage-700",
        )}
      >
        {recording ? <span className="absolute inset-0 animate-pulse-soft rounded-full ring-4 ring-rose-soft-600/30" aria-hidden /> : null}
        {busy ? <Spinner className="size-7" label={status === "transcribing" ? "Transcribing" : "Starting microphone"} /> : recording ? <Square className="size-7 fill-current" aria-hidden /> : <Mic className="size-8" aria-hidden />}
      </button>

      <div aria-live="polite" className="min-h-10 text-sm">
        {status === "idle" ? <p className="text-ink-700">Tap to start recording. You’ll be able to check and edit the words before anything is translated.</p> : null}
        {status === "requesting" ? <p className="text-ink-700">Waiting for microphone permission…</p> : null}
        {recording ? (
          <p className="font-medium text-rose-soft-600">
            <span className="mr-2 inline-block size-2 animate-pulse-soft rounded-full bg-rose-soft-600 align-middle" aria-hidden />
            Recording {formatTime(seconds)} <span className="font-normal text-ink-500">· tap to stop (max {formatTime(MAX_RECORDING_SECONDS)})</span>
          </p>
        ) : null}
        {status === "transcribing" ? <p className="text-ink-700">Turning your recording into text…</p> : null}
        {status === "error" && error ? <p role="alert" className="text-rose-soft-600">{error}</p> : null}
      </div>

      {status === "error" ? <Button variant="outline" size="sm" onClick={start}>Try again</Button> : null}
      <p className="text-xs text-ink-500">Recordings are sent once for transcription and are not stored.</p>
    </div>
  );
}
