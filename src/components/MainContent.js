import React, { useState, useRef, useEffect } from "react";
import PetModel from "./PetModel";
import parkImg from "../assets/images/park.png";
import clubImg from "../assets/images/club.png";
import schoolImg from "../assets/images/school.png";
import stadiumImg from "../assets/images/stadium.png";
import usePreferences from "../hooks/usePreferences";
import { useNavigate } from "react-router-dom";

/* =========================
   KEYWORD: COMPONENT HOOKS
   Functionality: preferences hook + navigation + refs + local UI state
   Change point: swap hook / add/remove state / change refs
   ========================= */
const MainContent = ({}) => {
  const [preferences = {}, updatePreferences, { loading }] = usePreferences();
  const navigate = useNavigate();

  // UI state
  const [meshes, setMeshes] = useState([]);
  const [currentScene, setCurrentScene] = useState({ name: "Default", img: null });
  const [notification, setNotification] = useState("");
  const [activePanel, setActivePanel] = useState(null);

  // model refs
  const petRef = useRef();
  const petContainerRef = useRef();

  /* =========================
     KEYWORD: ACTIONS / OPTIONS
     Functionality: UI actions, foods, games, scenes
     Change point: add/remove actions or options
     ========================= */
  const actions = [
    { action: "feed", icon: "🍖", name: "Feed" },
    { action: "play", icon: "🎾", name: "Play" },
    { action: "teleport", icon: "🛸", name: "Teleport" },
    { action: "customise", icon: "🛁", name: "Customise" },
  ];

  // id -> file path map (use consistent ids that match preferences.selectedPet)
  const petModelMap = {
    dog: "/models/mouth.glb",
    fox: "/models/fox.glb",
    panda: "/models/panda.glb",
    tiger: "/models/tiger.glb",
  };

  const foodOptions = [
    { name: "Meat", icon: "🍖" },
    { name: "Apple", icon: "🍎" },
    { name: "Carrot", icon: "🥕" },
    { name: "Cookie", icon: "🍪" },
  ];

  const gameOptions = [
    { name: "Game 1", icon: "🎯", link: "/game1" },
    { name: "Game 2", icon: "🏃", link: "/game2" },
    { name: "Game 3", icon: "🧩", link: "/game3" },
    { name: "Game 4", icon: "🎵", link: "/game4" },
  ];

  const sceneOptions = [
    { name: "Sankey Tank", icon: "🌳", img: parkImg },
    { name: "Party", icon: "🎉", img: clubImg },
    { name: "CTR", icon: "🏨", img: schoolImg },
    { name: "Chinnaswamy Stadium", icon: "🏏", img: stadiumImg },
  ];

  const ACTION_MAP = {
  feed: { delta: { feed: 1 }, metaKey: "lastFed" },
  play: { delta: { play: 1 }, metaKey: "lastPlayedGame" },
  groom: { delta: { groom: 1 }, metaKey: "lastGroomed" },
  rest: { delta: { rest: 1 }, metaKey: "lastRested" },
  interact: { delta: { interact: 1 }, metaKey: "lastInteraction" },
  teleport: { delta: {}, metaKey: "lastScene" },
};


  /* =========================
     KEYWORD: NOTIFICATIONS
     Functionality: transient UI messages
     Change point: change duration or styling
     ========================= */
  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(""), 3000);
  };

  /* =========================
     KEYWORD: UI ACTION HANDLER
     Functionality: open panels + show contextual messages
     Change point: modify panel logic or message map
     ========================= */
  const handleAction = (action) => {
    const normalized = action.toLowerCase();
    const panelOpeners = ["feed", "play", "customise", "teleport"];
    if (panelOpeners.includes(normalized)) setActivePanel(normalized);

    const actionMessages = {
      feed: "Choose a food to feed your pet! 🍖",
      play: "Choose a game to play with your pet! 🎾",
      groom: "Your pet looks amazing! ✨",
      teleport: "Scene changed! ✨",
    };
    showNotification(actionMessages[normalized] || "Action started!");
  };

  /* =========================
     KEYWORD: SYNC PREFERENCES -> LOCAL
     Functionality: populate local meshes & scene from persisted preferences
     Change point: alter which pref keys are synced
     ========================= */
  useEffect(() => {
    if (!preferences) return;

    if (Array.isArray(preferences.meshes) && preferences.meshes.length > 0) {
      setMeshes(preferences.meshes);
    }

    if (preferences.currentScene && typeof preferences.currentScene === "object") {
      setCurrentScene(preferences.currentScene);
    }
  }, [preferences]);

  /* =========================
     KEYWORD: MESHES LOAD (CUSTOMISE)
     Functionality: fetch meshes from PetModel when customise panel opens
     Change point: change mesh API usage or normalization
     ========================= */
  useEffect(() => {
    if (activePanel !== "customise") return;
    if (meshes.length > 0) return;

    const fetchMeshes = async () => {
      try {
        if (petRef.current) {
          if (typeof petRef.current.getMeshes === "function") {
            const remote = await petRef.current.getMeshes();
            if (Array.isArray(remote) && remote.length) {
              const normalized = remote.map((m) =>
                typeof m === "string"
                  ? { name: m, color: petRef.current.getMeshColor ? petRef.current.getMeshColor(m) || "#ffffff" : "#ffffff" }
                  : { name: m.name || "mesh", color: m.color || "#ffffff" }
              );
              setMeshes(normalized);
              updatePreferences({ meshes: normalized });
              return;
            }
          }
          if (typeof petRef.current.getMeshNames === "function") {
            const names = await petRef.current.getMeshNames();
            const normalized = names.map((n) => ({
              name: n,
              color: petRef.current.getMeshColor ? petRef.current.getMeshColor(n) || "#ffffff" : "#ffffff",
            }));
            setMeshes(normalized);
            updatePreferences({ meshes: normalized });
            return;
          }
        }
      } catch (err) {
        console.warn("fetchMeshes failed", err);
      }

      // fallback demo meshes
      const fallback = [
        { name: "Body", color: "#ffcc66" },
        { name: "Eyes", color: "#222222" },
        { name: "Ears", color: "#ff9999" },
        { name: "Collar", color: "#00ccff" },
      ];
      setMeshes(fallback);
      updatePreferences({ meshes: fallback });
    };

    fetchMeshes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePanel]);

  /* =========================
     KEYWORD: DRAG & DROP (FEED)
     Functionality: accept dropped food and increment feed count
     Change point: modify drop behavior, animation, or persistence call
     ========================= */
  const handleDrop = (e) => {
    e.preventDefault();
    const food = e.dataTransfer.getData("food");
    if (!food) return;

    showNotification(`Your pet enjoyed the ${food}! 😋`);
    setActivePanel(null);

    incrementDailyAction({ feed: 1 }, {
      lastFed: food,
      lastFedAt: new Date().toISOString(),
    }).catch((err) => console.warn("incrementDailyAction error:", err));
  };

  /* =========================
     KEYWORD: DRAG OVER (MOUTH HIGHLIGHT)
     Functionality: detect cursor above pet mouth & open mouth via model API
     Change point: adjust mouth area or timings
     ========================= */
  const handleDragOver = (e) => {
    e.preventDefault();
    if (!petContainerRef.current || !petRef.current) return;

    const rect = petContainerRef.current.getBoundingClientRect();
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    const mouthArea = {
      left: rect.left + rect.width * 0.35,
      right: rect.left + rect.width * 0.65,
      top: rect.top + rect.height * 0.55,
      bottom: rect.top + rect.height * 0.75,
    };

    if (
      mouseX >= mouthArea.left &&
      mouseX <= mouthArea.right &&
      mouseY >= mouthArea.top &&
      mouseY <= mouthArea.bottom
    ) {
      if (petRef.current && typeof petRef.current.setMouthOpen === "function") {
        petRef.current.setMouthOpen(true);
        clearTimeout(petRef.current._mouthTimeout);
        petRef.current._mouthTimeout = setTimeout(() => {
          petRef.current.setMouthOpen(false);
        }, 1000);
      }
    }
  };

  /* =========================
     KEYWORD: GAME FINISH HANDLER
     Functionality: called when a game finishes — increments play and shows notif
     Change point: change persistence or notification
     ========================= */
  const onGameFinished = (gameName) => {
    incrementDailyAction({ play: 1 }, {
      lastPlayedGame: gameName,
      lastPlayedAt: new Date().toISOString(),
    }).then(() => {
      showNotification(`You played ${gameName}! 🎾`);
    }).catch((err) => {
      console.warn("incrementDailyAction error:", err);
      showNotification(`Played ${gameName} (local) — failed to persist.`);
    });
  };

  /* =========================
     KEYWORD: COLOR CHANGE API
     Functionality: update local meshes, persist prefs, and call model API
     Change point: change persistence granularity or model API call
     ========================= */
  const handleColorChange = (meshName, color) => {
    setMeshes((prev) => {
      const updated = prev.map((m) => (m.name === meshName ? { ...m, color } : m));
      updatePreferences({ meshes: updated });
      return updated;
    });

    try {
      if (petRef.current && typeof petRef.current.setMeshColor === "function") {
        petRef.current.setMeshColor(meshName, color);
      }
      showNotification(`${meshName} color updated`);
    } catch (err) {
      showNotification(`Could not update ${meshName} color on model.`);
    }
  };

  /* =========================
     KEYWORD: RESET MESH DEFAULT
     Functionality: reset mesh color on model + prefs
     Change point: change to default color source or reset behavior
     ========================= */
  const resetMeshToDefault = (meshName) => {
    try {
      if (petRef.current && typeof petRef.current.resetMeshColor === "function") {
        const maybeColor = petRef.current.resetMeshColor(meshName);
        const newColor = typeof maybeColor === "string" ? maybeColor : petRef.current.getMeshColor ? petRef.current.getMeshColor(meshName) : "#ffffff";
        setMeshes((prev) => {
          const updated = prev.map((m) => (m.name === meshName ? { ...m, color: newColor } : m));
          updatePreferences({ meshes: updated });
          return updated;
        });
        showNotification(`${meshName} reset`);
        return;
      }
    } catch (err) {
      // fallback to white
    }

    handleColorChange(meshName, "#ffffff");
  };

  /* =========================
     KEYWORD: APPLY SCENE (TELEPORT)
     Functionality: update scene state + persist + call model API
     Change point: change what is persisted or how the model receives scenes
     ========================= */
  const applyScene = (scene) => {
    setCurrentScene(scene);
    updatePreferences({ currentScene: scene });

    try {
      if (petRef.current && typeof petRef.current.setScene === "function") {
        petRef.current.setScene(scene.img);
      }
    } catch (err) { /* ignore */ }

    showNotification(`Teleported to ${scene.name}! 🌟`);
    setActivePanel(null);
  };

  /* =========================
     KEYWORD: STATS (LOCAL COMPUTE)
     Functionality: same rules as original — compute display stats from daily log
     Change point: tweak formulas here
     ========================= */
  const computeStats = (log) => {
    const stats = {};
    stats.hunger = Math.min(100, (log.feed || 0) * 20);
    stats.happiness = Math.min(100, (log.play || 0) * 25);
    stats.energy = Math.max(0, Math.min(100, 100 - (log.play || 0) * 15 + (log.feed || 0) * 10 + (log.rest || 0) * 20));
    stats.love = Math.min(100, (log.groom || 0) * 15);
    stats.xp = Math.min(100, ((log.feed || 0) + (log.play || 0) + (log.groom || 0) + (log.rest || 0)) * 10);
    stats.streak = (log.feed || 0) >= 3 && (log.play || 0) >= 4 ? 1 : 0;
    return stats;
  };

  /* =========================
     KEYWORD: PERSISTENCE - incrementDailyAction
     Functionality: merges delta + meta into prefs.dailyHistory, dailyLog, stats
     Change point: change merge strategy or payload contents
     ========================= */
  const incrementDailyAction = async (delta = {}, meta = {}) => {
    try {
      const history = (preferences && preferences.dailyHistory) || {};
      const todayKey = new Date().toISOString().slice(0, 10);
      const historyToday = { ...(history[todayKey] || {}) };
      const inProgress = preferences.dailyLog || {};
      const todayCounts = { ...historyToday, ...inProgress };

      Object.keys(delta).forEach((k) => {
        todayCounts[k] = (todayCounts[k] || 0) + (delta[k] || 0);
      });

      const updatedHistory = { ...history, [todayKey]: { ...todayCounts } };

      // Derived stat computation (same as other files)
      const TARGETS = { feed: 3, play: 3 };
      const hunger = Math.min(100, Math.round((todayCounts.feed || 0) / TARGETS.feed * 100));
      const happiness = Math.min(100, Math.round((todayCounts.play || 0) / TARGETS.play * 100));
      const energy = Math.min(100, 50 + (todayCounts.interact || 0) * 10 + (todayCounts.rest || 0) * 5);
      const love = Math.min(100, (todayCounts.groom || 0) * 15);

      const prevXp = (preferences && preferences.stats && typeof preferences.stats.xp === "number") ? preferences.stats.xp : 0;
      const actionsPerformed = Object.values(delta).reduce((a, b) => a + (b || 0), 0);
      const xpGain = Math.max(0, actionsPerformed * 10);
      const newXp = Math.min(100, prevXp + xpGain);

      const newStats = {
        ...(preferences.stats || {}),
        hunger,
        happiness,
        energy,
        love,
        xp: newXp,
      };

      const payload = {
        dailyHistory: updatedHistory,
        dailyLog: todayCounts,
        stats: newStats,
        ...meta,
      };

      await updatePreferences(payload);
      return { ok: true };
    } catch (err) {
      console.error("incrementDailyAction error:", err);
      return { ok: false, reason: err.message || "increment_failed" };
    }
  };

  /* =========================
     KEYWORD: RENDER - BACKGROUND + HEADER + PANELS + MODEL + ACTIONS
     Functionality: main UI structure; change points: panel positions, model props, action grid
     ========================= */
  const dailyLog = preferences.dailyLog || { feed: 0, play: 0, groom: 0, rest: 0 };
  const stats = computeStats(dailyLog);
    // resolve a safe string path to pass to PetModel
  const resolvedModelPath =
    (typeof preferences?.currentModel === "string" && preferences.currentModel) ||
    (preferences?.currentModel && (preferences.currentModel.file || preferences.currentModel.url)) ||
    (preferences?.selectedPet && petModelMap[preferences.selectedPet]) ||
    "/models/mouth.glb";


  return (
    <main className="flex flex-col h-screen p-4 relative overflow-hidden">
      {/* KEYWORD: SCENE BACKGROUND */}
      <div
        aria-hidden
        className="absolute inset-0 z-0 pointer-events-none bg-center bg-cover bg-no-repeat"
        style={{
          backgroundImage: currentScene.img ? `url(${currentScene.img})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "none",
          opacity: currentScene.img ? 1 : 0,
          transition: "opacity 250ms ease-in-out",
        }}
      />
      <div className="absolute inset-0 bg-black opacity-40 z-10 pointer-events-none"></div>

      {/* KEYWORD: HEADER */}
      <header className="flex justify-center items-center mb-4 p-4 bg-white bg-opacity-10 backdrop-blur-3xl rounded-3xl border border-white border-opacity-20 z-10">
        <div className="text-2xl font-bold text-white text-shadow-md text-center">
          🎮 Welcome to the Fun Zone 🐾
        </div>
      </header>

      {/* KEYWORD: CENTER STAGE - PetModel + Drag handlers */}
      <section
        className="flex-1 flex flex-col items-center justify-center relative z-10"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* KEYWORD: FEED / PLAY PANEL (left) */}
        {(activePanel === "feed" || activePanel === "play") && (
          <div className="absolute top-1/4 left-20 -translate-x-1/3 -translate-y-8 scale-90 origin-top-right bg-black/80 backdrop-blur-xl border border-white/20 p-3 z-40 rounded-2xl shadow-lg flex flex-col w-48">
            <button onClick={() => setActivePanel(null)} className="mb-2 text-white bg-red-500 px-2 py-1 rounded-md text-xs hover:bg-red-600">✖ Close</button>
            <h2 className="text-white text-sm font-bold mb-3 text-center">{activePanel === "feed" ? "Choose Food" : "Choose Game"}</h2>
            <div className="flex flex-col gap-2">
              {activePanel === "feed" && foodOptions.map((food, i) => (
                <div key={i} className="flex flex-col items-center justify-center text-white text-sm text-center p-2 rounded-lg bg-white/10 hover:bg-cyan-500/30 transition-all duration-200">
                  {/* KEYWORD: DRAGGABLE ICON */}
                  <span
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("food", food.name);

                      // small drag image for the emoji only
                      const dragIcon = document.createElement("span");
                      dragIcon.innerText = food.icon;
                      dragIcon.style.fontSize = "2.5rem";
                      dragIcon.style.position = "absolute";
                      dragIcon.style.top = "-9999px";
                      document.body.appendChild(dragIcon);

                      e.dataTransfer.setDragImage(dragIcon, 20, 20);
                      setTimeout(() => document.body.removeChild(dragIcon), 0);
                    }}
                    className="text-2xl cursor-grab select-none"
                  >
                    {food.icon}
                  </span>
                  <span className="mt-1 select-none">{food.name}</span>
                </div>
              ))}

              {activePanel === "play" && (
                <div className="flex flex-col gap-2">
                  {gameOptions.map((game, i) => (
                    <button
                      key={i}
                      onClick={async () => {
                        try {
                          await incrementDailyAction({ play: 1 }, {
                            lastPlayedGame: game.name,
                            lastPlayedAt: new Date().toISOString()
                          });
                        } catch (err) {
                          console.warn("Failed to persist play count:", err);
                        }
                        navigate(game.link);
                      }}
                      className="flex flex-col items-center justify-center text-white text-sm text-center p-2 rounded-lg bg-white/10 hover:bg-cyan-500/30 transition-all duration-200"
                    >
                      <span className="block text-2xl">{game.icon}</span>
                      {game.name}
                    </button>
                  ))}
                </div>
              )}

              {activePanel === "play" && gameOptions.length === 0 && (
                <div className="text-white/70 text-xs text-center">No games available.</div>
              )}
            </div>
          </div>
        )}

        {/* KEYWORD: CUSTOMISE PANEL (right) */}
        {activePanel === "customise" && (
          <div className="absolute top-1/4 right-14 translate-x-1/3 -translate-y-8 scale-90 origin-top-left bg-black/80 backdrop-blur-xl border border-white/20 p-4 z-40 rounded-2xl shadow-lg flex flex-col w-64 max-h-[60vh] overflow-x-hidden overflow-y-auto pr-3 custom-scrollbar">
            <button onClick={() => setActivePanel(null)} className="mb-3 self-end text-white bg-red-500 px-2 py-1 rounded-md text-xs hover:bg-red-600">✖ Close</button>
            <h2 className="text-white text-sm font-bold mb-3 text-center">Customize Meshes</h2>
            <div className="flex flex-col gap-3">
              {(!meshes || meshes.length === 0) ? (
                <div className="text-white/70 text-xs text-center">Loading meshes...</div>
              ) : (
                meshes.map((mesh, i) => (
                  <div key={mesh.name + i} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-white/5">
                    <div className="flex-1">
                      <div className="text-white text-sm font-medium">{mesh.name}</div>
                      <div className="text-white/70 text-xs mt-0.5">{mesh.color}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div title={mesh.color} className="w-8 h-8 rounded-full border border-white/20" style={{ backgroundColor: mesh.color }} />
                      <input type="color" value={mesh.color} onChange={(e) => handleColorChange(mesh.name, e.target.value)} className="w-10 h-8 p-0" aria-label={`Change color of ${mesh.name}`} />
                      <button onClick={() => resetMeshToDefault(mesh.name)} className="ml-2 text-white bg-white/5 px-2 py-1 rounded text-xs hover:bg-white/10">Reset</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* KEYWORD: TELEPORT PANEL */}
        {activePanel === "teleport" && (
          <div className="absolute top-1/4 right-8 translate-x-2 -translate-y-8 scale-90 origin-top-left bg-black/80 backdrop-blur-xl border border-white/20 p-4 z-40 rounded-2xl shadow-lg flex flex-col w-72 max-h-[60vh] overflow-x-hidden overflow-y-auto pr-3 custom-scrollbar">
            <button onClick={() => setActivePanel(null)} className="mb-3 self-end text-white bg-red-500 px-2 py-1 rounded-md text-xs hover:bg-red-600">✖ Close</button>
            <h2 className="text-white text-sm font-bold mb-3 text-center">Teleport — Choose a Scene</h2>
            <div className="grid grid-cols-2 gap-3">
              {sceneOptions.map((scene, i) => (
                <button key={i} onClick={() => applyScene(scene)} className="flex flex-col items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-150" title={`Teleport to ${scene.name}`}>
                  <div className="w-full h-24 rounded-md overflow-hidden bg-white/10 flex items-center justify-center">
                    {scene.img ? (
                      <img src={scene.img} alt={scene.name} className="object-cover w-full h-full" />
                    ) : (
                      <div className="text-white/60 text-sm">No image</div>
                    )}
                  </div>
                  <div className="text-white text-xs font-medium">{scene.icon} {scene.name}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* KEYWORD: PET MODEL CONTAINER */}
      {!loading && (
  <div
    ref={petContainerRef}
    className="w-full max-w-xs flex-1 flex items-center justify-center relative z-10 -mt-3"
  >
<PetModel
  ref={petRef}
  key={preferences?.selectedPet || resolvedModelPath || "default"}
  modelPath={resolvedModelPath}
  className="w-full h-full object-contain"
/>

  </div>
)}
      </section>

      {/* KEYWORD: ACTION GRID */}
      <section className="grid grid-cols-4 gap-4 -mt-10 z-10">
        {actions.map((actionData, index) => (
          <button
            key={index}
            onClick={() => handleAction(actionData.action)}
            className="p-4 bg-white bg-opacity-10 backdrop-blur-3xl border border-white border-opacity-20 rounded-2xl text-white font-semibold cursor-pointer transition-all duration-300 relative overflow-hidden text-center text-sm hover:-translate-y-1 hover:shadow-lg hover:shadow-cyan-400/30 hover:border-cyan-400"
          >
            <span className="text-2xl block mb-1">{actionData.icon}</span>
            <span>{actionData.name}</span>
          </button>
        ))}
      </section>

      {/* KEYWORD: REFRESH MODEL BUTTON */}
<div className="absolute top-5 right-5 z-50">
  <button
    onClick={() => {
      if (petRef.current) {
        // Optional: animate the model refresh
        petRef.current.rotation = { x: 0, y: 0, z: 0 };
      }
      showNotification("🔄 Pet model refreshed!");
      // Force re-render the PetModel by changing key
      setCurrentScene((prev) => ({ ...prev }));
    }}
    className="group relative flex items-center justify-center w-12 h-12 bg-gradient-to-tr from-cyan-400 to-purple-500 text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all duration-300"
    title="Refresh your pet model"
  >
    <span className="absolute inset-0 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></span>
    <span className="text-2xl group-hover:animate-spin">🔄</span>
  </button>
</div>


      {/* KEYWORD: TOAST / NOTIFICATION */}
      {notification && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-cyan-400/90 via-blue-500/90 to-purple-500/90 text-white px-8 py-4 rounded-2xl font-bold z-50 backdrop-blur-3xl border border-white border-opacity-30 animate-pulse">
          {notification}
        </div>
      )}
    </main>
  );
};

export default MainContent;
