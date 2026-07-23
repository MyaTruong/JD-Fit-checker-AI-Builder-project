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
    if (response.status === 413) {
      throw new Error('Ảnh gửi lên quá nặng. Vui lòng dùng ít ảnh hơn hoặc ảnh dung lượng nhỏ hơn rồi thử lại.')
    }
    if (response.status === 502 || response.status === 504) {
      throw new Error('Server xử lý quá lâu (thường do quá nhiều ảnh). Vui lòng thử lại với ít ảnh hơn.')
    }
    throw new Error(
      'Server trả về dữ liệu không hợp lệ — có thể do ảnh quá lớn hoặc yêu cầu mất quá nhiều thời gian. Vui lòng thử lại với ít ảnh hơn hoặc ảnh nhỏ hơn.'
    )
  }

  if (!response.ok) {
    throw new Error(data?.error || `Lỗi server (${response.status}). Vui lòng thử lại.`)
  }

  return data
}
