from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer, util
import os
from dotenv import load_dotenv
from pymongo import MongoClient

app = FastAPI()
load_dotenv()

model = SentenceTransformer("all-mpnet-base-v2")

MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client["test"]
ideas_collection = db["ideas"]

class IdeaInput(BaseModel):
    title: str
    problem: str
    solution: str


def analyze_innovation_score(new_idea, existing_idea):
    new_sol_emb  = model.encode(new_idea["solution"],  convert_to_tensor=True)
    ext_sol_emb  = model.encode(existing_idea.get("solution", ""),  convert_to_tensor=True)

    new_prob_emb = model.encode(new_idea["problem"],   convert_to_tensor=True)
    ext_prob_emb = model.encode(existing_idea.get("problem", ""),   convert_to_tensor=True)

    new_title_emb = model.encode(new_idea["title"],    convert_to_tensor=True)
    ext_title_emb = model.encode(existing_idea.get("title", ""),    convert_to_tensor=True)

    sol_sim   = util.cos_sim(new_sol_emb,   ext_sol_emb).item()
    prob_sim  = util.cos_sim(new_prob_emb,  ext_prob_emb).item()
    title_sim = util.cos_sim(new_title_emb, ext_title_emb).item()

    # Innovation shield: if solution is fundamentally different, not a duplicate
    if sol_sim < 0.40:
        return 0, sol_sim, prob_sim, title_sim

    # Weighted score: Solution 60%, Problem 25%, Title 15%
    weighted_score = (sol_sim * 0.60) + (prob_sim * 0.25) + (title_sim * 0.15)

    return weighted_score, sol_sim, prob_sim, title_sim


def build_reasons(sol_sim, prob_sim, title_sim, existing_title):
    """
    Returns a list of {section, score, reason} objects for the frontend charts.
    Scores are in 0-100 integer range.
    """

    def pct(val):
        return round(val * 100)

    def sol_reason(s):
        if s >= 0.85:
            return (
                f"The technical implementation is nearly identical to '{existing_title}'. "
                "Both use the same algorithmic approach, data pipeline, and system design."
            )
        if s >= 0.70:
            return (
                f"While worded differently, the solution architecture closely mirrors '{existing_title}'. "
                "The core technology stack and execution strategy overlap heavily."
            )
        return (
            "There is moderate overlap in the proposed solution. "
            "Consider a more novel technical approach or unique implementation method."
        )

    def prob_reason(s):
        if s >= 0.85:
            return (
                f"The problem being addressed is framed almost identically to '{existing_title}'. "
                "Same pain points, same affected audience, same urgency level."
            )
        if s >= 0.70:
            return (
                "The problem statement targets the same core issue. "
                "Try narrowing to a specific sub-problem or underserved user group."
            )
        return (
            "Some overlap in the problem domain but different enough in scope. "
            "Strengthen differentiation by focusing on a unique aspect of the problem."
        )

    def title_reason(s):
        if s >= 0.85:
            return (
                f"The idea title is semantically very close to '{existing_title}'. "
                "Both titles reference the same domain, technology, and purpose."
            )
        if s >= 0.70:
            return (
                "The title conveys a similar concept and value proposition. "
                "A more distinctive title would better reflect your unique angle."
            )
        return (
            "Minor title overlap — the naming convention is similar but acceptable. "
            "Consider a title that highlights your unique differentiator."
        )

    return [
        {
            "section": "Solution Architecture",
            "score": pct(sol_sim),
            "reason": sol_reason(sol_sim),
        },
        {
            "section": "Problem Statement",
            "score": pct(prob_sim),
            "reason": prob_reason(prob_sim),
        },
        {
            "section": "Idea Title",
            "score": pct(title_sim),
            "reason": title_reason(title_sim),
        },
    ]


@app.post("/check-duplicate")
def check_duplicate(idea: IdeaInput):
    all_ideas = list(ideas_collection.find({}, {"_id": 0}))

    if not all_ideas:
        return {"duplicate": False, "message": "First idea in this category!"}

    for existing in all_ideas:
        score, sol_sim, prob_sim, title_sim = analyze_innovation_score(
            {
                "title":    idea.title,
                "problem":  idea.problem,
                "solution": idea.solution,
            },
            existing,
        )

        if score >= 0.65:
            reasons = build_reasons(sol_sim, prob_sim, title_sim, existing.get("title", ""))

            return {
                "duplicate": True,
                # Send as 0-100 float so frontend doesn't need to multiply
                "similarity": round(score * 100, 1),
                "existing_title": existing.get("title"),
                "reasons": reasons,
                "analysis": {
                    "solution_overlap": "High" if sol_sim > 0.7 else "Moderate",
                    "problem_overlap":  "High" if prob_sim > 0.7 else "Moderate",
                },
            }

    return {
        "duplicate": False,
        "message": "Idea is unique in its implementation approach.",
    }