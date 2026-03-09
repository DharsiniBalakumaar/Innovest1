from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np

app = FastAPI(title="Hybrid Startup Intelligence API")

xai_model = joblib.load("xai_model.pkl")
shap_explainer = joblib.load("shap_explainer.pkl")
forecast_model = joblib.load("forecast_model.pkl")

# ==============================
# REQUEST MODEL
# ==============================

class IdeaAnalysisRequest(BaseModel):
    age_first_funding_year: float
    age_last_funding_year: float
    relationships: int
    funding_rounds: int
    funding_total_usd: float
    milestones: int
    is_CA: int
    is_web: int
    founded_year: int
    stage: str = "Idea"      # NEW — passed from Node route
    domain: str = "General"  # NEW — passed from Node route


# ==============================
# REALITY CHECK LAYER
# ==============================

def apply_reality_check(base_prob: float, data: IdeaAnalysisRequest):
    """
    The ML model is trained on 'acquired' = success which causes overconfidence.
    This layer applies evidence-based penalties to produce a realistic score.
    """
    penalty = 0.0
    warnings = []

    # Penalty 1: Pure idea stage — no execution proven
    if data.stage == "Idea":
        penalty += 0.18
        warnings.append(
            "Idea-stage startups have a historical success rate below 10%. "
            "The AI model is adjusted downward to reflect that no execution has been proven yet."
        )

    # Penalty 2: Prototype but low milestones
    elif data.stage == "Prototype" and data.milestones <= 1:
        penalty += 0.10
        warnings.append(
            "Prototype stage with no significant milestones — product-market fit is still unvalidated."
        )

    # Penalty 3: Very low funding — underfunded startups fail fast
    if data.funding_total_usd < 100000:
        penalty += 0.12
        warnings.append(
            "Funding is critically low (< ₹83L). Most startups at this level run out of runway "
            "before reaching product-market fit."
        )

    # Penalty 4: High-burn domains (Edtech, Fintech) with low funding
    high_burn_domains = ["Edtech", "Fintech", "Healthcare"]
    if data.domain in high_burn_domains and data.funding_total_usd < 500000:
        penalty += 0.08
        warnings.append(
            f"{data.domain} startups typically require heavy investment in compliance, "
            "customer acquisition, and infrastructure. Current funding may be insufficient."
        )

    # Penalty 5: Edtech-specific — post-COVID market correction warning
    if data.domain == "Edtech":
        penalty += 0.06
        warnings.append(
            "The Edtech sector has seen major corrections post-2022 (e.g., Byju's, Unacademy). "
            "High growth metrics do not guarantee sustainable business models in this space."
        )

    # Penalty 6: No relationships = weak network
    if data.relationships <= 3:
        penalty += 0.07
        warnings.append(
            "Weak founder network detected. Startups with limited investor/advisor relationships "
            "take 2–3x longer to close funding rounds."
        )

    # Hard cap — idea-stage startups should never exceed 60% regardless
    adjusted = base_prob - penalty
    if data.stage == "Idea" and adjusted > 0.60:
        adjusted = 0.60
        warnings.append(
            "Score capped at 60% — statistical data shows idea-stage startups rarely exceed "
            "this threshold for realistic success probability."
        )

    adjusted = max(0.05, round(adjusted, 4))
    return adjusted, warnings


# ==============================
# RULE-BASED STRATEGIC LAYER
# ==============================

def strategic_rule_engine(data: IdeaAnalysisRequest, adjusted_prob: float):
    if data.stage == "Idea" and data.milestones <= 1:
        return "Early Idea — High Risk"
    elif data.milestones >= 4 and data.funding_rounds >= 2:
        return "Strong Growth Momentum"
    elif data.funding_total_usd < 200000:
        return "Underfunded Risk"
    elif data.relationships > 15:
        return "Strong Network Advantage"
    elif adjusted_prob < 0.40:
        return "High Risk — Needs Validation"
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

    # ML Prediction (raw)
    raw_prob = xai_model.predict_proba(input_df)[0][1]

    # Reality Check Layer
    adjusted_prob, warnings = apply_reality_check(float(raw_prob), data)

    # SHAP Explanation
    shap_values = shap_explainer(input_df)
    shap_vals = shap_values.values[0]

    shap_dict = {
        feature: float(np.mean(val)) if hasattr(val, '__len__') else float(val)
        for feature, val in zip(feature_names, shap_vals)
    }

    sorted_explanation = dict(
        sorted(shap_dict.items(), key=lambda x: abs(x[1]), reverse=True)
    )

    # Market Forecast
    future_years = np.array([
        [data.founded_year + 2],
        [data.founded_year + 5]
    ])
    valuation_predictions = forecast_model.predict(future_years)

    # Strategic Label (uses adjusted prob)
    strategic_label = strategic_rule_engine(data, adjusted_prob)

    return {
        "success_probability_percent": round(adjusted_prob * 100, 2),
        "raw_model_score": round(float(raw_prob) * 100, 2),
        "model_warnings": warnings,
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
