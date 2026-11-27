"use client";

import { setVoice, useVoice, VOICE_OPTIONS } from "@/lib/voice-choice";

export function VoicePicker() {
  const voice = useVoice();
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Voice</legend>
      <div className="flex gap-2">
        {VOICE_OPTIONS.map((o) => (
          <button
            key={o.id}
            onClick={() => setVoice(o.id)}
            aria-pressed={voice === o.id}
            className={`rounded-full border px-4 py-2 text-sm ${
              voice === o.id ? "border-blue-600 bg-blue-600 text-white" : "border-current/20"
            }`}
          >
            {o.label} <span className="opacity-70">({o.accent})</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
