import pandas as pd
import numpy as np
import joblib
import shap
import xgboost as xgb

from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score, mean_squared_error

# ==============================
# PART 1 — MARKET TREND FORECAST
# ==============================

print("📈 Training Market Forecast Model...")

df_time = pd.read_csv("startup_data.csv")

yearly_valuation = (
    df_time.groupby("Year Founded")["Valuation (M USD)"]
    .mean()
    .reset_index()
)

X_time = yearly_valuation[["Year Founded"]]
y_time = yearly_valuation["Valuation (M USD)"]

X_train_time, X_test_time, y_train_time, y_test_time = train_test_split(
    X_time, y_time, test_size=0.2, random_state=42
)

forecast_model = LinearRegression()
forecast_model.fit(X_train_time, y_train_time)

y_pred_time = forecast_model.predict(X_test_time)
rmse = np.sqrt(mean_squared_error(y_test_time, y_pred_time))
print(f"📊 Forecast RMSE: {rmse:.2f}")

joblib.dump(forecast_model, "forecast_model.pkl")


# ==============================
# PART 2 — HYBRID SUCCESS MODEL
# ==============================

print("🚀 Training Hybrid Success Prediction Model...")

df_xai = pd.read_csv("startup_data_v2.csv")

df_xai["target"] = df_xai["status"].apply(
    lambda x: 1 if str(x).lower() == "acquired" else 0
)

features = [
    "age_first_funding_year",
    "age_last_funding_year",
    "relationships",
    "funding_rounds",
    "funding_total_usd",
    "milestones",
    "is_CA",
    "is_web",
]

X = df_xai[features].fillna(0)
y = df_xai["target"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# ------------------------------
# Model 1: Random Forest
# ------------------------------
rf_model = RandomForestClassifier(
    n_estimators=300,
    max_depth=None,
    random_state=42
)
rf_model.fit(X_train, y_train)

rf_probs = rf_model.predict_proba(X_test)[:, 1]
rf_auc = roc_auc_score(y_test, rf_probs)

print(f"🌲 Random Forest ROC-AUC: {rf_auc:.4f}")


# ------------------------------
# Model 2: XGBoost
# ------------------------------
xgb_model = xgb.XGBClassifier(
    n_estimators=300,
    learning_rate=0.05,
    max_depth=5,
    random_state=42,
    eval_metric="logloss"
)
xgb_model.fit(X_train, y_train)

xgb_probs = xgb_model.predict_proba(X_test)[:, 1]
xgb_auc = roc_auc_score(y_test, xgb_probs)

print(f"🚀 XGBoost ROC-AUC: {xgb_auc:.4f}")


# ------------------------------
# Auto Select Best Model
# ------------------------------
if rf_auc >= xgb_auc:
    best_model = rf_model
    model_name = "Random Forest"
else:
    best_model = xgb_model
    model_name = "XGBoost"

print(f"🏆 Selected Model: {model_name}")

# SHAP Explainer
explainer = shap.Explainer(best_model, X_train)

joblib.dump(best_model, "xai_model.pkl")
joblib.dump(explainer, "shap_explainer.pkl")

print("✅ Hybrid Training Complete.")
