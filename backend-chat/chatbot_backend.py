import os
import re
import json
import asyncio
from datetime import datetime
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
import uvicorn

# Load environment variables
load_dotenv()

# Initialize Groq client (ONLY Groq is allowed on Render)
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Initialize FastAPI app
app = FastAPI(title="Petzy AI Companion", version="2.0")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Persistent memory storage
MEMORY_FILE = "memory_async.json"
if os.path.exists(MEMORY_FILE):
    with open(MEMORY_FILE, "r", encoding="utf-8") as f:
        memory_store = json.load(f)
else:
    memory_store = {"pet_name": "Petzy"}

conversations = {}  # per-session message store
user_contexts = {}  # Store user context per session


def save_memory():
    """Save memory to disk."""
    with open(MEMORY_FILE, "w", encoding="utf-8") as f:
        json.dump(memory_store, f, ensure_ascii=False, indent=2)


def clean_petzy_response(text: str) -> str:
    """Remove *actions* like *wags tail* for cleaner output."""
    cleaned = re.sub(r'\*{1,2}[^*]+\*{1,2}', '', text)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned


# ------------------ LANGUAGE DETECTION ------------------
def detect_language(text: str) -> str:
    """Enhanced multilingual language detection."""
    if re.search(r"[\u0900-\u097F]", text): return "hi-IN"
    elif re.search(r"[\u0C80-\u0CFF]", text): return "kn-IN"
    elif re.search(r"[\u0B80-\u0BFF]", text): return "ta-IN"
    elif re.search(r"[\u0C00-\u0C7F]", text): return "te-IN"
    elif re.search(r"[\u0D00-\u0D7F]", text): return "ml-IN"
    elif re.search(r"[\u0980-\u09FF]", text): return "bn-IN"
    elif re.search(r"[\u0A80-\u0AFF]", text): return "gu-IN"
    elif re.search(r"[\u0A00-\u0A7F]", text): return "pa-IN"
    elif re.search(r"[\u0600-\u06FF]", text): return "ar-SA"
    elif re.search(r"[\u4E00-\u9FFF]", text): return "zh-CN"
    elif re.search(r"[\u3040-\u309F\u30A0-\u30FF]", text): return "ja-JP"
    elif re.search(r"[\uAC00-\uD7AF]", text): return "ko-KR"
    else: return "en-IN"


def get_language_instruction(lang_code: str) -> str:
    """Get specific language instruction for the model."""
    language_map = {
        "hi-IN": "Respond ONLY in Hindi.",
        "kn-IN": "Respond ONLY in Kannada.",
        "ta-IN": "Respond ONLY in Tamil.",
        "te-IN": "Respond ONLY in Telugu.",
        "ml-IN": "Respond ONLY in Malayalam.",
        "bn-IN": "Respond ONLY in Bengali.",
        "gu-IN": "Respond ONLY in Gujarati.",
        "mr-IN": "Respond ONLY in Marathi.",
        "pa-IN": "Respond ONLY in Punjabi.",
        "ar-SA": "Respond ONLY in Arabic.",
        "zh-CN": "Respond ONLY in Chinese.",
        "ja-JP": "Respond ONLY in Japanese.",
        "ko-KR": "Respond ONLY in Korean.",
        "es-ES": "Respond ONLY in Spanish.",
        "fr-FR": "Respond ONLY in French.",
        "de-DE": "Respond ONLY in German.",
        "en-IN": "Respond ONLY in English.",
    }
    return language_map.get(lang_code, "Respond ONLY in English.")


def extract_context(message: str, session_id: str) -> dict:
    """Extract and store contextual information from user messages."""
    if session_id not in user_contexts:
        user_contexts[session_id] = {
            "user_name": None,
            "preferences": [],
            "topics_discussed": [],
            "last_topic": None,
            "mood": "neutral",
        }
    
    context = user_contexts[session_id]

    # Mood detection
    if re.search(r"\b(happy|great|awesome|love)\b", message, re.I):
        context["mood"] = "positive"
    elif re.search(r"\b(sad|angry|upset|bad)\b", message, re.I):
        context["mood"] = "negative"

    if len(message.split()) > 3:
        context["last_topic"] = message[:50]

    return context


def build_context_prompt(session_id: str, lang_code: str) -> str:
    """Build contextual system prompt based on user history."""
    context = user_contexts.get(session_id, {})
    pet_name = memory_store.get("pet_name", "Petzy")

    base_prompt = f"You are {pet_name}, an AI pet companion. "
    base_prompt += get_language_instruction(lang_code) + " "

    if context.get("mood") == "positive":
        base_prompt += "The user seems happy. Match their energy. "
    elif context.get("mood") == "negative":
        base_prompt += "The user seems upset. Be kind and empathetic. "

    if context.get("last_topic"):
        base_prompt += f"Recent topic: {context['last_topic']}. "

    base_prompt += (
        "Speak warmly and naturally like a friendly pet. "
        "Avoid *actions* like *wags tail*. "
        "Keep responses short (2-3 sentences)."
    )

    return base_prompt


# ------------------ MAIN CHAT ENDPOINT ------------------
@app.post("/api/chat")
async def chat(request: Request):
    data = await request.json()
    user_message = data.get("message", "").strip()
    session_id = data.get("session_id", "default")
    requested_language = data.get("language", "auto")

    if not user_message:
        return {"error": "Empty message"}

    if session_id not in conversations:
        conversations[session_id] = []

    # Language selection
    user_language = requested_language if requested_language != "auto" else detect_language(user_message)

    # Update context
    extract_context(user_message, session_id)

    # Build model messages
    system_prompt = build_context_prompt(session_id, user_language)
    messages_for_model = [{"role": "system", "content": system_prompt}] + conversations[session_id] + [
        {"role": "user", "content": user_message}
    ]

    # ------------------ GROQ (PRIMARY) ------------------
    try:
        groq_resp = await asyncio.to_thread(
            lambda: groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=messages_for_model,
                temperature=0.7,
                max_tokens=400,
            )
        )

        reply_raw = groq_resp.choices[0].message.content.strip()
        reply_clean = clean_petzy_response(reply_raw)

        conversations[session_id].append({"role": "assistant", "content": reply_clean})
        return {"reply": reply_clean, "language": user_language}

    except Exception as groq_err:
        print("⚠️ Groq error:", groq_err)
        return {"error": "Groq model failed to respond."}


@app.post("/api/clear")
async def clear_history(request: Request):
    """Clear conversation history for a session."""
    data = await request.json()
    session_id = data.get("session_id", "default")

    if session_id in conversations:
        conversations[session_id] = []

    return {"status": "success", "message": "History cleared"}


if __name__ == "__main__":
    print("🐶 Petzy backend running on port 5000...")
    uvicorn.run(app, host="0.0.0.0", port=5000)
