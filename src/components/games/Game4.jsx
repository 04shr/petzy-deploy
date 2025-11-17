import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Game4 = ({ onGameFinished }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ m1: "", m2: "", m3: "", m4: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (typeof onGameFinished === "function") onGameFinished("Game 4");
  };

  return (
    <div className="flex flex-col items-center gap-6 p-6 h-screen justify-center bg-gray-900 text-white">
      <h2 className="text-2xl font-bold text-yellow-500">Birthday Story 📝</h2>
      {!submitted ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-72">
          <input name="m1" value={formData.m1} onChange={handleChange} placeholder="Favorite Marvel superhero" className="px-3 py-2 rounded-md text-gray-900" required/>
          <input name="m2" value={formData.m2} onChange={handleChange} placeholder="Who will be best web designer" className="px-3 py-2 rounded-md text-gray-900" required/>
          <input name="m3" value={formData.m3} onChange={handleChange} placeholder="Brave Marvel hero" className="px-3 py-2 rounded-md text-gray-900" required/>
          <input name="m4" value={formData.m4} onChange={handleChange} placeholder="Loves someone 3000" className="px-3 py-2 rounded-md text-gray-900" required/>
          <button type="submit" className="mt-4 px-4 py-2 bg-yellow-500 rounded-md hover:bg-yellow-600">Create Story</button>
        </form>
      ) : (
        <div className="bg-gray-800 p-4 rounded-md w-80 text-center">
          <h3 className="text-lg font-bold text-yellow-400">🎉 Birthday Tribute 🎉</h3>
          <p>Just like <strong>{formData.m1}</strong> brings hope, you bring joy! 🌟</p>
          <p>Your friendship is as reliable as <strong>{formData.m2}</strong> – always there! 🕷️</p>
          <p>You have the heart of <strong>{formData.m3}</strong> – brave and loyal! 🛡️</p>
          <p>Like <strong>{formData.m4}</strong> loves someone 3000, I appreciate you infinity times over! 💖</p>
          <button onClick={() => navigate("/")} className="mt-4 px-4 py-2 bg-cyan-500 rounded-md hover:bg-cyan-600">Back to Pet</button>
        </div>
      )}
    </div>
  );
};

export default Game4;
