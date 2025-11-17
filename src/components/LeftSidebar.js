import React, { useEffect, useState } from "react";
import usePreferences from "../hooks/usePreferences";
import { useNavigate } from "react-router-dom";

/* =========================
   KEYWORD: HOOKS / NAVIGATION
   Functionality: read user prefs and navigate
   Change point: replace/use different hook or nav behavior
   ========================= */
const LeftSidebar = () => {
  const [preferences = {}, , { loading, user }] = usePreferences();
  const navigate = useNavigate();

  /* =========================
     KEYWORD: TARGETS
     Functionality: daily targets for feed/play
     Change point: adjust targets to change stat scaling
     ========================= */
  const TARGETS = { feed: 3, play: 3 };

  /* =========================
     KEYWORD: TODAY COUNTS
     Functionality: combine today's in-memory log with saved history
     Change point: change date key method or add/remove actions
     ========================= */
  const getTodayCounts = () => {
    const hist = preferences.dailyHistory || {};
    const todayCounts = preferences.dailyLog || {};
    const todayKey = new Date().toISOString().slice(0, 10);
    const historyToday = hist[todayKey] || {};
    return {
      feed: todayCounts.feed ?? historyToday.feed ?? 0,
      play: todayCounts.play ?? historyToday.play ?? 0,
      groom: todayCounts.groom ?? historyToday.groom ?? 0,
      rest: todayCounts.rest ?? historyToday.rest ?? 0,
      interact: todayCounts.interact ?? historyToday.interact ?? 0,
    };
  };

  /* =========================
     KEYWORD: STATS LOGIC
     Functionality: compute displayed percent values from counts
     Change point: modify formulas (hunger/happiness/energy/love/xp)
     ========================= */
  const computeStats = (counts) => {
    const hunger = Math.min(100, Math.round((counts.feed / TARGETS.feed) * 100));
    const happiness = Math.min(100, Math.round((counts.play / TARGETS.play) * 100));
    const energy = Math.min(100, 50 + (counts.interact || 0) * 10 + (counts.rest || 0) * 5);
    const love = Math.min(100, (counts.interact || 0) * 15);
    const xp = Math.min(100, Object.values(counts).reduce((a, b) => a + b, 0) * 10);
    return { hunger, happiness, energy, love, xp };
  };

  /* =========================
     KEYWORD: STREAK CALCULATION
     Functionality: 30-day consistency % based on TARGETS
     Change point: adjust window length, criteria, or rewarding logic
     ========================= */
  const computeStreak = () => {
    const hist = preferences.dailyHistory || {};
    const todayCounts = preferences.dailyLog || {};
    const now = new Date();
    let success = 0;

    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);

      const day =
        i === 0
          ? { feed: todayCounts.feed || 0, play: todayCounts.play || 0 }
          : hist[key] || {};

      if ((day.feed || 0) >= TARGETS.feed && (day.play || 0) >= TARGETS.play) {
        success++;
      }
    }

    return Math.round((success / 30) * 100);
  };

  /* =========================
     KEYWORD: LOCAL DISPLAY STATE
     Functionality: stores values shown in UI (bars, streak, today counts)
     Change point: add/remove displayed metrics here
     ========================= */
  const [display, setDisplay] = useState({
    hunger: 0,
    happiness: 0,
    energy: 50,
    love: 0,
    xp: 0,
    streak: 0,
    todayCounts: {},
  });

  const [confirmedCounts, setConfirmedCounts] = useState(getTodayCounts());


  /* =========================
     KEYWORD: ANIMATED LOVE
     Functionality: smooth animation for Love bar
     Change point: modify animation steps/duration or remove animation
     ========================= */
  const [animatedLove, setAnimatedLove] = useState(0);

  useEffect(() => {
    const counts = getTodayCounts();
    const stats = computeStats(counts);
    const streak = computeStreak();
    setDisplay({ ...stats, streak, todayCounts: counts });

    // Smooth love animation: 10 steps @ 30ms per step
    const start = animatedLove;
    const end = stats.love;
    if (start !== end) {
      const step = (end - start) / 10;
      let current = start;
      const interval = setInterval(() => {
        current += step;
        if ((step > 0 && current >= end) || (step < 0 && current <= end)) {
          current = end;
          clearInterval(interval);
        }
        setAnimatedLove(current);
      }, 30);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    preferences.dailyLog?.feed,
    preferences.dailyLog?.play,
    preferences.dailyLog?.groom,
    preferences.dailyLog?.rest,
    preferences.dailyLog?.interact,
  ]);

  /* =========================
     KEYWORD: BARS CONFIG
     Functionality: mapping for bar UI (label, value, color class)
     Change point: add new bars or change color classes/labels
     ========================= */
  const bars = [
    { key: "hunger", label: "Hunger", value: display.hunger, className: "bg-yellow-400" },
    { key: "happiness", label: "Happiness", value: display.happiness, className: "bg-green-400" },
    { key: "energy", label: "Energy", value: display.energy, className: "bg-blue-400" },
    { key: "love", label: "Love", value: animatedLove, className: "bg-pink-400" },
    { key: "xp", label: "XP", value: display.xp, className: "bg-orange-400" },
  ];

  /* =========================
     KEYWORD: RENDER - WRAPPER
     Functionality: sidebar container (size, styling)
     Change point: adjust width, background, layout, overflow behavior
     ========================= */
  return (
    <aside className="w-72 h-screen bg-black bg-opacity-40 backdrop-blur-3xl border-r border-white/20 p-4 overflow-y-auto no-scrollbar">
      {/* KEYWORD: HEADER - PET ICON + TITLE */}
      <div className="text-center mb-4">
        <span className="text-4xl block mb-2 animate-bounce-slow">🐶</span>
        <h1 className="text-3xl font-black bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">Petzy</h1>
      </div>

      {/* KEYWORD: STATUS CARD - BARS + STREAK + TODAY COUNTS */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-4 mb-4 text-white">
        <h2 className="font-bold text-lg mb-3 text-center">🐾 Pet Status</h2>

        {/* KEYWORD: PROGRESS BARS (iterate to render) */}
        {bars.map((b) => (
          <div key={b.key} className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span>{b.label}</span>
              <span>{Math.round(b.value)}%</span>
            </div>
            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
              <div className={`${b.className} h-2 rounded-full`} style={{ width: `${b.value}%` }} />
            </div>
          </div>
        ))}

        {/* KEYWORD: STREAK DISPLAY (30-day) */}
        <div className="mt-4 text-center text-sm text-gray-300">
          <p>30-day Streak</p>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-2 rounded-full bg-green-400" style={{ width: `${display.streak}%` }} />
          </div>
          <p className="mt-1 text-xs">{display.streak}% consistency</p>
        </div>

        {/* KEYWORD: TODAY COUNTS SUMMARY */}
        <div className="mt-3 text-xs text-gray-400 text-center">
          Today — 🥩 {display.todayCounts.feed || 0} | 🎾 {display.todayCounts.play || 0} | 🐾 {display.todayCounts.interact || 0}
        </div>

        
      </div>

      {/* DASHBOARD BUTTON - GLASSMORPH */}
<div className="mt-6 flex justify-center">
  <button
    onClick={() => navigate("/Dashboard")}
    className="px-6 py-3 bg-white/10 backdrop-blur-2xl border border-white/20 text-white rounded-2xl font-bold text-lg hover:bg-white/20 transition-all duration-300 shadow-lg"
  >
    User Dashboard
  </button>
</div>

    </aside>
  );
};


export default LeftSidebar;
