import { useState } from 'react'

function JDInput() {
  const [mode, setMode] = useState('text')

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Job Description</h2>
        <button
          type="button"
          className="toggle-button"
          onClick={() => setMode(mode === 'text' ? 'image' : 'text')}
        >
          {mode === 'text' ? 'Chuyển sang upload ảnh' : 'Chuyển sang dán text'}
        </button>
      </div>

      {mode === 'text' ? (
        <textarea
          className="text-input"
          placeholder="Dán nội dung Job Description vào đây..."
          rows={10}
        />
      ) : (
        <input type="file" accept="image/*" className="file-input" />
      )}
    </div>
  )
}

export default JDInput
