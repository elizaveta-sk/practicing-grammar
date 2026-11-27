"use client";

import { setVoice, useVoice, VOICE_OPTIONS } from "@/lib/voice-choice";

export function VoicePicker() {
  const voice = useVoice();
  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 text-sm font-semibold text-muted">Voice</legend>
      <div className="inline-flex rounded-full bg-voice-soft p-1">
        {VOICE_OPTIONS.map((o) => (
          <button
            key={o.id}
            onClick={() => setVoice(o.id)}
            aria-pressed={voice === o.id}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              voice === o.id ? "bg-voice text-white shadow-sm" : "text-ink"
            }`}
          >
            {o.label} <span className={voice === o.id ? "opacity-80" : "text-muted"}>({o.accent})</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
