import { useState } from 'react'
import { compressImageToBase64 } from '../lib/fileToBase64'

function JDInput({ mode, onModeChange, text, onTextChange, images, onAddImages, onRemoveImage }) {
  const [fileError, setFileError] = useState('')

  async function handleFilesChange(e) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setFileError('')

    try {
      const newImages = await Promise.all(
        files.map(async (file) => {
          const { mediaType, data, previewUrl } = await compressImageToBase64(file)
          return { mediaType, data, fileName: file.name, previewUrl }
        })
      )
      onAddImages(newImages)
    } catch (err) {
      setFileError(err.message || 'Không thể xử lý ảnh đã chọn. Vui lòng thử ảnh khác hoặc dùng chế độ dán text.')
    } finally {
      e.target.value = ''
    }
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
          <input
            type="file"
            accept="image/*"
            multiple
            className="file-input"
            onChange={handleFilesChange}
          />
          {fileError && <p className="file-error-text">{fileError}</p>}
          {images.length > 0 && (
            <div className="thumbnail-grid">
              {images.map((img, idx) => (
                <div className="thumbnail-item" key={idx}>
                  <img className="thumbnail-preview" src={img.previewUrl} alt={`JD trang ${idx + 1}`} />
                  <button
                    type="button"
                    className="thumbnail-remove"
                    aria-label={`Xóa ảnh ${idx + 1}`}
                    onClick={() => onRemoveImage(idx)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default JDInput
