import { useState } from 'react'
import JDInput from './components/JDInput'
import ProfileInput from './components/ProfileInput'
import ResultsSection from './components/ResultsSection'
import { analyzeJDFit } from './lib/claudeApi'
import { estimateBase64Bytes, MAX_TOTAL_IMAGE_BYTES } from './lib/fileToBase64'
import './App.css'

function App() {
  const [jdMode, setJdMode] = useState('text')
  const [jdText, setJdText] = useState('')
  const [jdImages, setJdImages] = useState([])

  const [profileMode, setProfileMode] = useState('text')
  const [profileText, setProfileText] = useState('')
  const [profileImages, setProfileImages] = useState([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  function handleAddJdImages(newImages) {
    setJdImages((prev) => [...prev, ...newImages])
  }

  function handleRemoveJdImage(index) {
    setJdImages((prev) => prev.filter((_, i) => i !== index))
  }

  function handleAddProfileImages(newImages) {
    setProfileImages((prev) => [...prev, ...newImages])
  }

  function handleRemoveProfileImage(index) {
    setProfileImages((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleAnalyze() {
    setError('')

    if (profileMode === 'text' && !profileText.trim()) {
      setError('Vui lòng nhập profile của bạn trước khi phân tích.')
      return
    }
    if (profileMode === 'image' && profileImages.length === 0) {
      setError('Vui lòng upload ít nhất 1 ảnh CV/profile trước khi phân tích.')
      return
    }
    if (jdMode === 'text' && !jdText.trim()) {
      setError('Vui lòng nhập nội dung Job Description trước khi phân tích.')
      return
    }
    if (jdMode === 'image' && jdImages.length === 0) {
      setError('Vui lòng upload ít nhất 1 ảnh Job Description trước khi phân tích.')
      return
    }

    const totalImageBytes = estimateBase64Bytes(jdImages) + estimateBase64Bytes(profileImages)
    if (totalImageBytes > MAX_TOTAL_IMAGE_BYTES) {
      const totalImageCount = jdImages.length + profileImages.length
      const avgBytesPerImage = totalImageCount > 0 ? totalImageBytes / totalImageCount : 0
      const suggestedMax = avgBytesPerImage > 0 ? Math.max(1, Math.floor(MAX_TOTAL_IMAGE_BYTES / avgBytesPerImage)) : totalImageCount
      setError(
        `Ảnh vẫn còn nặng (tổng ~${(totalImageBytes / 1024 / 1024).toFixed(1)}MB). Vui lòng chọn ít ảnh hơn (tối đa khoảng ${suggestedMax} ảnh mỗi lần) hoặc xóa bớt ảnh đã thêm.`
      )
      return
    }

    setLoading(true)
    setResult(null)
    try {
      const data = await analyzeJDFit({ jdMode, jdText, jdImages, profileMode, profileText, profileImages })
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
            images={jdImages}
            onAddImages={handleAddJdImages}
            onRemoveImage={handleRemoveJdImage}
          />
          <ProfileInput
            mode={profileMode}
            onModeChange={setProfileMode}
            text={profileText}
            onTextChange={setProfileText}
            images={profileImages}
            onAddImages={handleAddProfileImages}
            onRemoveImage={handleRemoveProfileImage}
          />
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
          profileMode={profileMode}
          profileText={profileText}
        />
      </main>
    </div>
  )
}

export default App
