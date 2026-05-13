"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, BellOff, Pause, Play, RotateCcw } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";

type Phase = "work" | "short" | "long";

const PRESETS: Record<Phase, { label: string; minutes: number; color: string }> =
  {
    work: { label: "Foco", minutes: 25, color: "from-violet-500 to-indigo-500" },
    short: { label: "Pausa corta", minutes: 5, color: "from-emerald-500 to-teal-500" },
    long: { label: "Pausa larga", minutes: 15, color: "from-cyan-500 to-sky-500" },
  };

function chime() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
    setTimeout(() => ctx.close(), 700);
  } catch {
    /* noop */
  }
}

export function PomodoroWidget({ compact }: { compact?: boolean }) {
  const [phase, setPhase] = useState<Phase>("work");
  const [seconds, setSeconds] = useState(PRESETS.work.minutes * 60);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [soundOn, setSoundOn] = useState(true);

  const total = useMemo(() => PRESETS[phase].minutes * 60, [phase]);
  const progress = useMemo(() => 1 - seconds / total, [seconds, total]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          if (soundOn) chime();
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("Joseproject", {
              body:
                phase === "work"
                  ? "¡Foco completado! Tómate una pausa."
                  : "Pausa terminada. ¡Vuelve al foco!",
            });
          }
          if (phase === "work") {
            const nextCompleted = completed + 1;
            setCompleted(nextCompleted);
            const next: Phase = nextCompleted % 4 === 0 ? "long" : "short";
            setPhase(next);
            return PRESETS[next].minutes * 60;
          } else {
            setPhase("work");
            return PRESETS.work.minutes * 60;
          }
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, phase, completed, soundOn]);

  function reset() {
    setRunning(false);
    setSeconds(PRESETS[phase].minutes * 60);
  }

  function setPhaseAndReset(p: Phase) {
    setPhase(p);
    setSeconds(PRESETS[p].minutes * 60);
    setRunning(false);
  }

  function toggleSound() {
    setSoundOn((s) => {
      const next = !s;
      if (next && typeof Notification !== "undefined" && Notification.permission === "default") {
        Notification.requestPermission();
      }
      return next;
    });
  }

  const mm = Math.floor(seconds / 60).toString().padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");

  return (
    <GlassCard>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold tracking-tight">Pomodoro</h3>
        <button
          type="button"
          onClick={toggleSound}
          aria-label={soundOn ? "Silenciar" : "Activar sonido"}
          className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
        >
          {soundOn ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
        </button>
      </div>

      <div className="mb-4 flex gap-1 rounded-xl bg-black/40 p-1 text-xs">
        {(["work", "short", "long"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPhaseAndReset(p)}
            className={cn(
              "flex-1 rounded-lg px-2 py-1.5 font-medium transition",
              phase === p ? "bg-white/10 text-zinc-100" : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            {PRESETS[p].label}
          </button>
        ))}
      </div>

      <div className="relative mx-auto mb-4 flex h-44 w-44 items-center justify-center">
        <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
          <circle cx="50" cy="50" r="44" stroke="rgba(255,255,255,0.06)" strokeWidth="6" fill="none" />
          <circle
            cx="50"
            cy="50"
            r="44"
            stroke="url(#pomo-grad)"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 44}
            strokeDashoffset={2 * Math.PI * 44 * (1 - progress)}
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
          <defs>
            <linearGradient id="pomo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
        </svg>
        <div className="text-center">
          <p className="font-mono text-4xl font-medium tabular-nums text-zinc-50">
            {mm}:{ss}
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-widest text-zinc-500">
            {PRESETS[phase].label}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-violet-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-violet-400"
          onClick={() => setRunning((r) => !r)}
        >
          {running ? (
            <>
              <Pause className="h-4 w-4" /> Pausa
            </>
          ) : (
            <>
              <Play className="h-4 w-4" /> Iniciar
            </>
          )}
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5"
          onClick={reset}
        >
          <RotateCcw className="h-4 w-4" />
          Reiniciar
        </button>
      </div>

      {!compact && (
        <p className="mt-4 text-center text-xs text-zinc-500">
          Sesiones de foco completadas hoy:{" "}
          <span className="font-semibold text-violet-300">{completed}</span>
        </p>
      )}
    </GlassCard>
  );
}
