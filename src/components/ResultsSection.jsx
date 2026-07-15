import { useState } from 'react'

const DECISION_CLASS = {
  Apply: 'decision-apply',
  Consider: 'decision-consider',
  Skip: 'decision-skip',
}

function buildCopyText({ result, jdMode, jdText, profileText }) {
  const jdSection = jdMode === 'image' ? '[JD được cung cấp dưới dạng ảnh]' : jdText

  const requirementsText = result.requirements
    .map((r) => `- ${r.fit} ${r.item}${r.note ? ` — ${r.note}` : ''}`)
    .join('\n')

  const gapsText = result.gaps.map((g) => `- ${g}`).join('\n')

  return `=== Job Description ===
${jdSection}

=== Profile ===
${profileText}

=== Kết quả phân tích ===
Fit score: ${result.fit_score}%
Quyết định: ${result.decision}

Chi tiết yêu cầu:
${requirementsText}

Chân dung ứng viên lý tưởng:
${result.ideal_candidate}

Gaps chính:
${gapsText}

---
Hãy tối ưu CV của tôi dựa trên phân tích sau:`
}

function ResultsSection({ loading, error, result, jdMode, jdText, profileText }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const text = buildCopyText({ result, jdMode, jdText, profileText })
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

          <div className="ideal-candidate">
            <h3>Chân dung ứng viên lý tưởng</h3>
            <p>{result.ideal_candidate}</p>
          </div>

          <div className="gaps">
            <h3>Gaps chính</h3>
            <ul>
              {result.gaps.map((gap, idx) => (
                <li key={idx}>{gap}</li>
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
