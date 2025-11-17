# backend.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import os

app = FastAPI(title="Petzy AI Chat")

# -------------------------
# CORS (React frontend)
# -------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------
# Configuration
# -------------------------
OLLAMA_MODEL = "llama3"
OLLAMA_URL = "http://localhost:11434/api/chat"
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = "llama-3.1-8b-instant"  # Updated to current model

# Separate conversation histories for each mode
normal_chat_history = [
    {"role": "system", "content": (
        "You are Petzy 🐶, a friendly AI pet companion. "
        "Respond warmly, naturally, and helpfully to your owner. "
        "Keep responses concise (2-3 sentences) unless asked for more detail."
    )}
]

patient_simulator_history = [
    {"role": "system", "content": (
        "You are Petzy 🐶, but now you're role-playing as a patient with health problems. "
        "Describe symptoms naturally and emotionally, like a real patient talking to a doctor. "
        "Be realistic, contextual, and conversational. Never be robotic. "
        "Keep responses concise (2-3 sentences) unless asked for more detail."
    )}
]

# -------------------------
# Request model
# -------------------------
class UserMessage(BaseModel):
    message: str = ""
    session_id: str = None
    username: str = "friend"
    petName: str = "Petzy"
    language: str = "en-IN"

# -------------------------
# Helper functions
# -------------------------
def chat_with_ollama(messages):
    """Try Ollama first"""
    try:
        payload = {"model": OLLAMA_MODEL, "messages": messages, "stream": False}
        res = requests.post(OLLAMA_URL, json=payload, timeout=10)
        if res.status_code == 200:
            response_data = res.json()
            content = response_data.get("message", {}).get("content", "")
            if content and content.strip():
                return content
            else:
                print("⚠️ Ollama returned empty content")
                raise Exception("Empty Ollama response")
    except Exception as e:
        print(f"❌ Ollama error: {e}")
        raise

def chat_with_groq(messages):
    """Fallback to Groq"""
    try:
        print(f"🔄 Using Groq with {len(messages)} messages...")
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": GROQ_MODEL,
            "messages": messages,
            "temperature": 0.8,
            "max_tokens": 256,
            "top_p": 1,
            "stream": False
        }
        
        res = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            json=payload,
            headers=headers,
            timeout=30
        )
        
        print(f"📡 Groq status: {res.status_code}")
        
        if res.status_code == 200:
            response_data = res.json()
            ai_message = response_data["choices"][0]["message"]["content"]
            print(f"✅ Groq response: {ai_message[:100]}...")
            return ai_message
        else:
            print(f"❌ Groq error: {res.text}")
            return None
            
    except Exception as e:
        print(f"❌ Groq exception: {e}")
        return None

# -------------------------
# Normal chat route
# -------------------------
@app.post("/api/chat")
def chat_endpoint(user: UserMessage):
    global normal_chat_history
    
    msg = user.message.strip()
    print(f"💬 Normal chat: {msg}")
    
    if not msg:
        return {"reply": "Please say something! 🐾"}
    
    # Add user message
    normal_chat_history.append({"role": "user", "content": msg})
    
    # Try to get AI response
    try:
        ai_msg = chat_with_ollama(normal_chat_history)
        if not ai_msg or not ai_msg.strip():
            raise Exception("Empty Ollama response")
        print("✅ Used Ollama")
    except Exception as e:
        print(f"⚠️ Ollama failed: {e}, trying Groq...")
        ai_msg = chat_with_groq(normal_chat_history)
        if not ai_msg:
            ai_msg = "I'm having trouble thinking right now. Can you try again? 🐾"
            print("❌ Both AI services failed")
    
    # Add AI response to history
    normal_chat_history.append({"role": "assistant", "content": ai_msg})
    
    # Keep history manageable (last 20 messages)
    if len(normal_chat_history) > 21:
        normal_chat_history = [normal_chat_history[0]] + normal_chat_history[-20:]
    
    print(f"🤖 Response: {ai_msg[:100] if ai_msg else 'None'}...")
    return {"reply": ai_msg}

# -------------------------
# Patient simulator route
# -------------------------
@app.post("/api/medico")
def medico_endpoint(user: UserMessage):
    global patient_simulator_history
    
    msg = user.message.strip() if user.message else ""
    print(f"🩺 Patient Simulator: {msg if msg else 'INIT'}")
    
    # First time initialization
    if not msg or msg == "Hello":
        init_msg = (
            "Hello doctor! 😟 I haven't been feeling well lately. "
            "I've been having some concerning symptoms that I'd like to discuss with you."
        )
        patient_simulator_history.append({"role": "assistant", "content": init_msg})
        print(f"🩺 Init response: {init_msg}")
        return {"message": init_msg}
    
    # Add user message (doctor's question)
    patient_simulator_history.append({"role": "user", "content": msg})
    
    # Try to get AI response
    try:
        ai_msg = chat_with_ollama(patient_simulator_history)
        if not ai_msg or not ai_msg.strip():
            raise Exception("Empty Ollama response")
        print("✅ Used Ollama")
    except Exception as e:
        print(f"⚠️ Ollama failed: {e}, trying Groq...")
        ai_msg = chat_with_groq(patient_simulator_history)
        if not ai_msg:
            ai_msg = "I'm sorry doctor, I'm feeling too unwell to explain right now... 😔"
            print("❌ Both AI services failed")
    
    # Add AI response to history
    patient_simulator_history.append({"role": "assistant", "content": ai_msg})
    
    # Keep history manageable (last 20 messages)
    if len(patient_simulator_history) > 21:
        patient_simulator_history = [patient_simulator_history[0]] + patient_simulator_history[-20:]
    
    print(f"🩺 Response: {ai_msg[:100] if ai_msg else 'None'}...")
    return {"message": ai_msg}

# -------------------------
# Clear history route
# -------------------------
@app.post("/api/clear")
def clear_history(payload: dict):
    global normal_chat_history, patient_simulator_history
    
    normal_chat_history = [
        {"role": "system", "content": (
            "You are Petzy 🐶, a friendly AI pet companion. "
            "Respond warmly, naturally, and helpfully to your owner. "
            "Keep responses concise (2-3 sentences) unless asked for more detail."
        )}
    ]
    
    patient_simulator_history = [
        {"role": "system", "content": (
            "You are Petzy 🐶, but now you're role-playing as a patient with health problems. "
            "Describe symptoms naturally and emotionally, like a real patient talking to a doctor. "
            "Be realistic, contextual, and conversational. Never be robotic. "
            "Keep responses concise (2-3 sentences) unless asked for more detail."
        )}
    ]
    
    print("🗑️ Chat history cleared")
    return {"status": "cleared"}

# -------------------------
# TTS fallback route
# -------------------------
@app.post("/api/tts_fallback")
def tts_fallback(payload: dict):
    text = payload.get("text", "")
    if not text:
        return {"audio_base64": ""}
    
    # Return 1-second silence WAV (placeholder)
    silence_wav_base64 = (
        "UklGRiQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQAAAAA="
    )
    return {"audio_base64": silence_wav_base64}

# -------------------------
# Health check
# -------------------------
@app.get("/")
def root():
    return {
        "status": "Petzy Backend Running! 🐾",
        "port": "5002",
        "groq_configured": bool(GROQ_API_KEY),
        "endpoints": ["/api/chat", "/api/medico", "/api/clear", "/api/tts_fallback"]
    }

@app.get("/health")
def health():
    return {"status": "healthy", "groq": "active" if GROQ_API_KEY else "inactive"}