import { useState } from 'react'
import { compressImageToBase64 } from '../lib/fileToBase64'
import FileUploadField from './FileUploadField'

const MODES = [
  { key: 'text', label: 'Dán text' },
  { key: 'image', label: 'Upload ảnh' },
  { key: 'file', label: 'Upload PDF/DOCX' },
]

function ProfileInput({ mode, onModeChange, text, onTextChange, images, onAddImages, onRemoveImage, onFileBusyChange }) {
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

  function handlePdfImageFallback(newImages) {
    onAddImages(newImages)
    onModeChange('image')
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Profile của bạn</h2>
      </div>

      <div className="mode-tabs" role="tablist" aria-label="Chọn cách nhập Profile">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            role="tab"
            aria-selected={mode === m.key}
            className={`mode-tab ${mode === m.key ? 'mode-tab-active' : ''}`}
            onClick={() => onModeChange(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'text' && (
        <textarea
          className="text-input"
          placeholder="Dán CV / mô tả kinh nghiệm, kỹ năng của bạn vào đây..."
          rows={10}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
        />
      )}

      {mode === 'image' && (
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
                  <img className="thumbnail-preview" src={img.previewUrl} alt={`CV trang ${idx + 1}`} />
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

      {mode === 'file' && (
        <FileUploadField
          fieldKey="profile"
          text={text}
          onTextChange={onTextChange}
          onImageFallback={handlePdfImageFallback}
          onBusyChange={onFileBusyChange}
        />
      )}
    </div>
  )
}

export default ProfileInput
