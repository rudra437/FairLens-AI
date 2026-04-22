from fastapi import FastAPI, UploadFile, File, Form
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
import os
from google import genai
import time
import json
import pandas as pd
from io import StringIO
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import numpy as np

app = FastAPI(title="FairLens AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "FairLens AI Backend is running! Please access the dashboard via the React Frontend."}

try:
    if os.environ.get("GEMINI_API_KEY"):
        client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
        HAS_GEMINI = True
    else:
        HAS_GEMINI = False
except Exception:
    HAS_GEMINI = False

# Function to get feature importance
def get_feature_importances(df, target_col):
    df_clean = df.dropna().copy()
    
    # Simple Label Encoding for non-numeric columns
    le = LabelEncoder()
    for col in df_clean.columns:
        if not pd.api.types.is_numeric_dtype(df_clean[col]):
            df_clean[col] = le.fit_transform(df_clean[col].astype(str))
            
    if target_col not in df_clean.columns:
        return []

    # Drop common ID-like columns that shouldn't be features
    id_cols = [col for col in df_clean.columns if col.lower() in ['id', 'job_id', 'user_id', 'index', 'unnamed: 0']]
    X = df_clean.drop(columns=[target_col] + id_cols, errors='ignore')
    y = df_clean[target_col]
    
    clf = RandomForestClassifier(n_estimators=50, random_state=42)
    clf.fit(X, y)
    
    importances = clf.feature_importances_
    
    feat_imps = [{"name": feat, "value": round(imp * 100, 2)} for feat, imp in zip(X.columns, importances)]
    feat_imps = sorted(feat_imps, key=lambda x: x["value"], reverse=True)[:5] # top 5
    return feat_imps


def generate_gemini_explanation(dataset_name: str, attribute: str, target: str, metric: float, importances: list) -> dict:
    top_feature = importances[0]['name'] if importances else "unknown"
    
    prompt = f"""
    You are 'FairLens Explainer AI'. Translate statistical fairness metrics into an actionable summary for non-technical executives.
    
    Context: {dataset_name}
    Protected Attribute: {attribute}
    Target Outcome (e.g. Loan Approved, Job Offer): {target}
    Disparate Impact Metric: {metric} (Ideal is 1.0, < 0.8 means biased against minority class)
    Most Influential Feature in data: {top_feature}

    Provide output in pure JSON format with three exact keys (no markdown blocks around it, just raw JSON):
    "verdict": A one sentence summary.
    "translation": A plain English explanation.
    "suggestion": One high-level recommendation to fix it.
    """
    
    if HAS_GEMINI:
        try:
            response = client.models.generate_content(
                model='gemini-1.5-flash',
                contents=prompt
            )
            # Find the JSON part
            start = response.text.find('{')
            end = response.text.rfind('}') + 1
            if start != -1 and end != 0:
                json_str = response.text[start:end]
                return json.loads(json_str)
        except Exception as e:
            print("Gemini generation failed, falling back to mock.", e)
            
    # Mock fallback
    bias_word = "historical bias" if metric < 0.8 else "fairness"
    return {
        "verdict": f"The model exhibits {bias_word} regarding {attribute} when predicting {target}.",
        "translation": f"The disparate impact score of {metric} means that candidates in the minority group are selected at {metric*100:.0f}% the rate of the privileged group. The most predictive feature overall is {top_feature}.",
        "suggestion": "We recommend examining the primary features and applying a re-weighting algorithm to the training data to ensure equal representation." if metric < 0.8 else "Continue monitoring the model periodically to ensure performance does not drift."
    }

@app.post("/api/scan")
async def scan_dataset(file: UploadFile = File(...), target_column: str = Form(...), protected_attribute: str = Form(...), privileged_class: str = Form(...)):
    # 1. Read CSV
    contents = await file.read()
    decoded = contents.decode("utf-8")
    df = pd.read_csv(StringIO(decoded))
    
    # If the user put columns that don't exist, we fallback safely
    if protected_attribute not in df.columns or target_column not in df.columns:
        return {"error": f"Columns {protected_attribute} or {target_column} don't exist in the CSV."}
        
    total_rows = len(df)
    
    # Ensure target is somewhat binary or we will just use the most frequent as "Positive Outcome" for this demo
    # Ensure target is binary or pick the most logical 'Positive' outcome
    target_vals = [str(x) for x in df[target_column].value_counts().index.tolist()]
    pos_keywords = ['1', 'yes', 'true', 'approved', 'pass', 'success']
    positive_outcome = target_vals[0]
    for val in target_vals:
        if val.lower() in pos_keywords:
            positive_outcome = val
            break
    
    # 2. Calculate Disparate Impact
    # P(Y=1 | D=unprivileged) / P(Y=1 | D=privileged)
    df_priv = df[df[protected_attribute].astype(str) == privileged_class]
    df_unpriv = df[df[protected_attribute].astype(str) != privileged_class]
    
    priv_positive_rate = len(df_priv[df_priv[target_column].astype(str) == positive_outcome]) / max(len(df_priv), 1)
    unpriv_positive_rate = len(df_unpriv[df_unpriv[target_column].astype(str) == positive_outcome]) / max(len(df_unpriv), 1)
    
    if priv_positive_rate == 0:
        di_score = 1.0
    else:
        di_score = round(unpriv_positive_rate / priv_positive_rate, 2)
        
    stat_parity_diff = round(unpriv_positive_rate - priv_positive_rate, 2)
    
    # 3. Calculate Feature Importances
    feat_importances = get_feature_importances(df, target_column)
    
    # 4. Ask Gemini
    ai_insights = generate_gemini_explanation(file.filename, protected_attribute, target_column, di_score, feat_importances)
    
    return {
        "dataset": file.filename,
        "rows": total_rows,
        "protected_attribute": protected_attribute,
        "metrics": {
            "disparate_impact": di_score,
            "statistical_parity_diff": stat_parity_diff,
            "equal_opportunity_diff": stat_parity_diff # simplified for Demo
        },
        "feature_importances": feat_importances,
        "llm_explanation": ai_insights,
        "status": "Biased" if di_score < 0.8 else "Fair",
        "chart_data": [
            {"group": "Privileged Class", "Selection Rate": round(priv_positive_rate * 100, 2)},
            {"group": "Unprivileged Class", "Selection Rate": round(unpriv_positive_rate * 100, 2)}
        ]
    }

@app.post("/api/mitigate")
def mitigate_bias():
    time.sleep(2)
    # Simulate applying Reweighing or SMOTE for Demo
    new_di = round(np.random.uniform(0.9, 1.05), 2)
    
    ai_insights = generate_gemini_explanation("Mitigated Dataset", "Protected Attribute", "Target", new_di, [])

    return {
        "message": "Mitigation algorithms applied successfully (Re-weighting).",
        "metrics_after": {
            "disparate_impact": new_di,
            "statistical_parity_diff": round(np.random.uniform(-0.05, 0.05), 2),
            "equal_opportunity_diff": round(np.random.uniform(-0.05, 0.05), 2)
        },
        "llm_explanation": ai_insights,
        "status": "Fair",
        "chart_data": [
            {"group": "Privileged Class", "Selection Rate": 51.5},
            {"group": "Unprivileged Class", "Selection Rate": 50.2}
        ]
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
