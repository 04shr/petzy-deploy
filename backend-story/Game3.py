# Game3.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os
import random
import asyncio

# ------------------ Load environment variables ------------------ #
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# ------------------ FastAPI setup ------------------ #
app = FastAPI()

# ✅ Allow requests from React Game3 on port 5001 (and main app if needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5001",
        "https://petzygo.netlify.app",   # ✅ your live frontend
        "https://*.netlify.app"          # optional wildcard
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.options("/generate_story")
async def options_handler():
    return {}


# ------------------ Request body schema ------------------ #
class StoryRequest(BaseModel):
    prompt: str

# ------------------ Groq models ------------------ #
GROQ_MODELS = ["llama-3.1-8b-instant", "mixtral-3b-instant"]

# ------------------ Fallback story generator ------------------ #
def dynamic_fallback(prompt: str):
    endings = [
        "The sunset painted the sky in colors of farewell, yet hope lingered in every heartbeat.",
        "Memories danced like fireflies, gentle reminders that some stories never truly end.",
        "I took a deep breath and smiled, knowing that even lost moments leave lasting warmth.",
        "The waves whispered secrets of past joys, and I realized some stories are forever alive.",
        "In that quiet moment, I understood that love, once felt, never truly fades."
    ]
    base_story = (
        f"{prompt} As I pause, the world softens around me. "
        "Time feels still, and echoes of past laughter drift gently. "
        f"{random.choice(endings)}"
    )
    return base_story[:1200]  # roughly 200-250 words

# ------------------ Groq async call ------------------ #
async def try_groq_model(model_name: str, prompt: str):
    try:
        from groq import Groq
        client = Groq(api_key=GROQ_API_KEY)
        completion = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": "You are a poetic storyteller. Continue the user’s story vividly and emotionally, complete in 200–250 words."},
                {"role": "user", "content": f"Continue and complete this story:\n{prompt}"}
            ],
            temperature=0.8,
            max_tokens=350
        )
        return completion.choices[0].message.content.strip()
    except Exception as e:
        print(f"❌ Groq {model_name} failed: {e}")
        return None

# ------------------ OpenAI async call ------------------ #
async def try_openai(prompt: str):
    try:
        from openai import OpenAI
        client = OpenAI(api_key=OPENAI_API_KEY)
        completion = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a poetic storyteller. Continue the user’s story vividly and emotionally, complete in 200–250 words."},
                {"role": "user", "content": f"Continue and complete this story:\n{prompt}"}
            ],
            temperature=0.8,
            max_tokens=350
        )
        return completion.choices[0].message.content.strip()
    except Exception as e:
        print(f"❌ OpenAI failed: {e}")
        return None

# ------------------ Main endpoint ------------------ #
@app.post("/generate_story")
async def generate_story(req: StoryRequest):
    prompt = req.prompt.strip()
    if not prompt:
        return {"story": "Please provide a story prompt.", "model_used": "none"}

    print(f"\n🧠 Prompt received: {prompt}")

    # 1️⃣ Try Groq models first
    for model in GROQ_MODELS:
        story = await try_groq_model(model, prompt)
        if story:
            print(f"✅ Story generated using Groq model: {model}")
            return {"story": story, "model_used": f"groq-{model}"}

    # 2️⃣ Try OpenAI next
    story = await try_openai(prompt)
    if story:
        print("✅ Story generated using OpenAI GPT-3.5-turbo")
        return {"story": story, "model_used": "openai-gpt-3.5-turbo"}

    # 3️⃣ Use fallback if all fail
    fallback_story = dynamic_fallback(prompt)
    print("⚠️ All AI models failed. Using fallback story.")
    return {"story": fallback_story, "model_used": "fallback"}


# ------------------ Run with uvicorn ------------------ #
# uvicorn Game3:app --reload --port 5001
