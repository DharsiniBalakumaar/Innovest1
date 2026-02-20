from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer, util
import torch
import pymongo
import os
from dotenv import load_dotenv
from pymongo import MongoClient

app = FastAPI()
load_dotenv()

# Load SBERT model (lightweight + fast)
model = SentenceTransformer("all-mpnet-base-v2")

# MongoDB connection
MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client["test"]  # change if your DB name differs
ideas_collection = db["ideas"]

class IdeaInput(BaseModel):
    title: str
    problem: str
    solution: str

@app.post("/check-duplicate")
def check_duplicate(idea: IdeaInput):
    print("Called")
    new_text = f"{idea.title}. {idea.problem}. {idea.solution}"
    new_embedding = model.encode(new_text, convert_to_tensor=True)

    all_ideas = list(ideas_collection.find({}, {"_id": 0}))
    print(f"📦 Found {len(all_ideas)} ideas in DB")

    if not all_ideas:
        return {"duplicate": False}

    for existing in all_ideas:
        print(f"  - {existing.get('title')}") 
        existing_text = f"{existing.get('title','')}. {existing.get('problem','')}. {existing.get('solution','')}"
        existing_embedding = model.encode(existing_text, convert_to_tensor=True)
        
        similarity = util.cos_sim(new_embedding, existing_embedding).item()
        
        # Also check title alone
        title_embedding = model.encode(idea.title, convert_to_tensor=True)
        existing_title_embedding = model.encode(existing.get('title', ''), convert_to_tensor=True)
        title_similarity = util.cos_sim(title_embedding, existing_title_embedding).item()

        # Flag if EITHER full text OR title is too similar
        if similarity >= 0.60 or title_similarity >= 0.70:
            return {
                "duplicate": True,
                "similarity": round(max(similarity, title_similarity), 4),
                "existing_title": existing.get("title")
            }
        print(f"Similarity: {similarity:.4f} | Title similarity: {title_similarity:.4f} | vs: {existing.get('title')}")

    return {"duplicate": False}
