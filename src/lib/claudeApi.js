export async function analyzeJDFit({ jdMode, jdText, jdImages, profileMode, profileText, profileImages }) {
  let response
  try {
    response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jdMode,
        jdText,
        jdImages: (jdImages || []).map(({ mediaType, data }) => ({ mediaType, data })),
        profileMode,
        profileText,
        profileImages: (profileImages || []).map(({ mediaType, data }) => ({ mediaType, data })),
      }),
    })
  } catch {
    if (!navigator.onLine) {
      throw new Error('Mất kết nối mạng. Vui lòng kiểm tra kết nối Internet rồi thử lại.')
    }
    throw new Error('Không thể kết nối tới server. Vui lòng thử lại sau.')
  }

  let data
  try {
    data = await response.json()
  } catch {
    throw new Error('Server trả về dữ liệu không hợp lệ. Vui lòng thử lại.')
  }

  if (!response.ok) {
    throw new Error(data?.error || `Lỗi server (${response.status}). Vui lòng thử lại.`)
  }

  return data
}
