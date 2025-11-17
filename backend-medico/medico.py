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
    allow_origins=["*"],   # allow Netlify + Render
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------
# Configuration
# -------------------------
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = "llama-3.1-8b-instant"

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
# GROQ request
# -------------------------
def chat_with_groq(messages):
    try:
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

        if res.status_code == 200:
            response_data = res.json()
            ai_message = response_data["choices"][0]["message"]["content"]
            return ai_message
        else:
            return None
    except Exception:
        return None

# -------------------------
# Normal chat route
# -------------------------
@app.post("/api/chat")
def chat_endpoint(user: UserMessage):
    global normal_chat_history

    msg = user.message.strip()
    if not msg:
        return {"reply": "Please say something! 🐾"}

    normal_chat_history.append({"role": "user", "content": msg})

    # **Groq ONLY – Ollama removed**
    ai_msg = chat_with_groq(normal_chat_history)
    if not ai_msg:
        ai_msg = "I'm having trouble thinking right now. Can you try again? 🐾"

    normal_chat_history.append({"role": "assistant", "content": ai_msg})

    if len(normal_chat_history) > 21:
        normal_chat_history = [normal_chat_history[0]] + normal_chat_history[-20:]

    return {"reply": ai_msg}

# -------------------------
# Patient simulator route
# -------------------------
@app.post("/api/medico")
def medico_endpoint(user: UserMessage):
    global patient_simulator_history

    msg = user.message.strip() if user.message else ""

    if not msg or msg == "Hello":
        init_msg = (
            "Hello doctor! 😟 I haven't been feeling well lately. "
            "I've been having some concerning symptoms that I'd like to discuss with you."
        )
        patient_simulator_history.append({"role": "assistant", "content": init_msg})
        return {"message": init_msg}

    patient_simulator_history.append({"role": "user", "content": msg})

    # Groq ONLY
    ai_msg = chat_with_groq(patient_simulator_history)
    if not ai_msg:
        ai_msg = "I'm sorry doctor, I'm feeling too unwell to explain right now... 😔"

    patient_simulator_history.append({"role": "assistant", "content": ai_msg})

    if len(patient_simulator_history) > 21:
        patient_simulator_history = [patient_simulator_history[0]] + patient_simulator_history[-20:]

    return {"message": ai_msg}

# -------------------------
# Clear history
# -------------------------
@app.post("/api/clear")
def clear_history(payload: dict):
    global normal_chat_history, patient_simulator_history

    normal_chat_history = normal_chat_history[:1]
    patient_simulator_history = patient_simulator_history[:1]

    return {"status": "cleared"}

# -------------------------
# TTS fallback
# -------------------------
@app.post("/api/tts_fallback")
def tts_fallback(payload: dict):
    text = payload.get("text", "")
    if not text:
        return {"audio_base64": ""}

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
        "groq_configured": bool(GROQ_API_KEY),
        "endpoints": ["/api/chat", "/api/medico", "/api/clear"]
    }

@app.get("/health")
def health():
    return {"status": "healthy", "groq": "active" if GROQ_API_KEY else "inactive"}
