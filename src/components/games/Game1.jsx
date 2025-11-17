import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const Game1 = ({ onGameFinished }) => { // receive callback from MainContent
  const navigate = useNavigate();
  const symbols = useMemo(() => ["🐶", "🐱", "🐸", "🐹"], []);
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);

  // Initialize cards
  useEffect(() => {
    const pool = [...symbols, ...symbols]
      .sort(() => Math.random() - 0.5)
      .map((s, i) => ({ id: i, symbol: s }));
    setCards(pool);
  }, [symbols]);

  const handleFlip = (id) => {
    if (flipped.includes(id) || matched.includes(id) || flipped.length === 2) return;
    const next = [...flipped, id];
    setFlipped(next);

    if (next.length === 2) {
      const [a, b] = next;
      if (cards[a].symbol === cards[b].symbol) {
        setMatched((m) => [...m, a, b]);
        setFlipped([]);
      } else {
        setTimeout(() => setFlipped([]), 700);
      }
    }
  };

  // Call onGameFinished when all matched
  useEffect(() => {
    if (matched.length === cards.length && cards.length > 0) {
      if (typeof onGameFinished === "function") {
        onGameFinished("Game 1"); // notify MainContent
      }
      setTimeout(() => navigate("/"), 500); // go back to pet after a short delay
    }
  }, [matched, cards, navigate, onGameFinished]);

  return (
    <div className="flex flex-col items-center gap-4 p-6 h-screen justify-center bg-gray-900 text-white">
      <h2 className="text-2xl font-bold text-yellow-500">Memory Match 🧩</h2>
      <div className="grid grid-cols-4 gap-3">
        {cards.map((card) => {
          const isFlipped = flipped.includes(card.id) || matched.includes(card.id);
          return (
            <button
              key={card.id}
              onClick={() => handleFlip(card.id)}
              className={`w-16 h-16 text-2xl rounded-xl shadow-md flex items-center justify-center transition-all duration-200 ${
                isFlipped ? "bg-yellow-200 scale-100" : "bg-white hover:bg-yellow-50 scale-95"
              }`}
            >
              {isFlipped ? card.symbol : "❔"}
            </button>
          );
        })}
      </div>
      <p className="text-sm text-gray-500">
        Matches: {matched.length / 2}/{symbols.length}
      </p>
      <button
        onClick={() => navigate("/")}
        className="mt-6 px-4 py-2 bg-cyan-500 rounded-md hover:bg-cyan-600"
      >
        Back to Pet
      </button>
    </div>
  );
};

export default Game1;
