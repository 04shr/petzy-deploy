import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { motion } from "framer-motion";
import PetModel from "./PetModel";
import { useNavigate, useLocation } from "react-router-dom";
import usePreferences from "../hooks/usePreferences"; // adjust path if needed

export default function PetModelSelectPage({
  availableModels = null,
  initialIndex = 0,
  onConfirm = null,
  onBack = null,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  // -----------------------------
  // 🧩 Models and Preferences
  // -----------------------------
  const modelsFromState = location?.state?.availableModels || null;
  const models =
    availableModels?.length > 0
      ? availableModels
      : modelsFromState || [];

  const [index, setIndex] = useState(initialIndex);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  const [preferences, updatePreferences, { loading: prefsLoading, user }] =
    usePreferences();

  // Ensure valid index
  useEffect(() => {
    if (models.length > 0 && index >= models.length) setIndex(0);
  }, [models, index]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "Enter") toggleSelect();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [index, models]);

  // -----------------------------
  // 🔄 Navigation Helpers
  // -----------------------------
  const prev = useCallback(() => {
    setIndex((i) =>
      models.length ? (i === 0 ? models.length - 1 : i - 1) : 0
    );
  }, [models.length]);

  const next = useCallback(() => {
    setIndex((i) =>
      models.length ? (i === models.length - 1 ? 0 : i + 1) : 0
    );
  }, [models.length]);

  const toggleSelect = useCallback(() => {
    setSelected((cur) => {
      if (!models.length) return null;
      const newSel = cur && cur.id === models[index].id ? null : models[index];
      return newSel;
    });
  }, [models, index]);

  // -----------------------------
  // ✅ Confirm Selection & Return
  // -----------------------------
const confirm = async () => {
  const toSave = selected || models[index];
  if (!toSave) return;

  try {
    setSaving(true);
    // save in session before navigating back
    sessionStorage.setItem("petzy_selected_model", JSON.stringify(toSave));

    const result = await updatePreferences({
      currentModel: toSave,
      selectedPet: toSave.id,
    });

    if (!result.ok) console.error("Failed to save preferences:", result.reason);

    // ✅ Return to PetzyLanding, not full restart
    const returnPath = location?.state?.returnPath || "/";
    navigate(returnPath, {
      state: {
        openSelectModel: true, // tells PetzyLanding to open popup
        selectedModel: toSave,
        directToChoosePetzy: true, // 👈 new flag
      },
    });
  } catch (err) {
    console.error("Error saving selected model:", err);
  } finally {
    setSaving(false);
  }
};

  // -----------------------------
  // 🔙 Back Button Handler
  // -----------------------------
  const handleBack = () => {
    if (onBack) return onBack();
    const returnPath = location?.state?.returnPath || "/";
    navigate(returnPath);
  };

  // Disable scroll
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow || "";
    };
  }, []);

  // -----------------------------
  // 🚫 No Models Available
  // -----------------------------
  if (!models || models.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6">
        <div className="text-center max-w-lg">
          <h2 className="text-2xl font-bold mb-4">No models available</h2>
          <p className="text-gray-300">
            Make sure you pass an{" "}
            <code>availableModels</code> array to this component or add models
            to your project.
          </p>
          <button
            onClick={handleBack}
            className="mt-6 px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // -----------------------------
  // 🧍 Active Model
  // -----------------------------
  const model = models[index];

  // -----------------------------
  // 🎨 UI Layout
  // -----------------------------
  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900 text-white p-6 overflow-hidden flex flex-col items-center">
      {/* Top bar */}
      <div className="w-full max-w-6xl flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 rounded-lg hover:bg-slate-800/60"
          >
            <ChevronLeft />
          </button>
          <div>
            <h3 className="text-lg font-semibold">Choose your Petzy</h3>
            <p className="text-sm text-gray-300">
              Preview models and pick the one you love.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-300">
            Selected:{" "}
            <span className="font-semibold text-white">
              {selected ? selected.name : "—"}
            </span>
          </div>
          <button
            onClick={confirm}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 rounded-full font-semibold shadow-md disabled:opacity-60"
          >
            <Check />{" "}
            <span>
              {saving
                ? "Saving..."
                : selected
                ? "Confirm & Save"
                : "Select & Confirm"}
            </span>
          </button>
        </div>
      </div>

      {/* Main layout: Buttons | Model | Thumbnails */}
      <div className="w-full max-w-6xl flex-grow flex justify-center items-center gap-6 h-[calc(100vh-160px)] overflow-hidden">
{/* Left: Buttons */}
<div className="flex flex-col gap-4 w-48 items-start">
  <button
    onClick={confirm}
    disabled={saving}
    className="w-full px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 font-semibold text-white text-sm disabled:opacity-60"
  >
    {saving
      ? "Saving..."
      : `Confirm ${selected?.name || model.name}`}
  </button>
</div>


        {/* Center: Model Preview */}
        <div
          className="relative bg-gradient-to-br from-slate-800/60 to-slate-900/80 rounded-2xl p-4 border border-purple-500/10 shadow-lg flex items-center justify-center"
          style={{ width: 360, height: 520 }}
        >
          <button
            onClick={prev}
            aria-label="previous"
            className="absolute left-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/30 hover:bg-black/45"
          >
            <ChevronLeft />
          </button>

          <motion.div
            key={model.file}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.45 }}
            className="flex items-center justify-center"
            style={{ width: "320px", height: "480px" }}
          >
            <div className="w-full h-full">
              <PetModel
                modelPath={model.file}
                className="w-full h-full object-contain"
              />
            </div>
          </motion.div>

          <button
            onClick={next}
            aria-label="next"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/30 hover:bg-black/45"
          >
            <ChevronRight />
          </button>
        </div>

        {/* Right: Thumbnails */}
        <div className="flex flex-col gap-3 w-24 items-center">
          {models.map((m, i) => (
            <button
              key={m.id}
              onClick={() => setIndex(i)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg w-full ${
                i === index
                  ? "ring-2 ring-purple-400/40 bg-slate-800/50"
                  : "hover:bg-slate-800/30"
              }`}
            >
              <div className="text-2xl">{m.emoji}</div>
              <div className="text-xs text-gray-300">{m.name}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
