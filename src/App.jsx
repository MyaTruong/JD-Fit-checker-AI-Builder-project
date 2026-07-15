import JDInput from './components/JDInput'
import ProfileInput from './components/ProfileInput'
import ResultsSection from './components/ResultsSection'
import './App.css'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>JD Fit Checker</h1>
        <p>Dán Job Description và profile của bạn để nhận phân tích mức độ phù hợp.</p>
      </header>

      <main className="app-main">
        <div className="inputs-row">
          <JDInput />
          <ProfileInput />
        </div>

        <button type="button" className="analyze-button">
          Analyze
        </button>

        <ResultsSection />
      </main>
    </div>
  )
}

export default App
