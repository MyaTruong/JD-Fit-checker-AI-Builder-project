import { useState } from 'react'

const DECISION_CLASS = {
  Apply: 'decision-apply',
  Consider: 'decision-consider',
  Skip: 'decision-skip',
}

function buildCopyText({ result, jdMode, jdText, profileMode, profileText }) {
  const jdSection = jdMode === 'image' ? '[JD được cung cấp dưới dạng ảnh]' : jdText
  const profileSection = profileMode === 'image' ? '[Profile được cung cấp dưới dạng ảnh CV nhiều trang]' : profileText

  const requirementsText = result.requirements
    .map((r) => `- ${r.fit} ${r.item}${r.note ? ` — ${r.note}` : ''}`)
    .join('\n')

  const strengthsText = result.strengths_to_highlight
    .map((s) => `- ${s.strength} — ${s.why_it_matters}`)
    .join('\n')

  const gapsText = result.gaps.map((g) => `- ${g.gap} (Gợi ý: ${g.quick_action})`).join('\n')

  return `=== Job Description ===
${jdSection}

=== Profile ===
${profileSection}

=== Kết quả phân tích ===
Fit score: ${result.fit_score}%
Quyết định: ${result.decision}
Lý do: ${result.score_reasoning}

Chi tiết yêu cầu:
${requirementsText}

Chân dung ứng viên lý tưởng:
${result.ideal_candidate}

Điểm mạnh nên nhấn mạnh:
${strengthsText}

Gaps chính:
${gapsText}

---
Hãy tối ưu CV của tôi dựa trên phân tích sau:`
}

function ResultsSection({ loading, error, result, jdMode, jdText, profileMode, profileText }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const text = buildCopyText({ result, jdMode, jdText, profileMode, profileText })
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="panel results-panel">
      <h2>Kết quả phân tích</h2>

      {loading && <p className="placeholder-text">Đang phân tích...</p>}

      {!loading && error && <p className="error-text">{error}</p>}

      {!loading && !error && !result && (
        <p className="placeholder-text">Kết quả sẽ hiển thị ở đây sau khi phân tích.</p>
      )}

      {!loading && !error && result && (
        <div className="results-content">
          <table className="requirements-table">
            <thead>
              <tr>
                <th>Yêu cầu</th>
                <th>Fit</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {result.requirements.map((r, idx) => (
                <tr key={idx}>
                  <td>{r.item}</td>
                  <td>{r.fit}</td>
                  <td>{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className={`decision-box ${DECISION_CLASS[result.decision] || ''}`}>
            <span className="fit-score">{result.fit_score}%</span>
            <span className="decision-label">{result.decision}</span>
          </div>

          <p className="score-reasoning">{result.score_reasoning}</p>

          <div className="ideal-candidate">
            <h3>Chân dung ứng viên lý tưởng</h3>
            <p>{result.ideal_candidate}</p>
          </div>

          <div className="strengths">
            <h3>Điểm mạnh nên nhấn mạnh</h3>
            <ul>
              {result.strengths_to_highlight.map((s, idx) => (
                <li key={idx}>
                  <strong>{s.strength}</strong>
                  <span className="strength-why"> — {s.why_it_matters}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="gaps">
            <h3>Gaps chính</h3>
            <ul>
              {result.gaps.map((g, idx) => (
                <li key={idx}>
                  {g.gap}
                  <div className="gap-action">Gợi ý: {g.quick_action}</div>
                </li>
              ))}
            </ul>
          </div>

          {(result.decision === 'Apply' || result.decision === 'Consider') && (
            <div className="copy-block">
              <button type="button" className="copy-button" onClick={handleCopy}>
                {copied ? 'Đã copy!' : 'Copy để tối ưu CV'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ResultsSection
