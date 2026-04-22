import React, { useState, useRef } from 'react'
import { Activity, ShieldCheck, ShieldAlert, Zap, Search, Fingerprint, Upload, Download, LogIn, LogOut, BarChart2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import html2pdf from 'html2pdf.js'
import './index.css'

function App() {
  const [user, setUser] = useState(null) // Mock Firebase Auth state
  const [loading, setLoading] = useState(false)
  const [mitigating, setMitigating] = useState(false)
  const [data, setData] = useState(null)
  
  // Form State
  const [file, setFile] = useState(null)
  const [targetCol, setTargetCol] = useState('approved')
  const [protectedAttr, setProtectedAttr] = useState('gender')
  const [privClass, setPrivClass] = useState('Male')

  const reportRef = useRef(null)

  const handleLogin = () => {
    // In a real app, this would be: signInWithPopup(auth, provider)
    setUser({ name: "Admin (GDG Judge)", role: "Data Protection Officer" })
  }

  const exportPDF = () => {
    if (!reportRef.current) return
    const opt = {
      margin:       1,
      filename:     'FairLens_Audit_Report.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    }
    html2pdf().set(opt).from(reportRef.current).save()
  }

  const scanDataset = async (e) => {
    e.preventDefault()
    if (!file) {
      alert("Please upload a CSV dataset first.")
      return
    }

    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('target_column', targetCol)
    formData.append('protected_attribute', protectedAttr)
    formData.append('privileged_class', privClass)

    try {
      const res = await fetch('http://localhost:8000/api/scan', {
        method: 'POST',
        body: formData
      })
      if (!res.ok) throw new Error('Backend not reachable')
      const json = await res.json()
      if (json.error) {
        alert("Error: " + json.error)
        setLoading(false)
        return
      }
      setData(json)
    } catch (error) {
      console.warn("Backend fetch failed, ensure backend is running.", error)
      alert("Failed to connect to Python backend at localhost:8000. Ensure it is running and the CSV matches the column names.")
    }
    setLoading(false)
  }

  const mitigateBias = async () => {
    setMitigating(true)
    try {
      const res = await fetch('http://localhost:8000/api/mitigate', { method: 'POST' })
      if (!res.ok) throw new Error('Backend not reachable')
      const json = await res.json()
      setData(prev => ({
        ...prev,
        ...json,
        metrics: json.metrics_after,
        dataset: "Mitigated_Dataset.csv",
        chart_data: json.chart_data,
        feature_importances: [] // Clear because we didn't mock re-calculating this
      }))
    } catch (error) {
       console.warn("Backend fetch failed", error)
    }
    setMitigating(false)
  }

  if (!user) {
    return (
      <div className="login-container">
        <div className="glass-card login-card">
          <h1 className="title" style={{ fontSize: '2.5rem', textAlign: 'center' }}>FairLens AI</h1>
          <p className="subtitle" style={{ textAlign: 'center', marginBottom: '2rem' }}>Enterprise AI Compliance Platform</p>
          <button className="btn" onClick={handleLogin}>
            <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" width="20" alt="G" style={{ background:'white', borderRadius:'50%', padding:'2px' }}/> 
            Continue with Google Firebase
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <div>
          <h1 className="title" style={{ fontSize: '2rem', marginBottom: 0 }}>FairLens AI</h1>
          <span style={{ fontSize: '0.8rem', background: 'rgba(139, 92, 246, 0.2)', padding: '2px 8px', borderRadius: '12px', color: 'var(--accent-purple)' }}>EU AI Act Compliant</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>{user.name}</span>
          <button onClick={() => setUser(null)} className="btn-icon" title="Logout"><LogOut size={18} /></button>
        </div>
      </nav>

      <div className="grid-layout">
        {/* Left Column: Actions & Configuration */}
        <div className="glass-card">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Upload color="var(--accent-blue)" /> Data Ingestion
          </h2>
          
          <form onSubmit={scanDataset}>
            <div className="input-group">
              <label>Upload Dataset (.csv)</label>
              <input type="file" accept=".csv" onChange={e => setFile(e.target.files[0])} className="file-input" required />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <div className="input-group">
                <label>Target Outcome Column</label>
                <input type="text" value={targetCol} onChange={e => setTargetCol(e.target.value)} placeholder="e.g., income, approved" required />
              </div>
              <div className="input-group">
                <label>Protected Attribute</label>
                <input type="text" value={protectedAttr} onChange={e => setProtectedAttr(e.target.value)} placeholder="e.g., gender, race" required />
              </div>
            </div>
            
            <div className="input-group" style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
              <label>Privileged Class Value</label>
              <input type="text" value={privClass} onChange={e => setPrivClass(e.target.value)} placeholder="e.g., Male, White" required />
            </div>

            <button 
              type="submit"
              className="btn" 
              disabled={loading || mitigating}
            >
              {loading ? <Search className="loading-spinner" /> : <Search />}
              {loading ? "Analyzing Models..." : "Run Fairness Audit"}
            </button>
          </form>

          {data && data.status === 'Biased' && (
            <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', borderLeft: '4px solid var(--danger)' }}>
              <h3 style={{ color: 'var(--danger)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShieldAlert size={18}/> Critical Bias Detected</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>This model violates UN SDG 10 thresholds. Immediate remediation is required before deployment.</p>
              <button 
                className="btn btn-mitigate" 
                onClick={mitigateBias}
                disabled={mitigating}
              >
                {mitigating ? <Zap className="loading-spinner" /> : <Zap />}
                {mitigating ? "Applying Algorithm..." : "1-Click Auto-Mitigate (Re-weight)"}
              </button>
            </div>
          )}
        </div>

        {/* Right Column: AI Explanations & PDF Report */}
        <div className="glass-card" ref={reportRef} style={{ position: 'relative' }}>
          {data && (
            <button onClick={exportPDF} title="Download PDF Report" className="btn-icon" style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', color: 'var(--accent-blue)' }}>
              <Download size={20} />
            </button>
          )}
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', background: 'linear-gradient(to right, #f8f9fa, #9ba1a6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            <img src="https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg" width="24" alt="Gemini Sparkle"/> AI Audit Report
          </h2>

          {!data && !loading && (
             <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem 0' }}>
               Upload a dataset to generate a compliance report.
             </div>
          )}

          {loading && (
             <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
               <Activity className="loading-spinner" color="var(--accent-purple)" size={32} />
               Processing Random Forest & Google Gemini Vectors...
             </div>
          )}

          {data && !loading && (
            <div className="insight-section" style={{ marginTop: 0, borderTop: 'none', paddingTop: 0 }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                 <div>
                   <span className="metric-label" style={{ display: 'block', marginBottom: '0.3rem' }}>Disparate Impact Score</span>
                   <span className="metric-value" style={{ fontSize: '2rem' }}>{data.metrics.disparate_impact.toFixed(2)}</span>
                 </div>
                 <span className={`status-badge ${data.status === 'Biased' ? 'status-biased' : 'status-fair'}`} style={{ fontSize: '1.2rem', padding: '0.5rem 1rem' }}>
                    {data.status}
                 </span>
              </div>

              {/* Data Visualization */}
              <div style={{ height: '200px', width: '100%', marginBottom: '2rem' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Positive Outcome Selection Rate (%)</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.chart_data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)"/>
                    <XAxis dataKey="group" stroke="var(--text-muted)" />
                    <YAxis stroke="var(--text-muted)" />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-dark)', borderColor: 'var(--accent-purple)' }}/>
                    <Bar dataKey="Selection Rate" fill="var(--accent-purple)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Feature Importance */}
              {data.feature_importances && data.feature_importances.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <span className="insight-tag" style={{ color: 'var(--text-main)' }}><BarChart2 size={16} style={{display:'inline', marginBottom:'-3px'}}/> Top Predictive Features</span>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {data.feature_importances.map(f => (
                       <span key={f.name} style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                         {f.name} ({f.value}%)
                       </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Gemini Insights */}
              <div style={{ marginBottom: '1.5rem', background: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid var(--accent-blue)' }}>
                <span className="insight-tag" style={{ color: 'var(--accent-blue)' }}>Gemini Executive Summary</span>
                <p className="insight-text" style={{ fontSize: '1rem', color: '#fff', fontWeight: 500, marginBottom: '0.8rem' }}>{data.llm_explanation.verdict}</p>
                <p className="insight-text">{data.llm_explanation.translation}</p>
              </div>

              <div>
                <span className="insight-tag" style={{ color: 'var(--success)' }}>Remediation Recommendation</span>
                <p className="insight-text">{data.llm_explanation.suggestion}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
