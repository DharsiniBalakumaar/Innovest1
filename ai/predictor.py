from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np

app = FastAPI(title="Hybrid Startup Intelligence API")

xai_model       = joblib.load("xai_model.pkl")
shap_explainer  = joblib.load("shap_explainer.pkl")
forecast_model  = joblib.load("forecast_model.pkl")

# ==============================
# REQUEST MODEL
# ==============================

class IdeaAnalysisRequest(BaseModel):
    age_first_funding_year: float
    age_last_funding_year:  float
    relationships:          int
    funding_rounds:         int
    funding_total_usd:      float
    milestones:             int
    is_CA:                  int
    is_web:                 int
    founded_year:           int
    stage:  str = "Idea"
    domain: str = "General"


# ==============================
# STAGE BASELINE FLOORS
# ==============================
# Instead of crushing every idea to 5%, each stage has a realistic
# MINIMUM score that reflects what "just being at that stage" means.
# Source reasoning:
#   Idea      → ~10–25% of ideas ever get traction   → floor 15%
#   Prototype → builder has shipped something         → floor 25%
#   MVP       → live product, some users              → floor 35%
#   Live      → revenue / customers exist             → floor 45%

STAGE_FLOOR = {
    "Idea":      0.15,
    "Prototype": 0.25,
    "MVP":       0.35,
    "Live":      0.45,
}

# Maximum penalty that can ever be applied (as a fraction of the raw score).
# This stops a pile-up of penalties from killing a 56% raw score to 5%.
# We never take more than 40% away from the raw score.
MAX_PENALTY_FRACTION = 0.40


# ==============================
# REALITY CHECK LAYER  (improved)
# ==============================

def apply_reality_check(base_prob: float, data: IdeaAnalysisRequest):
    """
    Applies calibrated, non-stacking penalties to the raw ML score.

    KEY CHANGES vs original:
    1. Each penalty is SMALLER — they are risk flags, not death sentences.
    2. Penalties do NOT stack blindly — total penalty is capped at
       MAX_PENALTY_FRACTION of the raw score (40%).
    3. Every stage has a FLOOR score so even the worst Idea still shows
       something meaningful (15%) rather than 5%.
    4. Bonuses are added for positive signals (MVP+, high relationships,
       multiple funding rounds) to balance the picture.
    5. Edtech penalty is context-aware — only applies if also low-funded.
    """

    individual_penalties = []
    bonuses              = []
    warnings             = []

    # ── PENALTIES ──────────────────────────────────────────────────

    # Stage penalty: only Idea and early Prototype get a penalty.
    # MVP/Live are already positive signals — no extra penalty.
    if data.stage == "Idea":
        individual_penalties.append(0.08)
        warnings.append(
            "Idea stage: no execution proven yet. "
            "Score reduced by 8% to reflect early-stage uncertainty. "
            "Idea-stage ideas can absolutely succeed — this is a caution flag, not a verdict."
        )
    elif data.stage == "Prototype" and data.milestones <= 1:
        individual_penalties.append(0.05)
        warnings.append(
            "Prototype with limited milestones — product-market fit is still being validated. "
            "Score reduced by 5%."
        )

    # Funding penalty: only for critically low funding
    if data.funding_total_usd < 50000:          # < ~₹42L — very critical
        individual_penalties.append(0.10)
        warnings.append(
            "Very low funding (< ₹42L). High risk of runway shortage before traction. "
            "Score reduced by 10%."
        )
    elif data.funding_total_usd < 100000:        # < ~₹83L — low but not fatal
        individual_penalties.append(0.05)
        warnings.append(
            "Low funding (< ₹83L). May struggle to reach product-market fit. "
            "Score reduced by 5%."
        )

    # High-burn domain + very low funding (only applies if BOTH conditions true)
    high_burn_domains = ["Edtech", "Fintech", "Healthcare"]
    if data.domain in high_burn_domains and data.funding_total_usd < 200000:
        individual_penalties.append(0.05)
        warnings.append(
            f"{data.domain} requires higher capital for compliance and customer acquisition. "
            "Score reduced by 5% due to domain-funding mismatch."
        )

    # Edtech market correction — ONLY if already low-funded (not a blanket penalty)
    if data.domain == "Edtech" and data.funding_total_usd < 200000:
        individual_penalties.append(0.03)
        warnings.append(
            "Edtech sector has seen valuation corrections post-2022. "
            "Score reduced by 3% — differentiated models can still thrive."
        )

    # Weak network — only flag if very low
    if data.relationships <= 2:
        individual_penalties.append(0.05)
        warnings.append(
            "Very limited founder network (≤2 connections). "
            "Score reduced by 5% — strong networks significantly speed up fundraising."
        )

    # ── BONUSES ────────────────────────────────────────────────────
    # Give credit for positive signals to balance the penalties.

    if data.stage in ("MVP", "Live"):
        bonuses.append(0.05)

    if data.milestones >= 3:
        bonuses.append(0.04)

    if data.funding_rounds >= 2:
        bonuses.append(0.04)

    if data.relationships >= 10:
        bonuses.append(0.04)
    elif data.relationships >= 5:
        bonuses.append(0.02)

    if data.is_web == 1:
        bonuses.append(0.02)

    # ── APPLY WITH CAP ─────────────────────────────────────────────

    total_penalty = sum(individual_penalties)
    total_bonus   = sum(bonuses)

    # Cap: total penalty can never exceed MAX_PENALTY_FRACTION of raw score
    max_allowed_penalty = base_prob * MAX_PENALTY_FRACTION
    total_penalty = min(total_penalty, max_allowed_penalty)

    adjusted = base_prob - total_penalty + total_bonus

    # Apply stage floor — score can never go below the stage minimum
    stage_floor = STAGE_FLOOR.get(data.stage, 0.15)
    if adjusted < stage_floor:
        warnings.append(
            f"Score floored at {int(stage_floor*100)}% — the minimum realistic baseline "
            f"for a {data.stage}-stage startup with a submitted idea."
        )
        adjusted = stage_floor

    # Hard cap at 95% — nothing is certain
    adjusted = min(adjusted, 0.95)
    adjusted = round(adjusted, 4)

    return adjusted, warnings


# ==============================
# STRATEGIC RULE ENGINE  (improved)
# ==============================

def strategic_rule_engine(data: IdeaAnalysisRequest, adjusted_prob: float):
    """
    More nuanced labelling — no idea should be labelled purely as 'high risk'
    without also acknowledging upside potential.
    """
    if data.stage == "Live" and data.milestones >= 3:
        return "Proven Traction — Investment Ready"
    elif data.stage == "MVP" and adjusted_prob >= 0.50:
        return "Strong Growth Momentum"
    elif data.milestones >= 4 and data.funding_rounds >= 2:
        return "Strong Growth Momentum"
    elif data.relationships > 15:
        return "Strong Network Advantage"
    elif data.funding_total_usd < 100000 and data.stage == "Idea":
        return "Early Idea — Needs Funding & Validation"   # less alarming label
    elif data.funding_total_usd < 200000:
        return "Underfunded — Seek Early Capital"          # actionable, not a verdict
    elif adjusted_prob < 0.35:
        return "High Risk — Needs Validation"
    elif adjusted_prob < 0.55:
        return "Moderate Potential — Watch for Traction"
    else:
        return "Moderate Growth Potential"


# ==============================
# PREDICTION ENDPOINT
# ==============================

@app.post("/predict")
def predict(data: IdeaAnalysisRequest):

    feature_names = [
        "age_first_funding_year",
        "age_last_funding_year",
        "relationships",
        "funding_rounds",
        "funding_total_usd",
        "milestones",
        "is_CA",
        "is_web",
    ]

    input_values = [
        data.age_first_funding_year,
        data.age_last_funding_year,
        data.relationships,
        data.funding_rounds,
        data.funding_total_usd,
        data.milestones,
        data.is_CA,
        data.is_web,
    ]

    input_df = pd.DataFrame([input_values], columns=feature_names)

    # ── ML Prediction (raw) ──
    raw_prob = xai_model.predict_proba(input_df)[0][1]

    # ── Reality Check Layer ──
    adjusted_prob, warnings = apply_reality_check(float(raw_prob), data)

    # ── SHAP Explanation ──
    shap_values = shap_explainer(input_df)
    raw_shap = shap_values.values  # shape: (1, n_features) or (1, n_features, n_classes)
    print(f"[SHAP DEBUG] raw_shap.shape = {raw_shap.shape}, dtype = {raw_shap.dtype}")

    # Binary classifier TreeExplainer often returns shape (1, n_features, 2)
    # We always want the SHAP values for class 1 (positive/success class)
    if raw_shap.ndim == 3:
        # shape (1, n_features, 2) → take class 1 → shape (1, n_features)
        shap_vals = raw_shap[0, :, 1]
    elif raw_shap.ndim == 2:
        # shape (1, n_features) — already correct
        shap_vals = raw_shap[0]
    else:
        # Fallback: flatten whatever we get
        shap_vals = raw_shap.flatten()[:len(feature_names)]

    shap_dict = {
        feature: float(val)
        for feature, val in zip(feature_names, shap_vals)
    }

    sorted_explanation = dict(
        sorted(shap_dict.items(), key=lambda x: abs(x[1]), reverse=True)
    )

    # ── Market Forecast ──
    future_years = np.array([
        [data.founded_year + 2],
        [data.founded_year + 5]
    ])
    valuation_predictions = forecast_model.predict(future_years)

    # ── Strategic Label ──
    strategic_label = strategic_rule_engine(data, adjusted_prob)

    # ── Penalty breakdown for frontend transparency ──
    penalty_applied  = round((float(raw_prob) - adjusted_prob) * 100, 2)
    # (negative means bonuses exceeded penalties)

    return {
        "success_probability_percent":  round(adjusted_prob * 100, 2),
        "raw_model_score":              round(float(raw_prob) * 100, 2),
        "penalty_applied_percent":      penalty_applied,
        "stage_floor_percent":          int(STAGE_FLOOR.get(data.stage, 0.15) * 100),
        "model_warnings":               warnings,
        "explanation_sorted_by_impact": sorted_explanation,
        "market_forecast": {
            "valuation_in_2_years": round(float(valuation_predictions[0]), 2),
            "valuation_in_5_years": round(float(valuation_predictions[1]), 2),
        },
        "strategic_assessment": strategic_label
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
