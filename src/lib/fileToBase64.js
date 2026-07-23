const MAX_DIMENSION = 1400
const JPEG_QUALITY = 0.75

export function compressImageToBase64(file, { maxDimension = MAX_DIMENSION, quality = JPEG_QUALITY } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

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
      URL.revokeObjectURL(objectUrl)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Không thể xử lý ảnh này. Vui lòng thử ảnh khác.'))
            return
          }
          const reader = new FileReader()
          reader.onload = () => {
            const dataUrl = reader.result
            resolve({
              mediaType: 'image/jpeg',
              data: dataUrl.slice(dataUrl.indexOf(',') + 1),
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
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Không thể đọc file ảnh. Vui lòng thử ảnh khác.'))
    }

    img.src = objectUrl
  })
}
