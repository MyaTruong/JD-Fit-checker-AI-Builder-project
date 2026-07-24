const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.75

// Vercel serverless functions cap the request body at ~4.5MB. Keep a safety
// margin below that for JSON structure overhead and the JD/profile text.
export const MAX_TOTAL_IMAGE_BYTES = 3.5 * 1024 * 1024

export function estimateBase64Bytes(images) {
  return (images || []).reduce((sum, img) => sum + (img?.data?.length || 0), 0)
}

function isHeicFile(file) {
  const type = (file.type || '').toLowerCase()
  if (type === 'image/heic' || type === 'image/heif') return true
  return /\.(heic|heif)$/i.test(file.name || '')
}

async function toJpegSource(file) {
  if (!isHeicFile(file)) return file

  let heic2any
  try {
    ;({ default: heic2any } = await import('heic2any'))
  } catch {
    throw new Error(
      'Trình duyệt không hỗ trợ chuyển đổi ảnh HEIC. Vui lòng chuyển ảnh sang JPEG/PNG trước, hoặc dùng chế độ dán text.'
    )
  }

  try {
    const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
    return Array.isArray(converted) ? converted[0] : converted
  } catch {
    throw new Error(
      'Không thể chuyển đổi ảnh HEIC sang JPEG. Vui lòng chuyển ảnh sang JPEG/PNG trước, hoặc dùng chế độ dán text.'
    )
  }
}

// Converts (if needed), downsizes, and re-encodes an uploaded image as JPEG.
// Returns a previewUrl built from the final JPEG blob so the thumbnail always
// renders even for source formats (e.g. HEIC) the browser can't display directly.
export async function compressImageToBase64(file, { maxDimension = MAX_DIMENSION, quality = JPEG_QUALITY } = {}) {
  const source = await toJpegSource(file)

  return new Promise((resolve, reject) => {
    const img = new Image()
    const sourceUrl = URL.createObjectURL(source)

    img.onload = () => {
      let { width, height } = img
      if (width > maxDimension || height > maxDimension) {
        const scale = maxDimension / Math.max(width, height)
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(sourceUrl)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Không thể xử lý ảnh này. Vui lòng thử ảnh khác hoặc dùng chế độ dán text.'))
            return
          }
          const reader = new FileReader()
          reader.onload = () => {
            const dataUrl = reader.result
            resolve({
              mediaType: 'image/jpeg',
              data: dataUrl.slice(dataUrl.indexOf(',') + 1),
              previewUrl: URL.createObjectURL(blob),
            })
          }
          reader.onerror = () => reject(new Error('Không thể đọc file ảnh.'))
          reader.readAsDataURL(blob)
        },
        'image/jpeg',
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(sourceUrl)
      reject(
        new Error(
          'Không thể đọc file ảnh này (định dạng có thể không được hỗ trợ). Vui lòng thử ảnh JPEG/PNG hoặc dùng chế độ dán text.'
        )
      )
    }

    img.src = sourceUrl
  })
}
