import os
import re
import json
import asyncio
from datetime import datetime
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from ollama import AsyncClient  
import uvicorn

# Load environment variables
load_dotenv()

# Initialize Groq and Ollama clients
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
ollama_client = AsyncClient()

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
    """
    Removes action-like expressions (e.g., *wags tail*, **smiles**) 
    from AI-generated responses for more natural chat.
    """
    cleaned = re.sub(r'\*{1,2}[^*]+\*{1,2}', '', text)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned


def detect_language(text: str) -> str:
    """Enhanced language detection with better accuracy."""
    # Hindi
    if re.search(r"[\u0900-\u097F]", text):
        return "hi-IN"
    # Kannada
    elif re.search(r"[\u0C80-\u0CFF]", text):
        return "kn-IN"
    # Tamil
    elif re.search(r"[\u0B80-\u0BFF]", text):
        return "ta-IN"
    # Telugu
    elif re.search(r"[\u0C00-\u0C7F]", text):
        return "te-IN"
    # Malayalam
    elif re.search(r"[\u0D00-\u0D7F]", text):
        return "ml-IN"
    # Bengali
    elif re.search(r"[\u0980-\u09FF]", text):
        return "bn-IN"
    # Gujarati
    elif re.search(r"[\u0A80-\u0AFF]", text):
        return "gu-IN"
    # Marathi
    elif re.search(r"[\u0900-\u097F]", text):  # Shares script with Hindi
        return "mr-IN"
    # Punjabi
    elif re.search(r"[\u0A00-\u0A7F]", text):
        return "pa-IN"
    # Arabic
    elif re.search(r"[\u0600-\u06FF]", text):
        return "ar-SA"
    # Chinese
    elif re.search(r"[\u4E00-\u9FFF]", text):
        return "zh-CN"
    # Japanese
    elif re.search(r"[\u3040-\u309F\u30A0-\u30FF]", text):
        return "ja-JP"
    # Korean
    elif re.search(r"[\uAC00-\uD7AF]", text):
        return "ko-KR"
    # Spanish keywords
    elif re.search(r"\b(hola|gracias|por favor|sí|no)\b", text, re.I):
        return "es-ES"
    # French keywords
    elif re.search(r"\b(bonjour|merci|s'il vous plaît|oui|non)\b", text, re.I):
        return "fr-FR"
    # German keywords
    elif re.search(r"\b(hallo|danke|bitte|ja|nein)\b", text, re.I):
        return "de-DE"
        # Sanskrit
    elif re.search(r"[\u0900-\u097F]", text) and re.search(r"\b(नमस्ते|धन्यवाद|शुभं|त्वं|अहं|कथं)\b", text):
        return "sa-IN"
    else:
        return "en-IN"


def get_language_instruction(lang_code: str) -> str:
    """Get specific language instruction for the model."""
    language_map = {
        "hi-IN": "Respond ONLY in Hindi (हिंदी). Use Devanagari script.",
        "kn-IN": "Respond ONLY in Kannada (ಕನ್ನಡ). Use Kannada script.",
        "ta-IN": "Respond ONLY in Tamil (தமிழ்). Use Tamil script.",
        "te-IN": "Respond ONLY in Telugu (తెలుగు). Use Telugu script.",
        "ml-IN": "Respond ONLY in Malayalam (മലയാളം). Use Malayalam script.",
        "bn-IN": "Respond ONLY in Bengali (বাংলা). Use Bengali script.",
        "gu-IN": "Respond ONLY in Gujarati (ગુજરાતી). Use Gujarati script.",
        "mr-IN": "Respond ONLY in Marathi (मराठी). Use Devanagari script.",
        "pa-IN": "Respond ONLY in Punjabi (ਪੰਜਾਬੀ). Use Gurmukhi script.",
        "ar-SA": "Respond ONLY in Arabic (العربية). Use Arabic script.",
        "zh-CN": "Respond ONLY in Simplified Chinese (简体中文).",
        "ja-JP": "Respond ONLY in Japanese (日本語).",
        "ko-KR": "Respond ONLY in Korean (한국어).",
        "es-ES": "Respond ONLY in Spanish (Español).",
        "fr-FR": "Respond ONLY in French (Français).",
        "de-DE": "Respond ONLY in German (Deutsch).",
        "en-US": "Respond ONLY in English.",
        "en-IN": "Respond ONLY in English.",
        "sa-IN": "Respond ONLY in Sanskrit (संस्कृतम्). Be polite, concise, and use grammatically correct classical Sanskrit. Use Devanagari script.",
    }
    return language_map.get(lang_code, "Respond in English.")


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
    
    # Extract user name
    name_patterns = [
        r"(?:my name is|i am|i'm|call me)\s+([A-Za-z\u0900-\u097F\u0C80-\u0CFF\u0B80-\u0BFF\u0C00-\u0C7F\u0D00-\u0D7F]+)",
        r"(?:मेरा नाम|मैं)\s+([A-Za-z\u0900-\u097F]+)",
        r"(?:ನನ್ನ ಹೆಸರು|ನಾನು)\s+([A-Za-z\u0C80-\u0CFF]+)",
    ]
    for pattern in name_patterns:
        match = re.search(pattern, message, re.I)
        if match:
            context["user_name"] = match.group(1).strip().capitalize()
    
    # Detect mood/sentiment
    positive_words = r"\b(happy|excited|great|wonderful|love|good|awesome|fantastic)\b"
    negative_words = r"\b(sad|angry|frustrated|upset|bad|terrible|awful)\b"
    
    if re.search(positive_words, message, re.I):
        context["mood"] = "positive"
    elif re.search(negative_words, message, re.I):
        context["mood"] = "negative"
    
    # Track topics
    if len(message.split()) > 3:
        context["last_topic"] = message[:50]
        if context["last_topic"] not in context["topics_discussed"]:
            context["topics_discussed"].append(context["last_topic"])
    
    return context


def build_context_prompt(session_id: str, lang_code: str) -> str:
    """Build contextual system prompt based on user history."""
    context = user_contexts.get(session_id, {})
    pet_name = memory_store.get('pet_name', 'Petzy')
    
    base_prompt = f"You are {pet_name}, an AI pet companion. "
    
    # Add language instruction - CRITICAL for proper language response
    base_prompt += get_language_instruction(lang_code) + " "
    
    # Add user context
    if context.get("user_name"):
        base_prompt += f"The user's name is {context['user_name']}. "
    
    if context.get("mood") == "positive":
        base_prompt += "The user seems happy. Match their energy with enthusiasm. "
    elif context.get("mood") == "negative":
        base_prompt += "The user seems upset. Be extra supportive and empathetic. "
    
    if context.get("last_topic"):
        base_prompt += f"Recent topic: {context['last_topic']}. Reference this if relevant. "
    
    base_prompt += (
        "Speak warmly and naturally like a friendly pet companion. "
        "Avoid describing physical actions or emotions (e.g., *wags tail*, *smiles*). "
        "Keep your responses short (2-3 sentences), relevant, and empathetic. "
        "Remember previous parts of this conversation and maintain continuity."
    )
    
    return base_prompt


@app.post("/api/chat")
async def chat(request: Request):
    """
    Main chat endpoint for Petzy.
    Handles user messages, memory persistence, multilingual responses,
    context awareness, and model fallback between Groq → Ollama.
    """
    data = await request.json()
    user_message = data.get("message", "").strip()
    session_id = data.get("session_id", "default")
    requested_language = data.get("language", "auto")

    if not user_message:
        return {"error": "Empty message"}

    if session_id not in conversations:
        conversations[session_id] = []

    # --- Enhanced Language Detection ---
    # If user changes language in UI, respect that choice
    # Otherwise, detect from message content
    if requested_language != "auto":
        user_language = requested_language
    else:
        user_language = detect_language(user_message)

    # Extract and update context
    context = extract_context(user_message, session_id)

    # Add user message to conversation
    conversations[session_id].append({"role": "user", "content": user_message})

    # Keep conversation history manageable (last 20 messages)
    if len(conversations[session_id]) > 20:
        conversations[session_id] = conversations[session_id][-20:]

    # --- Rename Pattern Detection ---
    rename_patterns = [
        r"rename\s+(?:you\s+)?(?:as|to)?\s*([A-Za-z\u0900-\u097F\u0C80-\u0CFF]+)",
        r"call\s+(?:you\s+)?(?:as|to)?\s*([A-Za-z\u0900-\u097F\u0C80-\u0CFF]+)",
        r"(?:तुम्हारा नाम|तुझे)\s+([A-Za-z\u0900-\u097F]+)",
        r"(?:ನಿನ್ನ ಹೆಸರು)\s+([A-Za-z\u0C80-\u0CFF]+)",
    ]
    new_name = None
    for pat in rename_patterns:
        m = re.search(pat, user_message, re.I)
        if m:
            new_name = m.group(1).strip().capitalize()
            break

    if new_name:
        memory_store["pet_name"] = new_name
        save_memory()
        
        # Respond in user's language
        replies = {
            "hi-IN": f"ठीक है! अब से मुझे {new_name} बुलाओ। 😊",
            "kn-IN": f"ಸರಿ! ಈಗ ನನ್ನನ್ನು {new_name} ಎಂದು ಕರೆಯಿರಿ. 😊",
            "ta-IN": f"சரி! இனி என்னை {new_name} என்று அழையுங்கள். 😊",
            "te-IN": f"సరే! ఇప్పుడు నన్ను {new_name} అని పిలవండి. 😊",
            "en-IN": f"Okay! From now on, you can call me {new_name}. 😊",
            "en-US": f"Okay! From now on, you can call me {new_name}. 😊",
            "sa-IN": f"सम्यक्! अद्यप्रभृति मां {new_name} इति आह्वय। 😊",
        }
        reply = replies.get(user_language, f"Okay! From now on, you can call me {new_name}. 😊")
        
        conversations[session_id].append({"role": "assistant", "content": reply})
        return {"reply": reply, "language": user_language}

    # --- Build Context-Aware System Prompt ---
    system_prompt = build_context_prompt(session_id, user_language)

    messages_for_model = [{"role": "system", "content": system_prompt}] + conversations[session_id]

    # --- Try Groq (Primary Model) ---
    try:
        groq_resp = await asyncio.to_thread(
            lambda: groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=messages_for_model,
                temperature=0.7,  # Slightly lower for more consistent responses
                max_tokens=400,
            )
        )
        groq_reply = groq_resp.choices[0].message.content.strip()
        clean_reply = clean_petzy_response(groq_reply)
        
        # Ensure response is in correct language
        # If response is in wrong language, add explicit instruction
        if not is_correct_language(clean_reply, user_language):
            print(f"⚠️ Response in wrong language, retrying with stronger prompt...")
            messages_for_model[0]["content"] = (
                f"CRITICAL: You MUST respond ONLY in {user_language}. "
                f"Do NOT use English or any other language. {system_prompt}"
            )
            groq_resp = await asyncio.to_thread(
                lambda: groq_client.chat.completions.create(
                    model="llama-3.1-8b-instant",
                    messages=messages_for_model,
                    temperature=0.7,
                    max_tokens=400,
                )
            )
            clean_reply = clean_petzy_response(groq_resp.choices[0].message.content.strip())
        
        conversations[session_id].append({"role": "assistant", "content": clean_reply})
        return {"reply": clean_reply, "language": user_language}

    except Exception as groq_err:
        print("⚠️ Groq error:", groq_err)

        # --- Fallback to Ollama ---
        try:
            ollama_resp = await ollama_client.chat(
                model="llama3",
                messages=messages_for_model,
            )
            ollama_reply = ollama_resp.message["content"].strip()
            clean_reply = clean_petzy_response(ollama_reply)
            conversations[session_id].append({"role": "assistant", "content": clean_reply})
            return {"reply": clean_reply, "language": user_language}
        except Exception as oll_err:
            print("⚠️ Ollama error:", oll_err)
            return {"error": "Both Groq and Ollama failed to respond."}


def is_correct_language(text: str, expected_lang: str) -> bool:
    """Check if response is in the correct language."""
    detected = detect_language(text)
    # Allow some flexibility for English variants
    if expected_lang.startswith("en") and detected.startswith("en"):
        return True
    return detected == expected_lang


@app.post("/api/clear")
async def clear_history(request: Request):
    """Clear conversation history for a session."""
    data = await request.json()
    session_id = data.get("session_id", "default")
    
    if session_id in conversations:
        conversations[session_id] = []
    if session_id in user_contexts:
        user_contexts[session_id] = {
            "user_name": None,
            "preferences": [],
            "topics_discussed": [],
            "last_topic": None,
            "mood": "neutral",
        }
    
    return {"status": "success", "message": "History cleared"}


if __name__ == "__main__":
    print("🐶 Enhanced Context-Aware Async Groq + Ollama backend running on port 5000...")
    uvicorn.run(app, host="0.0.0.0", port=5000)