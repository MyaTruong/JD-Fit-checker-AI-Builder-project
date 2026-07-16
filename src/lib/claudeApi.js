export async function analyzeJDFit({ jdMode, jdText, jdImage, profileMode, profileText, profileImages }) {
  let response
  try {
    response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jdMode,
        jdText,
        jdImage,
        profileMode,
        profileText,
        profileImages: (profileImages || []).map(({ mediaType, data }) => ({ mediaType, data })),
      }),
    })
  } catch {
    throw new Error('Không thể kết nối tới server. Vui lòng kiểm tra kết nối mạng và thử lại.')
  }

  let data
  try {
    data = await response.json()
  } catch {
    throw new Error('Server trả về dữ liệu không hợp lệ.')
  }

  if (!response.ok) {
    throw new Error(data?.error || `Lỗi server (${response.status}).`)
  }

  return data
}
