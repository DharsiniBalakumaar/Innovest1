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


# ==============================
# RULE-BASED STRATEGIC LAYER
# ==============================

def strategic_rule_engine(data):
    if data.milestones >= 4 and data.funding_rounds >= 2:
        return "Strong Growth Momentum"
    elif data.funding_total_usd < 200000:
        return "Underfunded Risk"
    elif data.relationships > 15:
        return "Strong Network Advantage"
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

    # ML Prediction
    success_prob = xai_model.predict_proba(input_df)[0][1]

    # SHAP Explanation
    shap_values = shap_explainer(input_df)
    shap_values = shap_values.values[0]

    # Fix: flatten each value to a scalar
    shap_dict = {
        feature: float(np.mean(val)) if hasattr(val, '__len__') else float(val)
        for feature, val in zip(feature_names, shap_values)
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

    # Strategic Rule Layer
    strategic_label = strategic_rule_engine(data)

    return {
        "success_probability_percent": round(float(success_prob) * 100, 2),
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
