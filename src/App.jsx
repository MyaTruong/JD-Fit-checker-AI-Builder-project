import { useState } from 'react'
import JDInput from './components/JDInput'
import ProfileInput from './components/ProfileInput'
import ResultsSection from './components/ResultsSection'
import { analyzeJDFit } from './lib/claudeApi'
import './App.css'

function App() {
  const [jdMode, setJdMode] = useState('text')
  const [jdText, setJdText] = useState('')
  const [jdImage, setJdImage] = useState(null)
  const [profileText, setProfileText] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  async function handleAnalyze() {
    setError('')

    if (!profileText.trim()) {
      setError('Vui lòng nhập profile của bạn trước khi phân tích.')
      return
    }
    if (jdMode === 'text' && !jdText.trim()) {
      setError('Vui lòng nhập nội dung Job Description trước khi phân tích.')
      return
    }
    if (jdMode === 'image' && !jdImage) {
      setError('Vui lòng upload ảnh Job Description trước khi phân tích.')
      return
    }

    setLoading(true)
    setResult(null)
    try {
      const data = await analyzeJDFit({ jdMode, jdText, jdImage, profileText })
      setResult(data)
    } catch (err) {
      setError(err.message || 'Đã xảy ra lỗi không xác định.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>JD Fit Checker</h1>
        <p>Dán Job Description và profile của bạn để nhận phân tích mức độ phù hợp.</p>
      </header>

      <main className="app-main">
        <div className="inputs-row">
          <JDInput
            mode={jdMode}
            onModeChange={setJdMode}
            text={jdText}
            onTextChange={setJdText}
            image={jdImage}
            onImageChange={setJdImage}
          />
          <ProfileInput value={profileText} onChange={setProfileText} />
        </div>

        <button type="button" className="analyze-button" onClick={handleAnalyze} disabled={loading}>
          {loading ? 'Đang phân tích...' : 'Analyze'}
        </button>

        <ResultsSection
          loading={loading}
          error={error}
          result={result}
          jdMode={jdMode}
          jdText={jdText}
          profileText={profileText}
        />
      </main>
    </div>
  )
}

export default App
