// Dashboard.js
import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Line, Pie, Bar } from "react-chartjs-2";
import "chart.js/auto";
import { useNavigate } from "react-router-dom"; // ✅ added
import usePreferences from "../hooks/usePreferences";

export default function Dashboard() {
  const [preferences, updatePreferences, meta] = usePreferences();
  const [isEditOpen, setEditOpen] = useState(false);
  const navigate = useNavigate(); // ✅ added

  const last7Dates = useMemo(() => {
    const out = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      out.push(d.toISOString().split("T")[0]);
    }
    return out;
  }, []);

  const userName = meta?.user?.username || "guest";
  const petName = meta?.user?.petName || "No Pet";

  const dailyLog = preferences?.dailyLog || {};
  const dailyHistory = preferences?.dailyHistory || {};
  const stats = preferences?.stats || {};

  const feedToday = Number(dailyLog.feed || 0);
  const playToday = Number(dailyLog.play || 0);
  const interactToday = Number(dailyLog.interact || 0);
  const energy = stats.energy ?? 100;
  const happiness = stats.happiness ?? 80;
  const hunger = stats.hunger ?? 20;

  const lastAction = preferences?.lastAction || null;
  const lastActionAt = preferences?.lastActionAt || null;

  const lineData = {
    labels: last7Dates,
    datasets: [
      {
        label: "Feed",
        data: last7Dates.map((d) => Number(dailyHistory[d]?.feed || 0)),
        borderColor: "#5EEAD4",
        backgroundColor: "rgba(94,234,212,0.08)",
        fill: true,
        tension: 0.3,
        pointRadius: 2,
      },
      {
        label: "Play",
        data: last7Dates.map((d) => Number(dailyHistory[d]?.play || 0)),
        borderColor: "#7C3AED",
        backgroundColor: "rgba(124,58,237,0.07)",
        fill: true,
        tension: 0.3,
        pointRadius: 2,
      },
    ],
  };

  const pieData = {
    labels: ["Feed", "Play", "Interact"],
    datasets: [
      {
        data: [feedToday, playToday, interactToday],
        backgroundColor: ["#60F3FF", "#8B5CF6", "#FDE047"],
        borderWidth: 2,
        borderColor: "rgba(8,8,15,0.4)",
      },
    ],
  };

  const barData = {
    labels: last7Dates,
    datasets: [
      {
        label: "XP Gained",
        data: last7Dates.map((d) => {
          const h = dailyHistory[d] || {};
          return (
            (Number(h.feed || 0) +
              Number(h.play || 0) +
              Number(h.interact || 0)) *
            10
          );
        }),
        backgroundColor: "rgba(92,255,221,0.12)",
        borderColor: "#00E5BE",
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const commonChartOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: "#DDECF6", boxWidth: 10, boxHeight: 6 },
      },
      tooltip: {
        backgroundColor: "#0b1220",
        titleColor: "#E6F7FF",
        bodyColor: "#BFDFF0",
      },
    },
    scales: {
      x: {
        ticks: { color: "#AABCD6" },
        grid: { color: "rgba(255,255,255,0.03)" },
      },
      y: {
        ticks: { color: "#AABCD6" },
        grid: { color: "rgba(255,255,255,0.03)" },
      },
    },
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-[#07071a] via-[#0b1030] to-[#0b0b23] text-white">
      <div className="h-full w-full flex items-stretch">
        {/* LEFT SIDE */}
        <div className="w-[70%] h-full p-8 flex flex-col gap-6 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-[#7C3AED] to-[#00E5BE]">
                {petName}
              </h1>
              <p className="text-sm text-slate-300 mt-1">
                Welcome back,{" "}
                <span className="text-slate-100 font-medium">{userName}</span>
              </p>
            </div>

            {/* ✅ Updated button */}
            <div
              title="Back to Pet"
              onClick={() => navigate("/")}
              className="px-4 py-2 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#00E5BE] text-black font-medium cursor-pointer select-none"
            >
              Back to Pet
            </div>
          </div>

          {/* Charts */}
          <div className="flex-1 grid grid-cols-3 gap-4 min-h-0">
            <motion.div
              className="col-span-2 rounded-2xl bg-gradient-to-br from-white/4 to-white/3 border border-white/6 p-4"
              style={{ backdropFilter: "blur(10px)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-[#DFF7FF]">
                  Activity
                </h3>
                <div className="text-sm text-slate-300">Last 7 days</div>
              </div>
              <div className="flex-1 min-h-0">
                <Line data={lineData} options={commonChartOptions} />
              </div>
            </motion.div>

            <motion.div
              className="rounded-2xl bg-gradient-to-br from-white/4 to-white/3 border border-white/6 p-4 flex flex-col items-center justify-center"
              style={{ backdropFilter: "blur(10px)" }}
            >
              <div className="w-full mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#F7E2FF]">Today</h3>
                <div className="text-sm text-slate-300">Breakdown</div>
              </div>
              <div className="w-full flex-1 min-h-0 flex items-center justify-center">
                <Pie
                  data={pieData}
                  options={{ ...commonChartOptions, maintainAspectRatio: false }}
                />
              </div>
            </motion.div>

            <motion.div
              className="col-span-3 rounded-2xl bg-gradient-to-br from-white/4 to-white/3 border border-white/6 p-4"
              style={{ backdropFilter: "blur(10px)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-[#DFF7EA]">XP</h3>
                <div className="text-sm text-slate-300">Gained (7d)</div>
              </div>
              <div className="h-36">
                <Bar data={barData} options={commonChartOptions} />
              </div>
            </motion.div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="w-[30%] h-full p-6 flex flex-col gap-6 items-stretch relative">
          <motion.div
            className="relative z-10 rounded-3xl bg-gradient-to-tr from-[#07102b]/70 to-[#12072b]/70 border border-white/8 p-6 flex flex-col items-center"
            style={{ backdropFilter: "blur(12px)" }}
          >
            <div className="w-28 h-28 rounded-full p-[3px] bg-gradient-to-r from-[#7C3AED] to-[#00E5BE]">
              <div className="w-full h-full rounded-full bg-[#040614] flex items-center justify-center text-4xl">
                🐾
              </div>
            </div>

            <div className="mt-4 text-center">
              <div className="text-xl font-semibold">{petName}</div>
              <div className="text-sm text-slate-300 mt-1">@{userName}</div>
            </div>

            {/* Core stats */}
            <div className="mt-4 w-full grid grid-cols-3 gap-3">
              <div className="text-center p-2 rounded-lg bg-white/3">
                <div className="text-xs text-slate-300">Energy</div>
                <div className="font-medium">{energy}%</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-white/3">
                <div className="text-xs text-slate-300">Happiness</div>
                <div className="font-medium">{happiness}%</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-white/3">
                <div className="text-xs text-slate-300">Hunger</div>
                <div className="font-medium">{hunger}%</div>
              </div>
            </div>

           {/* LAST ACTION CARD */}
<div className="mt-6 w-full rounded-xl bg-white/4 border border-white/6 p-3 text-sm space-y-2">
  <div className="flex items-center justify-between">
    <div className="text-slate-300 font-medium">Last Fed</div>
    <div className="text-xs text-slate-200">
      {preferences?.lastFed ? preferences.lastFed : "—"}
    </div>
  </div>

  <div className="flex items-center justify-between">
    <div className="text-slate-300 font-medium">Fed At</div>
    <div className="text-xs text-slate-200">
      {preferences?.lastFedAt
        ? new Date(preferences.lastFedAt).toLocaleString()
        : "—"}
    </div>
  </div>

  <div className="flex items-center justify-between">
    <div className="text-slate-300 font-medium">Last Played</div>
    <div className="text-xs text-slate-200">
      {preferences?.lastPlayedGame || "—"}
    </div>
  </div>

  <div className="flex items-center justify-between">
    <div className="text-slate-300 font-medium">Played At</div>
    <div className="text-xs text-slate-200">
      {preferences?.lastPlayedAt
        ? new Date(preferences.lastPlayedAt).toLocaleString()
        : "—"}
    </div>
  </div>
</div>

          </motion.div>
        </div>
      </div>
    </div>
  );
}
