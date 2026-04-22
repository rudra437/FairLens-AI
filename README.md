<div align="center">
  <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="Google Logo" width="50"/>
  <h1>FairLens AI</h1>
  <p><b>Enterprise AI Compliance & Bias Mitigation Platform</b></p>
  <p><i>Built for the Google Developer Student Clubs (GDSC) Solution Challenge</i></p>
</div>

---

## 🌍 The Problem (UN Sustainable Development Goals)
As AI systems increasingly control life-altering decisions—such as loan approvals, hiring, and criminal justice—algorithmic bias can unintentionally discriminate against marginalized groups. 

**FairLens AI** directly addresses **UN SDG 10 (Reduced Inequalities)** by providing developers and enterprise compliance officers with the tools to audit, understand, and mitigate bias in their machine learning datasets before deployment.

## ✨ Key Features
- 📊 **Automated Fairness Auditing:** Upload a dataset and instantly calculate key statistical metrics like the **Disparate Impact Score**.
- 🧠 **Google Gemini Insights:** Translates complex mathematical bias metrics into a plain-English "Executive Summary" for non-technical stakeholders.
- 🌲 **Feature Importance Analysis:** Uses a backend Random Forest classifier to detect if an AI is secretly relying on protected attributes (like gender or race) instead of valid metrics (like credit score).
- ⚡ **1-Click Auto-Mitigation:** Simulates data re-weighting algorithms to show how a dataset can be balanced to pass compliance standards (e.g., EU AI Act).
- 📄 **Compliance Reporting:** Export the entire visual dashboard, charts, and Gemini insights as a PDF Audit Report.

## 💻 Technology Stack
**Frontend:**
*   React + Vite
*   Lucide React (Icons)
*   Recharts (Data Visualization)
*   Vanilla CSS (Glassmorphism UI)

**Backend:**
*   FastAPI (Python)
*   Google GenAI SDK (Gemini 1.5 Flash)
*   Scikit-Learn (Random Forest)
*   Pandas & NumPy

## 🚀 How to Run Locally

### 1. Start the Python Backend
Open a terminal and run the following:
```bash
cd backend
pip install -r requirements.txt
# (Optional) Set your GEMINI_API_KEY environment variable for live AI insights
python main.py
```
*The API will run on http://localhost:8000*

### 2. Start the React Frontend
Open a **new** terminal and run:
```bash
cd frontend
npm install
npm run dev
```
*The Web App will run on http://localhost:5173*

## 🧪 How to Test the Demo
1. Open the web app and click **Continue with Google Firebase**.
2. Under Data Ingestion, upload the `test_data.csv` (located in the root folder).
3. Set the configurations:
   * **Target Outcome Column:** `loan_approved`
   * **Protected Attribute:** `gender`
   * **Privileged Class Value:** `Male`
4. Click **Run Fairness Audit** and observe the Gemini AI Report!

---
*Developed with ❤️ for the GDG Solution Challenge.*
