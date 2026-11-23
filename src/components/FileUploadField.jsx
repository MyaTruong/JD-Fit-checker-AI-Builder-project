import { useEffect, useRef, useState } from 'react'
import { extractFile, ExtractError } from '../lib/fileExtract'
import { track } from '../lib/analytics'

// Shared PDF/DOCX upload state machine for both JDInput and ProfileInput.
// States: idle -> extracting -> (success | error). A scanned PDF that falls
// back to page images never reaches "success" here — it hands the images to
// the parent and the parent switches that field to image mode instead.
function FileUploadField({ fieldKey, text, onTextChange, onImageFallback, onBusyChange, disabled }) {
  const [status, setStatus] = useState('idle') // idle | extracting | success | error
  const [fileName, setFileName] = useState('')
  const [pages, setPages] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const inputRef = useRef(null)

  // The Analyze button should stay disabled while a file is being read or
  // left in an unresolved error state — only 'idle' (nothing picked yet,
  // handled by the mode-level validation) and 'success' are safe to submit.
  useEffect(() => {
    onBusyChange?.(status === 'extracting' || status === 'error')
  }, [status, onBusyChange])

  useEffect(() => () => onBusyChange?.(false), [onBusyChange])

  function detectType(file) {
    const name = (file.name || '').toLowerCase()
    if (name.endsWith('.pdf')) return 'pdf'
    if (name.endsWith('.docx')) return 'docx'
    if (name.endsWith('.doc')) return 'doc'
    return 'unknown'
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    const type = detectType(file)
    track('upload_started', { field: fieldKey, type })
    setFileName(file.name)
    setStatus('extracting')
    setErrorMessage('')

    try {
      const result = await extractFile(file)

      if (result.status === 'image_fallback') {
        track('extract_success', { field: fieldKey, type: result.type, pages: result.pages })
        onImageFallback(result.images)
        // Parent switches this field to image mode; reset local state so a
        // later switch back to file mode starts clean.
        setStatus('idle')
        setFileName('')
        return
      }

      track('extract_success', { field: fieldKey, type: result.type, pages: result.pages, chars: result.chars })
      setPages(result.pages)
      onTextChange(result.text)
      setStatus('success')
    } catch (err) {
      const code = err instanceof ExtractError ? err.code : 'read_failed'
      const message = err?.message || 'Không thể đọc file này. Vui lòng thử file khác hoặc dán nội dung dạng text.'
      track('extract_failed', { field: fieldKey, type, reason: code })
      setErrorMessage(message)
      setStatus('error')
    } finally {
      e.target.value = ''
    }
  }

  function handleRemove() {
    setStatus('idle')
    setFileName('')
    setPages(null)
    setErrorMessage('')
    setPreviewOpen(false)
    onTextChange('')
    if (inputRef.current) inputRef.current.value = ''
  }

  if (status === 'idle') {
    return (
      <div className="file-upload-field">
        <label className="file-dropzone">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx"
            className="file-input-hidden"
            disabled={disabled}
            onChange={handleFileChange}
          />
          <span className="file-dropzone-title">Upload PDF hoặc DOCX</span>
          <span className="file-dropzone-hint">Tối đa 10MB, 1 file</span>
        </label>
      </div>
    )
  }

  if (status === 'extracting') {
    return (
      <div className="file-upload-field">
        <div className="file-chip file-chip-extracting">
          <span className="file-chip-spinner" aria-hidden="true" />
          <span className="file-chip-name">Đang trích xuất “{fileName}”...</span>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="file-upload-field">
        <div className="file-chip file-chip-error">
          <span className="file-chip-name">{fileName}</span>
          <p className="file-error-text">{errorMessage}</p>
          <div className="file-chip-actions">
            <label className="file-chip-retry">
              <input
                type="file"
                accept=".pdf,.docx"
                className="file-input-hidden"
                disabled={disabled}
                onChange={handleFileChange}
              />
              Thử file khác
            </label>
            <button type="button" className="file-chip-remove-link" onClick={handleRemove}>
              Xóa
            </button>
          </div>
        </div>
      </div>
    )
  }

  // success
  return (
    <div className="file-upload-field">
      <div className="file-chip file-chip-success">
        <div className="file-chip-row">
          <span className="file-chip-name">{fileName}</span>
          <button type="button" className="thumbnail-remove file-chip-remove" aria-label="Xóa file" onClick={handleRemove}>
            ×
          </button>
        </div>
        <span className="file-chip-meta">
          {pages ? `${pages} trang · ` : ''}
          {text.length.toLocaleString('vi-VN')} ký tự
        </span>
        <button
          type="button"
          className="file-chip-preview-toggle"
          onClick={() => setPreviewOpen((open) => !open)}
        >
          {previewOpen ? 'Ẩn nội dung trích xuất' : 'Xem / sửa nội dung trích xuất'}
        </button>
        {previewOpen && (
          <textarea
            className="text-input file-chip-preview-textarea"
            rows={8}
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
          />
        )}
      </div>
    </div>
  )
}

export default FileUploadField
