// Web Speech API — voice input (STT) + voice output (TTS)

export type VoiceState = "idle" | "listening" | "speaking";

class VoiceEngine {
  private recognition: any = null;
  private synth: SpeechSynthesis | null = null;
  private _state: VoiceState = "idle";
  private _onStateChange: ((s: VoiceState) => void) | null = null;
  private _onTranscript: ((t: string, final: boolean) => void) | null = null;

  constructor() {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = "en-US";
      this.recognition.onresult = (e: any) => {
        const t = Array.from(e.results).map((r: any) => r[0].transcript).join("");
        const final = e.results[e.results.length - 1].isFinal;
        this._onTranscript?.(t, final);
      };
      this.recognition.onend = () => this._setState("idle");
      this.recognition.onerror = () => this._setState("idle");
    }
    this.synth = window.speechSynthesis ?? null;
  }

  get supported() { return !!this.recognition; }
  get ttsSupported() { return !!this.synth; }
  get state() { return this._state; }

  onStateChange(fn: (s: VoiceState) => void) { this._onStateChange = fn; }
  onTranscript(fn: (t: string, final: boolean) => void) { this._onTranscript = fn; }

  private _setState(s: VoiceState) {
    this._state = s;
    this._onStateChange?.(s);
  }

  startListening() {
    if (!this.recognition || this._state !== "idle") return;
    try {
      this.recognition.start();
      this._setState("listening");
    } catch {}
  }

  stopListening() {
    if (!this.recognition) return;
    try { this.recognition.stop(); } catch {}
    this._setState("idle");
  }

  speak(text: string, onDone?: () => void) {
    if (!this.synth) { onDone?.(); return; }
    this.synth.cancel();
    // Strip markdown for speech
    const clean = text
      .replace(/```[\s\S]*?```/g, "code block omitted")
      .replace(/`[^`]+`/g, "")
      .replace(/[*_#>]/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .slice(0, 800);
    const utt = new SpeechSynthesisUtterance(clean);
    utt.rate = 1.0;
    utt.pitch = 0.9;
    utt.volume = 1.0;
    // Pick a voice — prefer a natural-sounding female/neutral
    const voices = this.synth.getVoices();
    const preferred = voices.find(v =>
      v.name.includes("Samantha") || v.name.includes("Google US English") || v.name.includes("Karen")
    ) ?? voices.find(v => v.lang.startsWith("en")) ?? voices[0];
    if (preferred) utt.voice = preferred;
    utt.onend = () => { this._setState("idle"); onDone?.(); };
    utt.onerror = () => { this._setState("idle"); onDone?.(); };
    this._setState("speaking");
    this.synth.speak(utt);
  }

  stopSpeaking() {
    this.synth?.cancel();
    this._setState("idle");
  }
}

export const voice = new VoiceEngine();
