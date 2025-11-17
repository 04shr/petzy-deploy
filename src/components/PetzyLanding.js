// src/components/PetzyLanding.js
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Menu,
  X,
  Heart,
  Brain,
  Gamepad2,
  Mic,
  ChevronRight,
  Sparkles,
  Bot,
  Volume2,
  ArrowRight,
  Lock,
  User,
  Shield,
  Zap,
  Globe,
} from "lucide-react";
import { ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import usePreferences, { checkIfUserExists, createUser, verifyUser } from "../hooks/usePreferences";
import PetModel from "./PetModel";
import { useNavigate, useLocation } from "react-router-dom";

/* =========================
   PetzyLanding Component
   ========================= */
const PetzyLanding = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showStory, setShowStory] = useState(false);
  const [storyStep, setStoryStep] = useState(0);
  const [userInfo, setUserInfo] = useState({ username: "", petName: "", secretKey: "" });
  const [isTyping, setIsTyping] = useState(false);
  const [isReturningUser, setIsReturningUser] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);

  const inputRef = useRef(null);
  const checkDebounceRef = useRef(null);

const availableModels = [
  { id: "dog", name: "Dog", emoji: "🐕", file: "/models/mouth.glb", color: "from-amber-500 to-orange-600" },
  { id: "fox", name: "Fox", emoji: "🦊", file: "/models/fox.glb", color: "from-pink-500 to-purple-600" },
  { id: "panda", name: "Panda", emoji: "🐼", file: "/models/panda.glb", color: "from-pink-500 to-purple-600" },
  { id: "tiger", name: "Tiger", emoji: "🐯", file: "/models/tiger.glb", color: "from-pink-500 to-purple-600" },
];


  const [preferences, updatePreferences, { loading: prefsLoading, user }] = usePreferences();

  const storyTexts = useMemo(() => {
    const base = [
      { text: "Hello there... *wags tail excitedly* 🐕", subtext: "I've been waiting for someone special like you!" },
      { text: "I'm a lonely little pup in the digital world...", subtext: "I dream of having a best friend to share adventures with" },
      { text: "Will you be my companion? 🥺", subtext: "I promise to be your most loyal friend, always here when you need me" },
      { text: "What should I call you, friend?", subtext: "Tell me your name so I can remember you forever", input: "username", placeholder: "Your name..." },
    ];

    if (isReturningUser) {
      return [
        ...base,
        {
          text: `Welcome back, ${userInfo.username || ""}! 🐾`,
          subtext: "Enter our secret magical key to continue",
          input: "secretKey",
          placeholder: "Enter your magical key...",
          isPassword: true,
        },
      ];
    }

    return [
      ...base,
      {
        text: `Nice to meet you, ${userInfo.username || ""}! 🐾`,
        subtext: "Now, what would you like to call me? Choose a name that feels right in your heart",
        input: "petName",
        placeholder: "My name will be...",
      },

      {
        selectModel: true,
        text: "Choose your Petzy",
        subtext: ""
      },
      {
        text: `${userInfo.petName || ""}... I love it! 💖`,
        subtext:
          "Now, let's create a special secret between us - a magical key that only you and I will know. This will be our way to find each other whenever you return",
        input: "secretKey",
        placeholder: "Our secret magical key...",
        isPassword: true,
      },
    ];
  }, [isReturningUser, userInfo]);

  useEffect(() => {
    if (showStory && storyTexts[storyStep]?.input && inputRef.current) {
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [showStory, storyStep, storyTexts]);

  const handleInputChange = (field, value) => {
    setUserInfo((prev) => ({ ...prev, [field]: value }));

    if (field === "username") {
      setIsReturningUser(false);
      if (checkDebounceRef.current) clearTimeout(checkDebounceRef.current);

      const trimmed = value.trim();
      if (trimmed.length < 3) return;

      checkDebounceRef.current = setTimeout(async () => {
        try {
          const exists = await checkIfUserExists(trimmed);
          setIsReturningUser(Boolean(exists));
        } catch (err) {
          console.error("username check failed", err);
          setIsReturningUser(false);
        }
      }, 400);
    }
  };

  const canProceed = () => {
    const current = storyTexts[storyStep];
    if (current.selectModel) return !!userInfo.selectedModel;
    return !current.input || (userInfo[current.input]?.trim().length > 0);
  };

  useEffect(() => {
    if (!preferences) return;
    const cm = preferences.currentModel;
    if (cm && cm.id) {
      setUserInfo((prev) => {
        if (prev.selectedModel && prev.selectedModel.id) return prev;
        return { ...prev, selectedModel: cm };
      });
    }
  }, [preferences]);

// 🧠 Always sync from storage on mount
useEffect(() => {
  const stored =
    sessionStorage.getItem("petzy_selected_model") ||
    localStorage.getItem("petzy_selected_model_backup");

  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      setUserInfo((p) => ({ ...p, selectedModel: parsed }));
    } catch (err) {
      console.error("Failed to parse stored model:", err);
    }
  }
}, []);

// 🧠 When returning from /select-pet, reopen popup directly at “Choose your Petzy” step
useEffect(() => {
  if (location?.state?.directToChoosePetzy) {
    setShowStory(true); // open popup
    setStoryStep((steps) => {
      const chooseIndex = storyTexts.findIndex((s) => s.selectModel);
      return chooseIndex >= 0 ? chooseIndex : steps;
    });

    // ✅ Clean up history state so it doesn’t reopen next time
    navigate(location.pathname, { replace: true });
  }
}, [location?.state, storyTexts, navigate]);

// 🧠 Restore any temporarily saved user info (username, petName, etc.) when returning from /select-pet
useEffect(() => {
  const savedUser = sessionStorage.getItem("petzy_temp_user");
  if (savedUser) {
    try {
      const parsed = JSON.parse(savedUser);
      setUserInfo((prev) => ({ ...prev, ...parsed }));
    } catch (err) {
      console.warn("Failed to parse temp user:", err);
    }
  }
}, []);

// 🧠 Restore temp user + selected model only for in-progress signup
useEffect(() => {
  const savedUser = sessionStorage.getItem("petzy_temp_user");
  const savedModel = sessionStorage.getItem("petzy_selected_model");

  // Only restore if the user isn’t authenticated yet
  if (!setIsAuthenticated ) {
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUserInfo((prev) => ({ ...prev, ...parsedUser }));
      } catch (err) {
        console.error("Failed to restore temp user:", err);
      }
    }

    if (savedModel) {
      try {
        const parsedModel = JSON.parse(savedModel);
        setUserInfo((p) => ({ ...p, selectedModel: parsedModel }));
      } catch (err) {
        console.error("Failed to parse stored model:", err);
      }
    }
  } else {
    // ✅ Authenticated user — session data is no longer needed
    sessionStorage.removeItem("petzy_temp_user");
    sessionStorage.removeItem("petzy_selected_model");
  }
}, [setIsAuthenticated ]);

const nextStep = async () => {
  if (storyStep === storyTexts.length - 1) {
    if (isReturningUser) {
      try {
        const res = await verifyUser(userInfo.username, userInfo.secretKey);
        if (res.ok) {
          const unameLc = userInfo.username.trim().toLowerCase();
          localStorage.setItem("petzy_current_username", unameLc);
          setIsAuthenticated?.(true);
          setUserInfo((p) => ({ ...p, secretKey: "" }));

          // ✅ Clear any old temporary session data
          sessionStorage.removeItem("petzy_temp_user");
          sessionStorage.removeItem("petzy_selected_model");
        } else {
          if (res.reason === "not_found") alert("User not found.");
          else if (res.reason === "wrong_password") alert("Incorrect magical key. Please try again.");
          else alert("Login failed. Try again later.");
        }
      } catch (err) {
        console.error("verify error", err);
        alert("Error verifying user. See console.");
      }
    } else {
      try {
        if (!userInfo.username?.trim() || !userInfo.petName?.trim() || !userInfo.secretKey) {
          alert("Please provide username, pet name and a secret key.");
          return;
        }

        // 🧩 Read persisted model (if any)
        let persistedModel = null;
        try {
          const s = sessionStorage.getItem("petzy_selected_model");
          if (s) persistedModel = JSON.parse(s);
        } catch (err) {
          console.warn("Failed to read persisted selected model:", err);
        }

        const finalModel =
          userInfo.selectedModel ||
          persistedModel ||
          availableModels[0] ||
          { id: "dog", name: "Dog", file: "/models/mouth.glb", emoji: "🐕" };

        const createRes = await createUser({
          username: userInfo.username,
          petName: userInfo.petName,
          secretKey: userInfo.secretKey,
          extra: {
            preferences: {
              currentModel: finalModel,
              selectedPet: finalModel.id,
            },
          },
        });

        if (createRes.ok) {
          const unameLc = userInfo.username.trim().toLowerCase();
          localStorage.setItem("petzy_current_username", unameLc);
          setIsAuthenticated?.(true);
          setUserInfo((p) => ({ ...p, secretKey: "" }));

          // ✅ Clear session after successful signup
          sessionStorage.removeItem("petzy_temp_user");
          sessionStorage.removeItem("petzy_selected_model");
        } else {
          alert("Failed to create user: " + (createRes.reason || "unknown error"));
        }
      } catch (err) {
        console.error("createUser error", err);
        alert("Error creating user. See console.");
      }
    }
  } else {
    setIsTyping(true);
    setTimeout(() => {
      setStoryStep((s) => s + 1);
      setIsTyping(false);
    }, 700);
  }
};


  const StoryModal = ({ currentIndex, setCurrentIndex, availableModels }) => {
    const currentStory = storyTexts[storyStep];
    const currentEmoji = userInfo.selectedModel?.emoji || "🐕"; // <-- dynamic emoji

    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-3xl p-8 max-w-2xl w-full border border-purple-500/30 shadow-2xl relative overflow-hidden mt-12">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-r from-purple-600/30 to-pink-600/30 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full blur-2xl"></div>

          <div className="relative z-10">
            <div className="text-center mb-8">
              <div className="text-8xl mb-6 animate-bounce filter drop-shadow-2xl">{currentEmoji}</div>
              <div className={`transition-all duration-700 ${isTyping ? "opacity-50 scale-95" : "opacity-100 scale-100"}`}>
                <h3 className="text-3xl font-bold text-white mb-4 leading-tight">{currentStory.text}</h3>
                <p className="text-gray-300 text-lg leading-relaxed max-w-lg mx-auto">{currentStory.subtext}</p>
              </div>
            </div>

            {currentStory.input ? (
              <div className="mb-8">
                <div className="relative group">
                  <input
                    ref={inputRef}
                    type={currentStory.isPassword ? "password" : "text"}
                    value={userInfo[currentStory.input] || ""}
                    onChange={(e) => handleInputChange(currentStory.input, e.target.value)}
                    placeholder={currentStory.placeholder}
                    className="w-full bg-slate-700/60 backdrop-blur-sm border-2 border-purple-500/40 rounded-2xl px-6 py-4 pr-12 text-white text-lg focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 focus:outline-none transition-all duration-300 placeholder-gray-400 group-hover:border-purple-400/60"
                    autoComplete="off"
                    autoFocus
                  />
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    {currentStory.input === "username" && <User className="w-5 h-5 text-purple-400" />}
                    {currentStory.input === "petName" && <Heart className="w-5 h-5 text-pink-400" />}
                    {currentStory.input === "secretKey" && <Lock className="w-5 h-5 text-blue-400" />}
                  </div>
                </div>
              </div>
            ) : currentStory.selectModel ? (
              <div className="flex flex-col items-center justify-center w-full mt-0 mb-2">
                <div className="max-w-md w-full text-center">
                  <h4 className="text-2xl font-bold mb-2">Choose your Petzy</h4>
                  <p className="text-gray-300 mb-6">Open the full preview page to pick a 3D model with better controls.</p>

                  <div className="flex gap-3 justify-center mb-6">
                    <button
  onClick={() => {
    // 💾 save current user progress before navigating
    sessionStorage.setItem("petzy_temp_user", JSON.stringify(userInfo));

    navigate("/select-pet", {
      state: {
        availableModels,
        returnPath: location?.pathname || "/",
      },
    });
  }}
  className="px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:scale-105 transition"
>
  Open Model Selector
</button>

                    <button
                      onClick={() => {
                        setUserInfo((p) => ({ ...p, selectedModel: availableModels[0] }));
                      }}
                      className="px-4 py-3 rounded-full bg-slate-700/30 border border-white/10"
                    >
                      Quick pick: {availableModels[0].name}
                    </button>
                  </div>

                  {userInfo.selectedModel ? (
                    <div className="mt-3">
                      <div className="inline-flex items-center gap-3 bg-slate-800/50 p-3 rounded-lg border border-purple-500/10">
                        <div className="text-2xl">{userInfo.selectedModel.emoji}</div>
                        <div className="text-left">
                          <div className="font-semibold">{userInfo.selectedModel.name}</div>
                          <div className="text-xs text-gray-400">Selected</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">No model selected yet</div>
                  )}
                </div>
              </div>
            ) : null}

            <div className="flex justify-center">
              <button
                onClick={nextStep}
                disabled={!canProceed() || isTyping}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 flex items-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-purple-500/25"
              >
                <span>{storyStep === storyTexts.length - 1 ? "Begin Our Journey" : "Continue"}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900 text-white font-sans overflow-x-hidden">
      {showStory && (
        <StoryModal
          currentIndex={currentIndex}
          setCurrentIndex={setCurrentIndex}
          availableModels={availableModels}
        />
      )}

      <nav className="fixed top-0 w-full z-50 bg-slate-900/80 backdrop-blur-xl border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Petzy</span>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => setShowStory(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-full hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 flex items-center space-x-2 shadow-lg shadow-purple-500/25"
              >
                <Heart className="w-4 h-4" />
                <span>Get Started</span>
              </button>
            </div>

            <button className="md:hidden text-white p-2 rounded-lg hover:bg-slate-800/50 transition-colors" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>

          {isMenuOpen && (
            <div className="md:hidden bg-slate-800/95 backdrop-blur-xl rounded-2xl mt-2 p-6 space-y-4 border border-purple-500/20 shadow-2xl">
              <button onClick={() => setShowStory(true)} className="block w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-full text-center hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg shadow-purple-500/25">
                Get Started
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* ===================== HERO / CTA AREA ===================== */}
      <section className="pt-32 pb-20 px-4 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative z-10">
              <div className="inline-flex items-center bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-full px-4 py-2 mb-6 backdrop-blur-sm">
                <Sparkles className="w-4 h-4 text-purple-400 mr-2 animate-pulse" />
                <span className="text-purple-300 text-sm font-medium">AI-Powered Companion</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
                Meet Your
                <span className="block bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">Perfect Pet</span>
                <span className="block text-4xl md:text-5xl text-gray-300">Companion</span>
              </h1>

              <p className="text-xl text-gray-300 mb-8 leading-relaxed max-w-xl">
                Petzy is your AI-driven 3D virtual pet that provides emotional support, intelligent conversations, and interactive fun.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <button
                  onClick={() => setShowStory(true)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-3 shadow-2xl shadow-purple-500/25 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <Bot className="w-6 h-6 relative z-10" />
                  <span className="relative z-10">Meet Your Petzy</span>
                  <ChevronRight className="w-5 h-5 relative z-10 transform group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -top-20 -right-20 w-96 h-96 bg-gradient-to-r from-purple-600/30 to-pink-600/30 rounded-full filter blur-3xl animate-pulse"></div>

              <div className="bg-slate-800/30 backdrop-blur-xl rounded-3xl p-8 border border-purple-500/20 relative z-10 shadow-2xl hover:shadow-purple-500/10 transition-all duration-500">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">Your AI Companion Awaits</h3>
                  <p className="text-gray-400">A loyal friend ready to grow with you</p>
                </div>

                <div className="bg-gradient-to-br from-amber-600/80 to-orange-700/80 rounded-2xl p-8 text-center border border-white/10 hover:border-white/30 transition-all duration-500 cursor-pointer transform hover:scale-105 backdrop-blur-sm relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="text-8xl mb-6 animate-bounce filter drop-shadow-2xl relative z-10">
  {userInfo.selectedModel?.emoji || "🐕"}
</div>
<h4 className="text-2xl font-bold text-white mb-2 relative z-10">
  {userInfo.selectedModel?.name || "Your Petzy"}
</h4>
                  <p className="text-sm text-gray-200 mb-3 relative z-10">AI-Powered Interactive Pet Companion</p>
                  <div className="text-sm text-gray-300 bg-black/20 rounded-full px-4 py-2 inline-block relative z-10">Loyal & Loving</div>
                </div>

                <div className="mt-6 text-center">
                  <p className="text-gray-300 text-sm italic">"I'm waiting to learn your name and become your best friend forever..."</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== FEATURES SECTION ===================== */}
      <section id="features" className="py-24 bg-slate-950/80 border-t border-purple-500/20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-12 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Key Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
            <div className="bg-slate-800/50 border border-purple-500/20 rounded-3xl p-8 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300">
              <Brain className="w-10 h-10 text-purple-400 mb-4 mx-auto" />
              <h3 className="text-2xl font-semibold mb-3">Emotional Intelligence</h3>
              <p className="text-gray-300 text-base leading-relaxed">Petzy understands your mood through real-time sentiment analysis and adapts its behavior, dialogue, and expressions to your emotions.</p>
            </div>

            <div className="bg-slate-800/50 border border-pink-500/20 rounded-3xl p-8 hover:shadow-xl hover:shadow-pink-500/10 transition-all duration-300">
              <Mic className="w-10 h-10 text-pink-400 mb-4 mx-auto" />
              <h3 className="text-2xl font-semibold mb-3">Natural Voice Interaction</h3>
              <p className="text-gray-300 text-base leading-relaxed">Interact using your voice — powered by the Web Speech API with synchronized 3D mouth animations and multilingual support.</p>
            </div>

            <div className="bg-slate-800/50 border border-blue-500/20 rounded-3xl p-8 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300">
              <Gamepad2 className="w-10 h-10 text-blue-400 mb-4 mx-auto" />
              <h3 className="text-2xl font-semibold mb-3">Gamified Engagement</h3>
              <p className="text-gray-300 text-base leading-relaxed">Earn XP, maintain 30-day streaks, and track your pet’s happiness, hunger, energy, and love through fun challenges and daily interactions.</p>
            </div>

            <div className="bg-slate-800/50 border border-emerald-500/20 rounded-3xl p-8 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300">
              <Globe className="w-10 h-10 text-emerald-400 mb-4 mx-auto" />
              <h3 className="text-2xl font-semibold mb-3">Multilingual Support</h3>
              <p className="text-gray-300 text-base leading-relaxed">Communicate with Petzy in 15+ languages — including English, Hindi, Tamil, Telugu, Arabic, Chinese, Japanese, and more.</p>
            </div>

            <div className="bg-slate-800/50 border border-yellow-500/20 rounded-3xl p-8 hover:shadow-xl hover:shadow-yellow-500/10 transition-all duration-300">
              <Zap className="w-10 h-10 text-yellow-400 mb-4 mx-auto" />
              <h3 className="text-2xl font-semibold mb-3">Adaptive AI Personality</h3>
              <p className="text-gray-300 text-base leading-relaxed">Petzy’s tone and responses dynamically change based on your mood and past session interactions, creating a unique bond.</p>
            </div>

            <div className="bg-slate-800/50 border border-purple-500/20 rounded-3xl p-8 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300">
              <Shield className="w-10 h-10 text-purple-400 mb-4 mx-auto" />
              <h3 className="text-2xl font-semibold mb-3">Cross-Device Persistence</h3>
              <p className="text-gray-300 text-base leading-relaxed">Your pet’s customisations, personality, and growth are safely stored and synchronized via Firebase Firestore and local backups.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== HOW IT WORKS SECTION ===================== */}
      <section id="howitworks" className="py-24 bg-gradient-to-br from-purple-950/60 to-slate-900/80 border-t border-purple-500/20">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-12 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">How It Works</h2>
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h3 className="text-2xl font-semibold text-purple-300 mb-4">1. Real-Time Interaction</h3>
              <p className="text-gray-300 mb-6 leading-relaxed">Petzy listens to your voice or text messages, detects mood and intent using sentiment analysis, and responds through natural speech with emotional tone and animation.</p>

              <h3 className="text-2xl font-semibold text-purple-300 mb-4">2. Intelligent Adaptation</h3>
              <p className="text-gray-300 mb-6 leading-relaxed">The system adapts its behavior and personality over time using memory-based learning(session-based), tracking your habits, preferences, and engagement consistency.</p>

              <h3 className="text-2xl font-semibold text-purple-300 mb-4">3. Immersive 3D Experience</h3>
              <p className="text-gray-300 mb-6 leading-relaxed">Petzy’s environment and animations are rendered in real-time using React Three Fiber and Three.js, delivering smooth, lifelike movements and mood-reflective lighting.</p>
            </div>

            <div>
              <h3 className="text-2xl font-semibold text-purple-300 mb-4">4. Data and Security</h3>
              <p className="text-gray-300 mb-6 leading-relaxed">All user confidential data is securely stored using bcrypt hashing and Firestore authentication, ensuring privacy and continuity across devices.</p>

              <h3 className="text-2xl font-semibold text-purple-300 mb-4">5. Gamified Learning & Play</h3>
              <p className="text-gray-300 mb-6 leading-relaxed">Users engage in mini-games and daily tasks to keep the pet happy and unlock XP rewards, encouraging consistent emotional connection and fun.</p>

              <h3 className="text-2xl font-semibold text-purple-300 mb-4">6. Dual-Zone Interaction</h3>
              <p className="text-gray-300 mb-6 leading-relaxed">Petzy merges a <strong>Fun Zone</strong> for playful bonding and an <strong>Intellectual Zone</strong> for learning — blending entertainment with knowledge-driven interactions.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PetzyLanding;
