"use client";
// Press-to-start / press-to-stop microphone recording for the practice
// session. Lessons from Phase 1 testing (/stt-test) are built in:
// - one microphone stream stays open for the whole page; opening it fresh
//   each time cut off the first words while the mic warmed up
// - iPhone Safari claims to support formats it then rejects, so fall back
//   to the browser's default format
import { useCallback, useEffect, useRef, useState } from "react";

export type Recording = { blob: Blob; filename: string; seconds: number };
export type RecorderState = "idle" | "starting" | "recording";

function pickMimeType() {
  const options = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  return options.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t));
}

function extensionFor(type: string) {
  if (type.includes("webm")) return "webm";
  if (type.includes("mp4") || type.includes("aac")) return "mp4";
  if (type.includes("ogg")) return "ogg";
  if (type.includes("wav")) return "wav";
  return "webm";
}

function describeError(e: unknown) {
  const name = e instanceof DOMException ? e.name : "";
  const detail = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  if (name === "NotAllowedError" || name === "SecurityError") {
    return (
      "Microphone access is blocked for this site. On iPhone: tap “aA” in the address bar → " +
      `Website Settings → Microphone → Allow, then reload. (${detail})`
    );
  }
  if (name === "NotFoundError") return `No microphone found. (${detail})`;
  return `Could not start recording. (${detail})`;
}

type MeterRefs = {
  ctx: { current: AudioContext | null };
  analyser: { current: AnalyserNode | null };
  metered: { current: MediaStream | null };
};

// Connects the level meter for the mic button's ring. Only decoration, so any
// failure is ignored.
function connectMeter(refs: MeterRefs, stream: MediaStream) {
  try {
    refs.ctx.current ??= new AudioContext();
    const ctx = refs.ctx.current;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    if (refs.metered.current === stream) return;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    refs.analyser.current = analyser;
    refs.metered.current = stream;
  } catch {
    refs.analyser.current = null;
  }
}

export function useRecorder({
  onRecorded,
  maxSeconds = 30,
}: {
  onRecorded: (r: Recording) => void;
  /** Recording stops by itself after this long. */
  maxSeconds?: number;
}) {
  const [state, setState] = useState<RecorderState>("idle");
  const [error, setError] = useState("");
  const [micLabel, setMicLabel] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Voice level for the mic button's ring (an AnalyserNode on the open stream).
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const meteredRef = useRef<MediaStream | null>(null);
  const onRecordedRef = useRef(onRecorded);
  useEffect(() => {
    onRecordedRef.current = onRecorded;
  }, [onRecorded]);

  // Release the microphone when leaving the page.
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close().catch(() => {});
    },
    [],
  );

  const stop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    setState("idle");
  }, []);

  const start = useCallback(async () => {
    setError("");
    setState("starting");
    try {
      let stream = streamRef.current;
      if (!stream || stream.getAudioTracks().every((t) => t.readyState === "ended")) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        setMicLabel(stream.getAudioTracks()[0]?.label ?? "");
        await new Promise((r) => setTimeout(r, 500)); // warm-up on first use
      }
      connectMeter({ ctx: audioCtxRef, analyser: analyserRef, metered: meteredRef }, stream);
      let mimeType = pickMimeType();
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      } catch {
        mimeType = undefined;
        recorder = new MediaRecorder(stream);
      }
      chunksRef.current = [];
      recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      recorder.onstart = () => {
        startedAtRef.current = Date.now();
        setState("recording");
        timerRef.current = setTimeout(stop, maxSeconds * 1000);
      };
      recorder.onstop = () => {
        const seconds = (Date.now() - startedAtRef.current) / 1000;
        const type = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        if (blob.size === 0) {
          setError("Nothing was recorded. Try again.");
          return;
        }
        onRecordedRef.current({ blob, filename: `recording.${extensionFor(type)}`, seconds });
      };
      recorderRef.current = recorder;
      recorder.start();
    } catch (e) {
      setState("idle");
      setError(describeError(e));
    }
  }, [maxSeconds, stop]);

  /** How loud the learner is right now, 0..1 (0 if the meter isn't available). */
  const getLevel = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return 0;
    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (const v of data) sum += ((v - 128) / 128) ** 2;
    return Math.min(1, Math.sqrt(sum / data.length) * 5);
  }, []);

  return { state, error, setError, micLabel, start, stop, getLevel };
}
