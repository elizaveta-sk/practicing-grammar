"use client";
// The learner's voice choice is a per-device convenience, so it lives in
// localStorage (which can be unavailable, e.g. in private browsing).
import { useSyncExternalStore } from "react";

export const VOICE_OPTIONS = [
  { id: "el-jessica", label: "Jessica", accent: "American" },
  { id: "el-daniel", label: "Daniel", accent: "British" },
] as const;
export type VoiceId = (typeof VOICE_OPTIONS)[number]["id"];

const KEY = "voice";
const listeners = new Set<() => void>();

function read(): VoiceId {
  try {
    const v = localStorage.getItem(KEY);
    if (VOICE_OPTIONS.some((o) => o.id === v)) return v as VoiceId;
  } catch {}
  return VOICE_OPTIONS[0].id;
}

export function setVoice(id: VoiceId) {
  try {
    localStorage.setItem(KEY, id);
  } catch {}
  listeners.forEach((l) => l());
}

export function useVoice(): VoiceId {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => VOICE_OPTIONS[0].id,
  );
}
