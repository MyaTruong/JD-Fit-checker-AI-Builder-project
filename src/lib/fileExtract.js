import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { canvasToJpegImage } from './fileToBase64'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export const MAX_FILE_BYTES = 10 * 1024 * 1024
export const MIN_EXTRACTED_CHARS = 200
export const MAX_FALLBACK_PAGES = 3

// Below this average characters-per-page, a PDF is treated as scanned
// (image-only, no real text layer) rather than just a short document.
const SCANNED_CHARS_PER_PAGE_THRESHOLD = 20

// Carries a stable error `code` (one of the error sub-types in
// docs/pdf-docx-upload-plan.md) alongside the Vietnamese message shown to
// the user, so callers can both display the message and log the code as
// the `reason` for the `extract_failed` analytics event.
export class ExtractError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'ExtractError'
    this.code = code
  }
}

export function validateFile(file) {
  const name = (file.name || '').toLowerCase()
  const isPdf = name.endsWith('.pdf')
  const isDocx = name.endsWith('.docx')
  const isLegacyDoc = name.endsWith('.doc') && !isDocx

  if (isLegacyDoc) {
    throw new ExtractError(
      'unsupported_type',
      'Định dạng .doc (Word 97-2003) không được hỗ trợ. Vui lòng lưu lại dưới dạng .docx hoặc PDF rồi thử lại.'
    )
  }
  if (!isPdf && !isDocx) {
    throw new ExtractError(
      'unsupported_type',
      'Chỉ hỗ trợ file .pdf hoặc .docx. Vui lòng lưu lại đúng định dạng rồi thử lại.'
    )
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new ExtractError(
      'too_large',
      `File vượt quá 10MB (hiện tại ~${(file.size / 1024 / 1024).toFixed(1)}MB). Vui lòng dùng file nhỏ hơn.`
    )
  }

  return { type: isPdf ? 'pdf' : 'docx' }
}

async function renderPdfPagesToImages(pdfDoc, maxPages) {
  const images = []
  const pageCount = Math.min(pdfDoc.numPages, maxPages)

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdfDoc.getPage(i)
    const viewport = page.getViewport({ scale: 1.5 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
    images.push(await canvasToJpegImage(canvas, `page-${i}.jpg`))
  }

  return images
}

export async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer()

  let pdfDoc
  try {
    pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  } catch (err) {
    if (err?.name === 'PasswordException') {
      throw new ExtractError(
        'password_protected',
        'File PDF có mật khẩu bảo vệ. Vui lòng mở khóa file rồi thử lại, hoặc dán nội dung dạng text.'
      )
    }
    throw new ExtractError(
      'read_failed',
      'Không thể đọc file PDF này. Vui lòng thử file khác hoặc dán nội dung dạng text.'
    )
  }

  const pageCount = pdfDoc.numPages
  let fullText = ''
  try {
    for (let i = 1; i <= pageCount; i++) {
      const page = await pdfDoc.getPage(i)
      const textContent = await page.getTextContent()
      fullText += textContent.items.map((item) => item.str).join(' ') + '\n\n'
    }
  } catch {
    throw new ExtractError(
      'read_failed',
      'Không thể đọc nội dung từ file PDF này. Vui lòng thử file khác hoặc dán nội dung dạng text.'
    )
  }

  const trimmed = fullText.trim()
  const avgCharsPerPage = pageCount > 0 ? trimmed.length / pageCount : 0

  if (avgCharsPerPage < SCANNED_CHARS_PER_PAGE_THRESHOLD) {
    try {
      const images = await renderPdfPagesToImages(pdfDoc, MAX_FALLBACK_PAGES)
      if (images.length === 0) throw new Error('no pages rendered')
      return { status: 'image_fallback', images, pages: pageCount }
    } catch {
      throw new ExtractError(
        'scanned_fallback_failed',
        'Không thể đọc nội dung từ file này (có thể là bản scan). Vui lòng dán nội dung dạng text.'
      )
    }
  }

  if (trimmed.length < MIN_EXTRACTED_CHARS) {
    throw new ExtractError(
      'too_short',
      'Nội dung trích xuất quá ngắn (dưới 200 ký tự). Vui lòng kiểm tra file hoặc dán nội dung dạng text.'
    )
  }

  return { status: 'text', text: trimmed, pages: pageCount, chars: trimmed.length }
}

export async function extractDocxText(file) {
  const arrayBuffer = await file.arrayBuffer()

  // mammoth is only used in the browser for this feature; keep the import
  // lazy so it doesn't bloat the initial bundle for users who never upload.
  const mammoth = (await import('mammoth')).default

  let result
  try {
    result = await mammoth.extractRawText({ arrayBuffer })
  } catch {
    throw new ExtractError(
      'read_failed',
      'Không thể đọc file DOCX này. Vui lòng thử file khác hoặc dán nội dung dạng text.'
    )
  }

  const trimmed = (result.value || '').trim()
  if (trimmed.length < MIN_EXTRACTED_CHARS) {
    throw new ExtractError(
      'too_short',
      'Nội dung trích xuất quá ngắn (dưới 200 ký tự). Vui lòng kiểm tra file hoặc dán nội dung dạng text.'
    )
  }

  return { status: 'text', text: trimmed, pages: null, chars: trimmed.length }
}

// Single entry point used by the UI: validates, routes to the right
// extractor, and tags the result with the detected file type so callers
// (and analytics) don't need to re-derive it.
export async function extractFile(file) {
  const { type } = validateFile(file)
  const result = type === 'pdf' ? await extractPdfText(file) : await extractDocxText(file)
  return { ...result, type }
}
