// RightSidebar.js - Complete Combined Version
import React, { useState, useRef, useEffect } from "react";
import { Mic, Send, Square, Trash2, Globe } from "lucide-react";
import usePreferences from "../hooks/usePreferences";

/* =========================
   LANGUAGE DETECTION
   ========================= */
const detectLanguage = (text) => {
  if (!text) return "en-IN";
  if (/[\u0C80-\u0CFF]/.test(text)) return "kn-IN";
  if (/[\u0900-\u097F]/.test(text)) {
    if (/(नमस्ते|धन्यवाद|शुभं|कथं|अहं)/.test(text)) return "sa-IN";
    return "hi-IN";
  }
  if (/[\u0B80-\u0BFF]/.test(text)) return "ta-IN";
  if (/[\u0C00-\u0C7F]/.test(text)) return "te-IN";
  if (/[\u0D00-\u0D7F]/.test(text)) return "ml-IN";
  if (/[\u0980-\u09FF]/.test(text)) return "bn-IN";
  if (/[\u0A80-\u0AFF]/.test(text)) return "gu-IN";
  if (/[\u0600-\u06FF]/.test(text)) return "ar-SA";
  if (/[\u4E00-\u9FFF]/.test(text)) return "zh-CN";
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return "ja-JP";
  if (/[\uAC00-\uD7AF]/.test(text)) return "ko-KR";
  return "en-IN";
};

/* =========================
   TTS + MOUTH ANIMATION
   ========================= */
const speakText = async (text, petRef, languageCode = null) => {
  if (!text) return;
  
  if (!languageCode) {
    languageCode = detectLanguage(text);
  }

  console.log("🗣️ Attempting to speak in:", languageCode);

  const startSpeaking = () => {
    try {
      if (petRef?.current?.startSpeaking) petRef.current.startSpeaking();
    } catch (e) {
      console.warn("Could not start mouth animation:", e);
    }
  };
  
  const stopSpeaking = () => {
    try {
      if (petRef?.current?.stopSpeaking) petRef.current.stopSpeaking();
    } catch (e) {
      console.warn("Could not stop mouth animation:", e);
    }
  };

  try {
    if (!window.speechSynthesis) {
      console.warn("Speech synthesis not supported");
      throw new Error("no-browser-tts");
    }

    window.speechSynthesis.cancel();

    const attemptSpeak = () => {
      const voices = window.speechSynthesis.getVoices() || [];
      console.log("Available voices:", voices.length);

      const baseLang = (languageCode || "en-IN").split("-")[0];

      let selectedVoice =
        voices.find((v) => v.lang === languageCode) ||
        (languageCode === "sa-IN" ? voices.find((v) => v.lang === "hi-IN") : null) ||
        voices.find((v) => v.lang && v.lang.startsWith(baseLang)) ||
        voices.find((v) => v.lang && v.lang.includes(baseLang));

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = languageCode;
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log("✅ Using voice:", selectedVoice.name, "|", selectedVoice.lang);
      } else {
        console.log("⚠️ No matching voice found for", languageCode);
      }

      utterance.onstart = () => {
        console.log("🎤 Speech started");
        startSpeaking();
      };
      
      utterance.onend = () => {
        console.log("🎤 Speech ended");
        stopSpeaking();
      };
      
      utterance.onerror = (e) => {
        console.error("❌ Speech error:", e.error);
        stopSpeaking();
      };

      try {
        window.speechSynthesis.speak(utterance);
        console.log("🔊 Speech synthesis started");
      } catch (err) {
        console.warn("speechSynthesis.speak failed:", err);
        throw err;
      }
    };

    const voicesNow = window.speechSynthesis.getVoices();
    if (voicesNow && voicesNow.length > 0) {
      attemptSpeak();
      return;
    } else {
      let tried = false;
      const onVoicesChanged = () => {
        if (tried) return;
        tried = true;
        try {
          attemptSpeak();
        } catch (e) {
          console.warn("onvoiceschanged attemptSpeak failed:", e);
        } finally {
          window.speechSynthesis.onvoiceschanged = null;
        }
      };
      
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = onVoicesChanged;
      }
      
      await new Promise((res) => setTimeout(res, 250));
      if (window.speechSynthesis.getVoices().length) {
        return;
      }
    }
  } catch (err) {
    console.warn("Browser TTS failed, trying server fallback:", err);
  }

  try {
    startSpeaking();

    const res = await fetch("/api/tts_fallback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, lang: languageCode, format: "wav" }),
    });

    if (!res.ok) {
      console.warn("TTS fallback response not ok:", res.statusText);
      stopSpeaking();
      return;
    }

    const payload = await res.json();
    if (!payload?.audio_base64) {
      console.warn("No audio returned from fallback:", payload);
      stopSpeaking();
      return;
    }

    const byteChars = atob(payload.audio_base64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    audio.onended = () => {
      stopSpeaking();
      try {
        URL.revokeObjectURL(url);
      } catch (e) {}
    };
    
    audio.onerror = (e) => {
      console.warn("Fallback audio playback error:", e);
      stopSpeaking();
      try {
        URL.revokeObjectURL(url);
      } catch (err) {}
    };

    await audio.play();
  } catch (err) {
    console.warn("Server fallback TTS failed:", err);
    stopSpeaking();
  }
};

/* =========================
   MAIN COMPONENT
   ========================= */
export default function RightSidebar({ petRef }) {
  let preferences, updatePreferences, user;
  try {
    const hookResult = usePreferences();
    preferences = hookResult[0];
    updatePreferences = hookResult[1];
    user = hookResult[2]?.user;
  } catch (e) {
    preferences = {};
    updatePreferences = () => {};
    user = {};
  }
  
  const username = user?.username || "friend";
  const petName = preferences?.petName || "Petzy";

  const [simulatorMode, setSimulatorMode] = useState(false);
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hello! 👋 I'm " + petName + ", your AI pet companion!" },
  ]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en-IN");
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const sessionIdRef = useRef(
    "petzy-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9)
  );

  const languages = [
    { code: "en-IN", name: "English (India)", flag: "🇮🇳" },
    { code: "en-US", name: "English (US)", flag: "🇺🇸" },
    { code: "hi-IN", name: "हिंदी (Hindi)", flag: "🇮🇳" },
    { code: "kn-IN", name: "ಕನ್ನಡ (Kannada)", flag: "🇮🇳" },
    { code: "ta-IN", name: "தமிழ் (Tamil)", flag: "🇮🇳" },
    { code: "te-IN", name: "తెలుగు (Telugu)", flag: "🇮🇳" },
    { code: "ml-IN", name: "മലയാളം (Malayalam)", flag: "🇮🇳" },
    { code: "bn-IN", name: "বাংলা (Bengali)", flag: "🇮🇳" },
    { code: "gu-IN", name: "ગુજરાતી (Gujarati)", flag: "🇮🇳" },
    { code: "mr-IN", name: "मराठी (Marathi)", flag: "🇮🇳" },
    { code: "pa-IN", name: "ਪੰਜਾਬੀ (Punjabi)", flag: "🇮🇳" },
    { code: "sa-IN", name: "संस्कृतम् (Sanskrit)", flag: "🇮🇳" },
    { code: "es-ES", name: "Español", flag: "🇪🇸" },
    { code: "fr-FR", name: "Français", flag: "🇫🇷" },
    { code: "de-DE", name: "Deutsch", flag: "🇩🇪" },
    { code: "zh-CN", name: "中文 (Chinese)", flag: "🇨🇳" },
    { code: "ja-JP", name: "日本語 (Japanese)", flag: "🇯🇵" },
    { code: "ko-KR", name: "한국어 (Korean)", flag: "🇰🇷" },
    { code: "ar-SA", name: "العربية (Arabic)", flag: "🇸🇦" },
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (window.speechSynthesis) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        console.log("🎤 Loaded", voices.length, "voices");
        
        const languagesList = [...new Set(voices.map((v) => v.lang))];
        console.log("Available languages:", languagesList);
      };

      loadVoices();
      
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }

      setTimeout(loadVoices, 100);
    }
  }, []);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = selectedLanguage;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      console.log("🎤 Heard:", transcript);
      setInput(transcript);
    };
    
    recognition.onend = () => setListening(false);
    
    recognition.onerror = (ev) => {
      console.error("🎤 Recognition error:", ev.error);
      setListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
    };
  }, [selectedLanguage]);

  const recordInteraction = () => {
    if (updatePreferences && preferences) {
      const updatedLog = { ...(preferences?.dailyLog || {}) };
      updatedLog.interact = (updatedLog.interact || 0) + 1;
      updatePreferences({ dailyLog: updatedLog });
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    recordInteraction();

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
    setInput("");
    setIsLoading(true);

    try {
      let data;

      if (simulatorMode) {
        const res = await fetch("https://petzy-deploy.onrender.com/api/medico", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionIdRef.current,
            username,
            petName,
            message: userMessage,
            language: selectedLanguage,
          }),
        });
        if (!res.ok) throw new Error("HTTP error! status: " + res.status);
        data = await res.json();
      } else {
        const res = await fetch("https://petzy-chat.onrender.com/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userMessage,
            session_id: sessionIdRef.current,
            language: selectedLanguage,
            username,
            petName,
          }),
        });
        if (!res.ok) throw new Error("HTTP error! status: " + res.status);
        data = await res.json();
      }

      let botReply = data.reply || data.message || data.response || "Sorry, I didn't get that!";

      botReply = botReply
        .replace(/\b(Petzy|petzy)\b/g, petName)
        .replace(/\b(friend|user)\b/gi, username);

      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: botReply },
      ]);

      setTimeout(() => {
        console.log("🔊 About to speak:", botReply.substring(0, 50) + "...");
        speakText(botReply, petRef, selectedLanguage);
      }, 150);
      
    } catch (err) {
      console.error("❌ Chat error:", err);
      const errorMsg = "Sorry, I'm having trouble connecting! 🐾 Make sure the backend is running";
      setMessages((prev) => [...prev, { sender: "bot", text: errorMsg }]);
      speakText(errorMsg, petRef, "en-US");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition not supported in your browser. Please use Chrome or Edge.");
      return;
    }

    if (listening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setListening(true);
      } catch (error) {
        console.error("🎤 Error starting recognition:", error);
        alert("Could not start microphone. Please try again.");
      }
    }
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    try {
      if (petRef?.current?.stopSpeaking) petRef.current.stopSpeaking();
    } catch (e) {}
  };

  const clearHistory = async () => {
    try {
      const response = await fetch("https://petzy-chat.onrender.com/api/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionIdRef.current }),
      });
      
      if (response.ok) {
        setMessages([{ sender: "bot", text: "Memory cleared! Fresh start! 🐾" }]);
        speakText("Memory cleared! Fresh start!", petRef, "en-US");
      } else {
        console.warn("Clear history failed:", response.statusText);
      }
    } catch (err) {
      console.error("Error clearing history:", err);
    }
  };

  const startPatientSimulator = async () => {
    setSimulatorMode(true);

    try {
      const res = await fetch("https://petzy-deploy.onrender.com/api/medico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionIdRef.current,
          username,
          petName,
        }),
      });

      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      console.log("🩺 Patient Simulator Response:", data);

      const reply = data.message || "Patient simulator started!";
      setMessages((prev) => [...prev, { sender: "bot", text: reply }]);
      speakText(reply, petRef);
    } catch (err) {
      console.error("❌ Patient Simulator error:", err);
      const errMsg = "Could not start Patient Simulator. Check backend.";
      setMessages((prev) => [...prev, { sender: "bot", text: errMsg }]);
      speakText(errMsg, petRef, "en-US");
    }
  };

  const currentLanguage = languages.find((l) => l.code === selectedLanguage);

  return (
    <aside className="w-72 bg-black bg-opacity-40 backdrop-blur-3xl border-l-2 border-white border-opacity-20 flex flex-col p-4 space-y-3 overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-pink-400 via-red-400 to-pink-400 animate-pulse"></div>

      <div className="text-center p-4 border-b border-white border-opacity-20">
        <div className="flex justify-between items-center mb-2">
          <div className="flex-1">
            <div className="font-['Orbitron'] text-white text-xl font-bold mb-1">
              🤖 {petName} Chat
            </div>
            <div className="text-white text-opacity-70 text-xs">
              {simulatorMode ? "🩺 Patient Simulator Mode" : "Ask me anything!"}
            </div>
          </div>
          <button
            onClick={clearHistory}
            className="p-2 hover:bg-white hover:bg-opacity-10 rounded-lg transition"
            title="Clear chat history"
          >
            <Trash2 size={16} className="text-white opacity-60" />
          </button>
        </div>

        <div className="relative mt-2">
          <button
            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
            className="w-full px-3 py-2 bg-white bg-opacity-10 text-white text-xs rounded-lg border border-white border-opacity-20 hover:bg-opacity-20 transition flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <Globe size={14} />
              {currentLanguage?.flag} {currentLanguage?.name}
            </span>
            <span className="text-white opacity-60">▼</span>
          </button>

          {showLanguageMenu && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-black bg-opacity-95 backdrop-blur-xl border border-white border-opacity-20 rounded-lg max-h-60 overflow-y-auto z-50 shadow-2xl">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setSelectedLanguage(lang.code);
                    setShowLanguageMenu(false);
                  }}
                  className={"w-full px-3 py-2 text-left text-xs hover:bg-white hover:bg-opacity-10 transition " + (selectedLanguage === lang.code ? "bg-white bg-opacity-20 text-cyan-400" : "text-white")}
                >
                  {lang.flag} {lang.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={stopSpeaking}
          className="w-full mt-2 px-3 py-2 bg-orange-500 bg-opacity-20 text-orange-300 text-xs rounded-lg border border-orange-400 border-opacity-30 hover:bg-opacity-30 transition"
          title="Stop speaking"
        >
          🔇 Stop Speaking
        </button>

        <button
          onClick={() => {
            const testText =
              selectedLanguage === "kn-IN" ? "ನಮಸ್ಕಾರ, ನಾನು ಪೆಟ್ಜಿ" :
              selectedLanguage === "hi-IN" ? "नमस्ते, मैं पेट्ज़ी हूँ" :
              selectedLanguage === "ta-IN" ? "வணக்கம், நான் பெட்ஸி" :
              selectedLanguage === "te-IN" ? "నమస్కారం, నేను పెట్జీ" :
              selectedLanguage === "sa-IN" ? "नमस्ते, अहं पेट्जी अस्मि" :
              "Hello, I am " + petName;
            console.log("🧪 Testing voice with:", testText);
            speakText(testText, petRef, selectedLanguage);
          }}
          className="w-full mt-1 px-3 py-2 bg-green-500 bg-opacity-20 text-green-300 text-xs rounded-lg border border-green-400 border-opacity-30 hover:bg-opacity-30 transition"
          title="Test current language voice"
        >
          🧪 Test Voice
        </button>

        {!simulatorMode ? (
          <button
            onClick={startPatientSimulator}
            className="w-full mt-1 px-3 py-2 bg-purple-500 bg-opacity-20 text-purple-300 text-xs rounded-lg border border-purple-400 border-opacity-30 hover:bg-opacity-30 transition"
          >
            🩺 Patient Simulator
          </button>
        ) : (
          <button
            onClick={() => {
              setSimulatorMode(false);
              const reply = "Patient Simulator stopped. Back to normal chat!";
              setMessages((prev) => [...prev, { sender: "bot", text: reply }]);
              speakText(reply, petRef, "en-US");
            }}
            className="w-full mt-1 px-3 py-2 bg-red-500 bg-opacity-20 text-red-300 text-xs rounded-lg border border-red-400 border-opacity-30 hover:bg-opacity-30 transition"
          >
            🛑 Stop Simulator
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-3 scrollbar-thin scrollbar-thumb-white scrollbar-thumb-opacity-20">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={"max-w-[85%] px-4 py-2 rounded-2xl text-sm leading-relaxed " + (msg.sender === "user" ? "ml-auto bg-gradient-to-r from-blue-500 to-cyan-400 text-white shadow-lg" : "mr-auto bg-white bg-opacity-10 text-white border border-white border-opacity-20 backdrop-blur-sm")}
          >
            {msg.text}
          </div>
        ))}
        {isLoading && (
          <div className="mr-auto bg-white bg-opacity-10 text-white border border-white border-opacity-20 px-4 py-2 rounded-2xl text-sm">
            <span className="inline-block">Thinking</span>
            <span className="animate-pulse">...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

 <div className="p-2 border-t border-white border-opacity-20 flex items-center gap-2 justify-start overflow-hidden">
  <button
    className={
      "p-2 ml-[-4px] shrink-0 rounded-full transition-all " +
      (listening
        ? "bg-red-500 text-white animate-pulse"
        : "bg-white bg-opacity-10 text-white border border-white border-opacity-20 hover:bg-opacity-20")
    }
    onClick={toggleMic}
    disabled={isLoading}
    title={
      listening
        ? "Stop recording"
        : "Start voice input (" + (currentLanguage?.name || "") + ")"
    }
  >
    {listening ? <Square size={12} /> : <Mic size={12} />}
  </button>

  <input
    type="text"
    value={input}
    onChange={(e) => setInput(e.target.value)}
    onKeyDown={(e) => e.key === "Enter" && handleSend()}
    placeholder="Type or speak..."
    className="flex-1 min-w-0 px-4 py-2 rounded-xl bg-white bg-opacity-10 text-white placeholder-white placeholder-opacity-60 border border-white border-opacity-20 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
    disabled={isLoading}
  />

  <button
    className="p-2 shrink-0 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    onClick={handleSend}
    disabled={isLoading || !input.trim()}
    title="Send message"
  >
    <Send size={12} />
  </button>
</div>

    </aside>
  );
}