import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, RotateCcw, Home } from "lucide-react";

const Game3 = ({ onGameFinished }) => {
  const navigate = useNavigate();
  const [userPrompt, setUserPrompt] = useState("");
  const [story, setStory] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [bgShift, setBgShift] = useState(0);

  const neonGradients = [
    "from-[#0f0c29] via-[#302b63] to-[#24243e]",
    "from-[#1a0033] via-[#40005a] to-[#0b001a]",
    "from-[#001d3d] via-[#240046] to-[#5a189a]",
  ];

  // Timer countdown
  useEffect(() => {
    if (story || isLoading) return;
    if (timeLeft <= 0) {
      onGameFinished("Game 3");
      return;
    }
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, story, isLoading]);

  // Background animation
  useEffect(() => {
    const interval = setInterval(() => {
      setBgShift((prev) => (prev + 1) % neonGradients.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleGenerate = async () => {
    if (!userPrompt.trim()) return;
    setIsLoading(true);
    setStory("");

    try {
      const res = await fetch("http://127.0.0.1:5001/generate_story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userPrompt }),
      });

      const data = await res.json();

      const text =
        typeof data.story === "string" && data.story.trim().length > 0
          ? data.story.trim()
          : "And that’s how the galaxy remembered the legend...";

      let i = 0;
      const interval = setInterval(() => {
        setStory((prev) => (prev ?? "") + (text[i] ?? ""));
        i++;
        if (i >= text.length) clearInterval(interval);
      }, 30);
    } catch (err) {
      console.error("❌ Story fetch error:", err);
      setStory(
        "⚠️ The AI core glitched mid-transmission. Try again when the signal stabilizes."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resetGame = () => {
    setUserPrompt("");
    setStory("");
    setTimeLeft(60);
  };

  return (
    <div
      className={`relative min-h-screen flex flex-col items-center justify-center text-white bg-gradient-to-br ${neonGradients[bgShift]} transition-all duration-1000 overflow-hidden`}
    >
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[size:40px_40px]" />

      <motion.h1
        className="text-4xl font-extrabold tracking-wide mb-6 text-center drop-shadow-[0_0_10px_#b388ff]"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Sparkles className="inline-block text-purple-400 mb-1" /> AI STORY
        PROTOCOL <span className="text-fuchsia-400">03</span>
      </motion.h1>

      <div className="relative z-10 w-full max-w-3xl">
        {!story ? (
          <motion.div
            className="flex flex-col items-center gap-4 bg-white/5 border border-fuchsia-600/40 rounded-2xl p-8 shadow-[0_0_30px_rgba(164,69,255,0.3)] backdrop-blur-md"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="> Initiate story input..."
              className="w-full p-4 rounded-lg bg-black/40 border border-purple-600/40 text-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 font-mono tracking-wide resize-none"
              rows={3}
            />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleGenerate}
              disabled={isLoading}
              className="px-8 py-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-fuchsia-500 hover:to-purple-600 text-white font-semibold tracking-wide shadow-[0_0_20px_rgba(255,0,255,0.4)] transition disabled:opacity-50"
            >
              {isLoading ? "Transmitting..." : "Continue Story →"}
            </motion.button>
            <div className="text-sm mt-2 text-purple-200/80">⏳ Time Left: {timeLeft}s</div>
          </motion.div>
        ) : (
          <motion.div
            className="bg-black/40 border border-purple-600/30 rounded-2xl p-8 backdrop-blur-md shadow-[0_0_25px_rgba(164,69,255,0.4)]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-2xl font-bold mb-4 text-fuchsia-400 drop-shadow-[0_0_10px_#f0f]">
              🧠 STORY SEQUENCE
            </h2>
            <p className="text-lg leading-relaxed text-purple-100 whitespace-pre-wrap">{userPrompt}</p>
            <p className="mt-3 text-white/90 leading-relaxed">{story}</p>

            <div className="flex justify-center gap-4 mt-8">
              <button
                onClick={resetGame}
                className="px-6 py-2 rounded-full bg-purple-600/40 hover:bg-purple-600/60 border border-fuchsia-400/30 text-white font-semibold flex items-center gap-2 shadow-[0_0_15px_rgba(255,0,255,0.3)]"
              >
                <RotateCcw size={16} /> Restart
              </button>
              <button
                onClick={() => onGameFinished("Game 3")}
                className="px-6 py-2 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 text-gray-900 font-semibold hover:from-green-300 hover:to-emerald-400"
              >
                Complete Mission
              </button>
            </div>
          </motion.div>
        )}
      </div>

      <motion.button
        onClick={() => navigate("/")}
        className="absolute bottom-6 right-6 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full text-white shadow-[0_0_20px_rgba(0,255,255,0.4)] hover:from-blue-500 hover:to-cyan-500 transition"
        whileTap={{ scale: 0.95 }}
      >
        <Home size={18} /> Back to Pet
      </motion.button>
    </div>
  );
};

export default Game3;