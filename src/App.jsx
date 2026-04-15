import { useState, useEffect, useRef } from "react";
import "./App.css";

// ── API Helpers ──────────────────────────────────────────────────────────────

function buildPrompt(doc) {
  return `You are a strict, professional Domain AI-Review Bot. Analyze the document below and return ONLY a raw JSON object — no markdown, no code fences, no explanation before or after.

DOCUMENT:
"""
${doc}
"""

Return this EXACT JSON structure (fill in all fields accurately based on the document):
{
  "understanding": {
    "title": "exact title or inferred topic",
    "objective": "what the document aims to achieve",
    "audience": "who this document is written for",
    "score": 8,
    "notes": "brief assessment of how clearly the author understands their own topic"
  },
  "content_clarity": {
    "score": 7,
    "is_clear": true,
    "is_logical": true,
    "confusing_points": ["list any unclear parts, or empty array"]
  },
  "completeness": {
    "score": 6,
    "has_introduction": true,
    "has_main_content": true,
    "has_conclusion": false,
    "missing_sections": ["list missing sections"],
    "notes": "completeness assessment"
  },
  "accuracy": {
    "score": 8,
    "is_correct": true,
    "wrong_concepts": ["list wrong facts/concepts"],
    "example_quality": "Good | Poor | N/A",
    "notes": "accuracy notes"
  },
  "presentation": {
    "score": 7,
    "proper_formatting": true,
    "good_flow": true,
    "easy_to_read": true,
    "issues": ["formatting or readability issues"]
  },
  "technical": {
    "applicable": false,
    "score": 0,
    "code_working": false,
    "logic_correct": false,
    "output_shown": false,
    "issues": ["technical issues found"]
  },
  "quality": {
    "score": 7,
    "is_professional": true,
    "grammar_mistakes": ["list any grammar issues"],
    "language_quality": "Clear and professional | Needs improvement | Poor"
  },
  "mistakes": [
    {
      "type": "concept | missing | wrong | structure | practical",
      "description": "detailed description of the mistake",
      "severity": "low | medium | high"
    }
  ],
  "corrections": [
    {
      "mistake": "brief name of the mistake",
      "point_out": "Step 1: Clearly state what is wrong",
      "why": "Step 2: Explain why it is a problem",
      "think": "Step 3: Ask the learner a guiding question",
      "suggest": "Step 4: Give a concrete improvement suggestion",
      "task": "Step 5: Assign a specific rewrite/fix task",
      "deadline": "Step 6: Recommend a timeline"
    }
  ],
  "final_feedback": "A 3-4 sentence professional summary: acknowledge the effort, summarize the main issues, and give an encouraging direction for improvement.",
  "checklist": {
    "topic_understood": "pass | improvement | fail",
    "content_clear": "pass | improvement | fail",
    "requirements_completed": "pass | improvement | fail",
    "information_correct": "pass | improvement | fail",
    "structure_proper": "pass | improvement | fail",
    "no_major_mistakes": "pass | improvement | fail",
    "professional_quality": "pass | improvement | fail"
  },
  "overall_score": 72
}

RULES:
- overall_score must be 0–100
- All scores must be 0–10
- severity must be exactly: low, medium, or high
- checklist values must be exactly: pass, improvement, or fail
- Return ONLY the JSON. No other text.`;
}

async function callGemini(apiKey, doc) {
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role:"user",parts: [{ text: buildPrompt(doc) }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 4096 }
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Gemini API error");
  return data.candidates[0]?.content?.parts?.[0]?.text || "";
}

async function callGroq(apiKey, doc) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: buildPrompt(doc) }],
      temperature: 0.2,
      max_tokens: 4096
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Groq API error");
  return data.choices[0].message.content;
}

// ── Helper Functions ─────────────────────────────────────────────────────────

function scoreColor(score) {
  if (score >= 8) return "var(--green)";
  if (score >= 5) return "var(--yellow)";
  return "var(--red)";
}

function checklistMeta(val) {
  if (val === "pass") return { icon: "✅", label: "Pass", cls: "cl-pass" };
  if (val === "improvement") return { icon: "⚠️", label: "Needs Improvement", cls: "cl-warn" };
  return { icon: "❌", label: "Fail", cls: "cl-fail" };
}

function severityClass(s) {
  if (s === "high") return "sev-high";
  if (s === "medium") return "sev-med";
  return "sev-low";
}

function typeIcon(t) {
  const map = { concept: "🧠", missing: "📭", wrong: "❌", structure: "🏗️", practical: "⚙️" };
  return map[t] || "⚠️";
}

const CHECKLIST_LABELS = {
  topic_understood: "Topic Understood",
  content_clear: "Content Clear",
  requirements_completed: "Requirements Completed",
  information_correct: "Information Correct",
  structure_proper: "Structure Proper",
  no_major_mistakes: "No Major Mistakes",
  professional_quality: "Professional Quality"
};

// ── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [provider, setProvider] = useState("gemini");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [docText, setDocText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const resultsRef = useRef(null);

  const loadMessages = [
    "Reading document structure…",
    "Evaluating content clarity…",
    "Checking accuracy & completeness…",
    "Generating professional feedback…"
  ];

  useEffect(() => {
    const k = localStorage.getItem("arb_key");
    const p = localStorage.getItem("arb_provider");
    if (k) setApiKey(k);
    if (p) setProvider(p);
  }, []);

  useEffect(() => {
    let t;
    if (loading) {
      t = setInterval(() => setLoadStep(s => (s + 1) % loadMessages.length), 1800);
    }
    return () => clearInterval(t);
  }, [loading]);

  const handleReview = async () => {
    if (!apiKey.trim()) { setError("⚠️ Please enter your API key first."); return; }
    if (!docText.trim()) { setError("⚠️ Please paste a document to review."); return; }
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const raw = provider === "gemini"
        ? await callGemini(apiKey, docText)
        : await callGroq(apiKey, docText);
      const cleaned = raw.replace(/```json|```/gi, "").trim();
      const parsed = JSON.parse(cleaned);
      setResult(parsed);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) {
      setError(`Error: ${e.message}. Check your API key and try again.`);
    } finally {
      setLoading(false);
    }
  };

  const wordCount = docText.split(/\s+/).filter(Boolean).length;

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="header-logo">
            <span className="logo-icon">🤖</span>
            <div>
              <h1>AI Review Bot</h1>
              <span className="header-sub">Domain Document Intelligence System</span>
            </div>
          </div>
          <div className="header-badge">v1.0 FREE</div>
        </div>
        <div className="header-scan-line"></div>
      </header>

      <div className="main-layout">
        {/* Left: Input Panel */}
        <aside className="input-panel">
          <div className="panel-section">
            <div className="section-label">⚙️ CONFIGURATION</div>

            <div className="field">
              <label>AI Provider</label>
              <div className="provider-tabs">
                <button
                  className={`tab ${provider === "gemini" ? "active" : ""}`}
                  onClick={() => { setProvider("gemini"); localStorage.setItem("arb_provider", "gemini"); }}
                >
                  <span>🔷</span> Gemini
                </button>
                <button
                  className={`tab ${provider === "groq" ? "active" : ""}`}
                  onClick={() => { setProvider("groq"); localStorage.setItem("arb_provider", "groq"); }}
                >
                  <span>⚡</span> Groq
                </button>
              </div>
              <a
                className="get-key-link"
                href={provider === "gemini" ? "https://aistudio.google.com" : "https://console.groq.com"}
                target="_blank"
                rel="noreferrer"
              >
                Get free API key →
              </a>
            </div>

            <div className="field">
              <label>API Key</label>
              <div className="key-row">
                <input
                  type={showKey ? "text" : "password"}
                  placeholder={provider === "gemini" ? "AIzaSy..." : "gsk_..."}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  className="key-input"
                />
                <button className="icon-btn" onClick={() => setShowKey(s => !s)} title="Toggle visibility">
                  {showKey ? "🙈" : "👁️"}
                </button>
              </div>
              <button className="save-btn" onClick={() => {
                localStorage.setItem("arb_key", apiKey);
                localStorage.setItem("arb_provider", provider);
              }}>
                💾 Save Key
              </button>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-label">📄 REVIEW SCOPE</div>
            <div className="scope-list">
              {["Document Understanding","Content Clarity","Completeness","Accuracy","Presentation","Technical Part","Quality","Mistakes","Corrections","Final Feedback","Checklist"].map((item, i) => (
                <div key={i} className="scope-item">
                  <span className="scope-num">{String(i + 1).padStart(2, "0")}</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Right: Main Content */}
        <main className="main-content">
          {/* Document Input */}
          <div className="card">
            <div className="card-header">
              <h2>📄 Document Input</h2>
              <span className="word-count">{wordCount} words · {docText.length} chars</span>
            </div>
            <textarea
              className="doc-textarea"
              placeholder="Paste your document here…&#10;&#10;Supports: Essays, Reports, Project Docs, Code Explanations, Assignment Submissions, Research Papers, and more."
              value={docText}
              onChange={e => setDocText(e.target.value)}
              rows={14}
            />
            {error && <div className="error-box">{error}</div>}
            <div className="card-footer">
              <button
                className="review-btn"
                onClick={handleReview}
                disabled={loading}
              >
                {loading ? <><span className="spin">⏳</span> Analyzing…</> : "🔍 Start Review"}
              </button>
              {docText && (
                <button className="clear-btn" onClick={() => { setDocText(""); setResult(null); setError(""); }}>
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="loading-card">
              <div className="loading-ring">
                <div></div><div></div><div></div><div></div>
              </div>
              <p className="loading-msg">{loadMessages[loadStep]}</p>
              <div className="loading-dots">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}

          {/* Results */}
          {result && (
            <div ref={resultsRef} className="results-area">
              <div className="results-header">
                <span>📊 REVIEW COMPLETE</span>
                <button className="print-btn" onClick={() => window.print()}>🖨️ Print Report</button>
              </div>

              {/* Overall Score */}
              <div className="card score-card">
                <div className="overall-score">
                  <svg className="score-ring" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border)" strokeWidth="8" />
                    <circle
                      cx="60" cy="60" r="52" fill="none"
                      stroke={result.overall_score >= 70 ? "var(--green)" : result.overall_score >= 50 ? "var(--yellow)" : "var(--red)"}
                      strokeWidth="8"
                      strokeDasharray={`${(result.overall_score / 100) * 326.7} 326.7`}
                      strokeLinecap="round"
                      transform="rotate(-90 60 60)"
                      style={{ transition: "stroke-dasharray 1s ease" }}
                    />
                    <text x="60" y="58" textAnchor="middle" fill="var(--text)" fontSize="26" fontWeight="bold" fontFamily="Space Mono">{result.overall_score}</text>
                    <text x="60" y="74" textAnchor="middle" fill="var(--text-muted)" fontSize="11" fontFamily="Syne">/100</text>
                  </svg>
                  <div className="score-details">
                    <div className="score-grade">
                      {result.overall_score >= 80 ? "🏆 Excellent" :
                       result.overall_score >= 65 ? "✅ Good" :
                       result.overall_score >= 50 ? "⚠️ Needs Work" : "❌ Poor"}
                    </div>
                    <p className="final-feedback-text">{result.final_feedback}</p>
                  </div>
                </div>
              </div>

              {/* Understanding */}
              <div className="card">
                <div className="card-header">
                  <h2>📖 i) Document Understanding</h2>
                  <ScorePill score={result.understanding?.score} />
                </div>
                <div className="info-grid">
                  <InfoRow icon="📌" label="Title / Topic" value={result.understanding?.title} />
                  <InfoRow icon="🎯" label="Objective" value={result.understanding?.objective} />
                  <InfoRow icon="👥" label="Target Audience" value={result.understanding?.audience} />
                </div>
                {result.understanding?.notes && <Note text={result.understanding.notes} />}
              </div>

              {/* Section Scores */}
              <div className="card">
                <div className="card-header"><h2>📊 Section Scores</h2></div>
                <div className="bars-grid">
                  <ScoreBar label="ii) Content Clarity" score={result.content_clarity?.score} />
                  <ScoreBar label="iii) Completeness" score={result.completeness?.score} />
                  <ScoreBar label="iv) Accuracy" score={result.accuracy?.score} />
                  <ScoreBar label="v) Presentation" score={result.presentation?.score} />
                  {result.technical?.applicable && <ScoreBar label="vi) Technical" score={result.technical?.score} />}
                  <ScoreBar label="vii) Quality" score={result.quality?.score} />
                </div>
              </div>

              {/* Content Clarity */}
              <div className="card">
                <div className="card-header">
                  <h2>💡 ii) Content Clarity</h2>
                  <ScorePill score={result.content_clarity?.score} />
                </div>
                <div className="bool-row">
                  <BoolTag label="Clear" val={result.content_clarity?.is_clear} />
                  <BoolTag label="Logical" val={result.content_clarity?.is_logical} />
                </div>
                {result.content_clarity?.confusing_points?.length > 0 && (
                  <div className="issue-list">
                    <strong>⚠️ Confusing Points:</strong>
                    {result.content_clarity.confusing_points.map((p, i) => <div key={i} className="issue-item">• {p}</div>)}
                  </div>
                )}
              </div>

              {/* Completeness */}
              <div className="card">
                <div className="card-header">
                  <h2>✅ iii) Completeness</h2>
                  <ScorePill score={result.completeness?.score} />
                </div>
                <div className="bool-row">
                  <BoolTag label="Introduction" val={result.completeness?.has_introduction} />
                  <BoolTag label="Main Content" val={result.completeness?.has_main_content} />
                  <BoolTag label="Conclusion" val={result.completeness?.has_conclusion} />
                </div>
                {result.completeness?.missing_sections?.length > 0 && (
                  <div className="issue-list missing-tag">
                    <strong>Missing:</strong> {result.completeness.missing_sections.join(" · ")}
                  </div>
                )}
                {result.completeness?.notes && <Note text={result.completeness.notes} />}
              </div>

              {/* Accuracy */}
              <div className="card">
                <div className="card-header">
                  <h2>🎯 iv) Accuracy</h2>
                  <ScorePill score={result.accuracy?.score} />
                </div>
                <div className="bool-row">
                  <BoolTag label="Correct Info" val={result.accuracy?.is_correct} />
                  <div className="bool-tag neutral">
                    <span>📝</span>
                    <span>Examples: {result.accuracy?.example_quality || "N/A"}</span>
                  </div>
                </div>
                {result.accuracy?.wrong_concepts?.length > 0 && (
                  <div className="issue-list">
                    <strong>❌ Wrong Concepts:</strong>
                    {result.accuracy.wrong_concepts.map((c, i) => <div key={i} className="issue-item">• {c}</div>)}
                  </div>
                )}
                {result.accuracy?.notes && <Note text={result.accuracy.notes} />}
              </div>

              {/* Presentation */}
              <div className="card">
                <div className="card-header">
                  <h2>🎨 v) Presentation</h2>
                  <ScorePill score={result.presentation?.score} />
                </div>
                <div className="bool-row">
                  <BoolTag label="Formatting" val={result.presentation?.proper_formatting} />
                  <BoolTag label="Good Flow" val={result.presentation?.good_flow} />
                  <BoolTag label="Easy to Read" val={result.presentation?.easy_to_read} />
                </div>
                {result.presentation?.issues?.length > 0 && (
                  <div className="issue-list">
                    {result.presentation.issues.map((p, i) => <div key={i} className="issue-item">• {p}</div>)}
                  </div>
                )}
              </div>

              {/* Technical (if applicable) */}
              {result.technical?.applicable && (
                <div className="card">
                  <div className="card-header">
                    <h2>⚙️ vi) Technical / Practical</h2>
                    <ScorePill score={result.technical?.score} />
                  </div>
                  <div className="bool-row">
                    <BoolTag label="Code Working" val={result.technical?.code_working} />
                    <BoolTag label="Logic Correct" val={result.technical?.logic_correct} />
                    <BoolTag label="Output Shown" val={result.technical?.output_shown} />
                  </div>
                  {result.technical?.issues?.length > 0 && (
                    <div className="issue-list">
                      {result.technical.issues.map((p, i) => <div key={i} className="issue-item">• {p}</div>)}
                    </div>
                  )}
                </div>
              )}

              {/* Quality */}
              <div className="card">
                <div className="card-header">
                  <h2>⭐ vii) Quality</h2>
                  <ScorePill score={result.quality?.score} />
                </div>
                <div className="bool-row">
                  <BoolTag label="Professional" val={result.quality?.is_professional} />
                  <div className="bool-tag neutral"><span>📖</span><span>{result.quality?.language_quality}</span></div>
                </div>
                {result.quality?.grammar_mistakes?.length > 0 && (
                  <div className="issue-list">
                    <strong>Grammar:</strong>
                    {result.quality.grammar_mistakes.map((g, i) => <div key={i} className="issue-item">• {g}</div>)}
                  </div>
                )}
              </div>

              {/* Mistakes */}
              {result.mistakes?.length > 0 && (
                <div className="card">
                  <div className="card-header"><h2>⚠️ viii) Identified Mistakes</h2>
                    <span className="badge-count">{result.mistakes.length}</span>
                  </div>
                  <div className="mistakes-list">
                    {result.mistakes.map((m, i) => (
                      <div key={i} className={`mistake-item ${severityClass(m.severity)}`}>
                        <div className="mistake-meta">
                          <span className="mistake-icon">{typeIcon(m.type)}</span>
                          <span className="mistake-type">{m.type?.toUpperCase()}</span>
                          <span className={`sev-badge ${severityClass(m.severity)}`}>{m.severity}</span>
                        </div>
                        <p>{m.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Corrections */}
              {result.corrections?.length > 0 && (
                <div className="card">
                  <div className="card-header"><h2>🛠️ ix) How to Correct</h2></div>
                  {result.corrections.map((c, i) => (
                    <div key={i} className="correction-block">
                      <div className="correction-title">🔧 {c.mistake}</div>
                      <div className="steps">
                        {[
                          ["1", "Point Out", c.point_out],
                          ["2", "Why It Matters", c.why],
                          ["3", "Think About It", c.think],
                          ["4", "Suggestion", c.suggest],
                          ["5", "Your Task", c.task],
                          ["6", "Deadline", c.deadline]
                        ].filter(([,, v]) => v).map(([n, label, val]) => (
                          <div key={n} className="step-row">
                            <div className="step-num">Step {n}</div>
                            <div className="step-body"><strong>{label}:</strong> {val}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Final Feedback */}
              <div className="card feedback-card">
                <div className="card-header"><h2>🏁 x) Final Feedback</h2></div>
                <div className="feedback-quote">
                  <div className="quote-bar"></div>
                  <p>{result.final_feedback}</p>
                </div>
              </div>

              {/* Checklist */}
              <div className="card">
                <div className="card-header"><h2>📋 xi) Review Checklist</h2></div>
                <div className="checklist-grid">
                  {Object.entries(result.checklist || {}).map(([key, val]) => {
                    const { icon, label, cls } = checklistMeta(val);
                    return (
                      <div key={key} className={`cl-item ${cls}`}>
                        <span className="cl-icon">{icon}</span>
                        <span className="cl-name">{CHECKLIST_LABELS[key] || key}</span>
                        <span className="cl-label">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}
        </main>
      </div>

      <footer className="footer">
        <p>AI Review Bot · Built with React + Vite · Free APIs: <a href="https://aistudio.google.com" target="_blank">Google Gemini</a> · <a href="https://console.groq.com" target="_blank">Groq</a></p>
      </footer>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScorePill({ score }) {
  return (
    <span className="score-pill" style={{ color: scoreColor(score), borderColor: scoreColor(score) }}>
      {score}/10
    </span>
  );
}

function ScoreBar({ label, score }) {
  const pct = (score / 10) * 100;
  return (
    <div className="score-bar">
      <div className="sb-label">
        <span>{label}</span>
        <span style={{ color: scoreColor(score), fontFamily: "var(--mono)" }}>{score}/10</span>
      </div>
      <div className="sb-track">
        <div className="sb-fill" style={{ width: `${pct}%`, background: scoreColor(score) }}></div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="info-row">
      <span className="info-icon">{icon}</span>
      <div>
        <div className="info-label">{label}</div>
        <div className="info-value">{value || "—"}</div>
      </div>
    </div>
  );
}

function BoolTag({ label, val }) {
  return (
    <div className={`bool-tag ${val ? "bool-yes" : "bool-no"}`}>
      <span>{val ? "✓" : "✗"}</span>
      <span>{label}</span>
    </div>
  );
}

function Note({ text }) {
  return <div className="note-box">💡 {text}</div>;
}
