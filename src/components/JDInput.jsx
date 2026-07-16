import { fileToBase64 } from '../lib/fileToBase64'

function JDInput({ mode, onModeChange, text, onTextChange, image, onImageChange }) {
  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) {
      onImageChange(null)
      return
    }
    const data = await fileToBase64(file)
    onImageChange({
      mediaType: file.type,
      data,
      fileName: file.name,
      previewUrl: URL.createObjectURL(file),
    })
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Job Description</h2>
        <button
          type="button"
          className="toggle-button"
          onClick={() => onModeChange(mode === 'text' ? 'image' : 'text')}
        >
          {mode === 'text' ? 'Chuyển sang upload ảnh' : 'Chuyển sang dán text'}
        </button>
      </div>

      {mode === 'text' ? (
        <textarea
          className="text-input"
          placeholder="Dán nội dung Job Description vào đây..."
          rows={10}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
        />
      ) : (
        <div className="file-upload">
          <input type="file" accept="image/*" className="file-input" onChange={handleFileChange} />
          {image && (
            <img className="image-preview" src={image.previewUrl} alt="JD preview" />
          )}
        </div>
      )}
    </div>
  )
}

export default JDInput
