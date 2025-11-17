// src/components/games/Game2.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import earthImg from "../../assets/images/earth.jpg";
import marsImg from "../../assets/images/mars.jpg";
import saturnImg from "../../assets/images/saturn.png";
import venusImg from "../../assets/images/venus.png";
import galaxyBg from "../../assets/images/galaxy-bg.jpg"; // optional if you have it

const planetData = [
  { name: "EARTH", hint: "The only known planet with life 🌍", image: earthImg },
  { name: "MARS", hint: "The red planet with dusty landscapes 🔴", image: marsImg },
  { name: "SATURN", hint: "Known for its beautiful icy rings 💍", image: saturnImg },
  { name: "VENUS", hint: "The hottest planet, shrouded in clouds ☁️", image: venusImg },
];

const DEFAULT_LIVES = 5;
const DEFAULT_TIME = 30;

const Game2 = ({ onGameFinished }) => {
  const navigate = useNavigate();

  const [current, setCurrent] = useState(0);
  const [guessed, setGuessed] = useState([]);
  const [lives, setLives] = useState(DEFAULT_LIVES);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_TIME);
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);

  const currentPlanet = planetData[current];

  // letters - include planet letters + random letters
  const letters = useMemo(() => {
    const required = currentPlanet.name.split("");
    const pool = "ABCDEFGHIKLMNOPQRSTUVWXYZ".split("");
    const filler = pool.sort(() => 0.5 - Math.random()).slice(0, Math.max(6, 12 - required.length));
    const all = Array.from(new Set(required.concat(filler)));
    return all.sort(() => 0.5 - Math.random());
  }, [currentPlanet]);

  // Timer - stop when game over
  useEffect(() => {
    if (gameOver) return;
    if (timeLeft <= 0) {
      handleNext(false);
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, gameOver]); // eslint-disable-line

  const resetGame = useCallback(() => {
    setCurrent(0);
    setGuessed([]);
    setLives(DEFAULT_LIVES);
    setTimeLeft(DEFAULT_TIME);
    setGameOver(false);
    setWin(false);
  }, []);

  const handleLetterClick = (letter) => {
    if (gameOver) return;
    if (guessed.includes(letter)) return;

    const newGuessed = [...guessed, letter];
    setGuessed(newGuessed);

    if (!currentPlanet.name.includes(letter)) {
      setLives((l) => {
        const nl = l - 1;
        if (nl <= 0) {
          handleNext(false);
        }
        return nl;
      });
    } else {
      const allCorrect = currentPlanet.name.split("").every((ch) => newGuessed.includes(ch));
      if (allCorrect) handleNext(true);
    }
  };

  const handleNext = (correct) => {
    if (correct) {
      if (current + 1 < planetData.length) {
        setCurrent((c) => c + 1);
        setGuessed([]);
        setTimeLeft(DEFAULT_TIME);
      } else {
        setWin(true);
        setGameOver(true);
        if (typeof onGameFinished === "function") onGameFinished("Geo Guess Game");
      }
    } else {
      setGameOver(true);
    }
  };

  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-screen bg-cover bg-center text-white overflow-hidden"
      style={{ backgroundImage: `url('${galaxyBg || "/images/galaxy-bg.jpg"}')` }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

      {!gameOver ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="z-10 flex flex-col items-center p-8 rounded-3xl border border-cyan-400/50 bg-gradient-to-b from-cyan-950/60 to-cyan-900/20 shadow-[0_0_30px_rgba(0,255,255,0.4)] backdrop-blur-md"
        >
          {/* Header: Restart and Back to Pet */}
          <div className="flex items-center justify-between w-full mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={resetGame}
                className="text-sm px-3 py-1 border border-cyan-400 text-cyan-300 rounded-md hover:bg-cyan-800/50"
              >
                ↻ Restart
              </button>

              <button
                onClick={() => navigate("/")} // change route here if your pet page is at a different path
                className="text-sm px-3 py-1 border border-cyan-400 text-cyan-300 rounded-md hover:bg-cyan-800/50"
              >
                🐾 Back to Pet
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xl">❤️ {lives}</span>
              <span className="text-xl">⏱️ {timeLeft}s</span>
            </div>
          </div>

          {/* Planet preview */}
          <motion.img
            key={currentPlanet.image}
            src={currentPlanet.image}
            alt={currentPlanet.name}
            className="w-40 h-40 mb-4 rounded-full border-4 border-cyan-500 shadow-[0_0_30px_rgba(0,255,255,0.5)]"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
          />

          <motion.p
            className="text-lg text-yellow-300 text-center mb-6 max-w-sm"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {currentPlanet.hint}
          </motion.p>

          {/* Guess word */}
          <div className="flex gap-3 mb-6 text-3xl font-mono">
            {currentPlanet.name.split("").map((ch, i) => (
              <span
                key={i}
                className={`px-3 py-2 rounded-md border-2 ${
                  guessed.includes(ch) ? "border-green-400 text-green-400" : "border-cyan-700 text-cyan-600"
                } shadow-[0_0_10px_rgba(0,255,255,0.4)]`}
              >
                {guessed.includes(ch) ? ch : "_"}
              </span>
            ))}
          </div>

          {/* Letter buttons */}
          <div className="grid grid-cols-7 gap-3 max-w-md mb-6">
            {letters.map((letter, i) => (
              <motion.button
                key={i}
                onClick={() => handleLetterClick(letter)}
                disabled={guessed.includes(letter)}
                whileTap={{ scale: 0.8 }}
                className={`px-4 py-2 text-xl font-bold rounded-md shadow-md border border-cyan-500 
                  ${
                    guessed.includes(letter)
                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                      : "bg-cyan-900 hover:bg-cyan-600 text-white transition-all"
                  }`}
              >
                {letter}
              </motion.button>
            ))}
          </div>

          {/* Progress bar */}
          <div className="w-64 h-3 bg-gray-700 rounded-full overflow-hidden mb-3">
            <motion.div
              className="h-full bg-cyan-400"
              initial={{ width: 0 }}
              animate={{ width: `${((current + 1) / planetData.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          <p className="text-sm text-gray-300">Level {current + 1} / {planetData.length}</p>
        </motion.div>
      ) : (
        <div className="z-10 text-center">
          {win ? (
            <>
              <motion.h2
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-4xl font-bold text-green-400"
              >
                🏆 Galaxy Explorer Complete!
              </motion.h2>
              <p className="text-lg mt-3 text-cyan-300">You’ve guessed all planets!</p>
            </>
          ) : (
            <>
              <motion.h2
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-4xl font-bold text-red-400"
              >
                💥 Mission Failed
              </motion.h2>
              <p className="text-lg mt-3 text-cyan-200">Try again, astronaut!</p>
            </>
          )}

          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={resetGame}
              className="px-6 py-3 bg-cyan-600 rounded-lg hover:bg-cyan-700 shadow-[0_0_20px_rgba(0,255,255,0.6)] transition-all"
            >
              Restart
            </button>

            <button
              onClick={() => navigate("/")} // change if your pet route is different
              className="px-6 py-3 border border-cyan-400 rounded-lg hover:bg-cyan-800/30 transition-all"
            >
              🐾 Back to Pet
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Game2;
