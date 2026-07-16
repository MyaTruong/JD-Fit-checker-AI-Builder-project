import Anthropic from '@anthropic-ai/sdk'

const MODEL = 'claude-sonnet-4-6'

const SYSTEM_PROMPT = `Bạn là một chuyên gia tuyển dụng, chuyên phân tích mức độ phù hợp giữa Job Description (JD) và hồ sơ (profile) của ứng viên.

Nhiệm vụ của bạn, dựa trên JD và profile được cung cấp:
1. Liệt kê từng yêu cầu chính trong JD, đánh giá mức độ đáp ứng của profile với từng yêu cầu bằng một trong 3 ký hiệu: "✅" (đáp ứng đầy đủ), "⚠️" (đáp ứng một phần), "❌" (chưa đáp ứng). Kèm ghi chú ngắn gọn giải thích lý do.
2. Tính fit score tổng (một số nguyên từ 0 đến 100, thể hiện % phù hợp).
3. Dựa trên fit score, đưa ra quyết định: "Apply" nếu fit score >= 70, "Consider" nếu fit score từ 50 đến 69, "Skip" nếu fit score < 50.
4. Mô tả ngắn gọn (2-3 câu) "chân dung ứng viên lý tưởng" cho vị trí này theo JD.
5. Liệt kê 2-3 gap (khoảng cách) chính giữa profile và JD.

QUAN TRỌNG: Chỉ trả về DUY NHẤT một JSON object hợp lệ, không kèm bất kỳ text, markdown, hay code fence nào khác. JSON phải đúng cấu trúc sau:

{
  "requirements": [{"item": "string", "fit": "✅|⚠️|❌", "note": "string"}],
  "fit_score": number,
  "decision": "Apply|Consider|Skip",
  "ideal_candidate": "string",
  "gaps": ["string", "string"]
}`

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    const err = new Error(
      'ANTHROPIC_API_KEY chưa được cấu hình. Vui lòng thêm API key vào file .env.local rồi khởi động lại server.'
    )
    err.statusCode = 500
    throw err
  }
  return new Anthropic({ apiKey })
}

function imageBlock(image) {
  return {
    type: 'image',
    source: {
      type: 'base64',
      media_type: image.mediaType,
      data: image.data,
    },
  }
}

function buildUserContent({ jdMode, jdText, jdImages, profileMode, profileText, profileImages }) {
  const content = []

  if (jdMode === 'image') {
    content.push({
      type: 'text',
      text: `Đây là ${jdImages.length} ảnh chụp Job Description (theo đúng thứ tự trang), hãy đọc toàn bộ nội dung trước khi phân tích:`,
    })
    for (const image of jdImages) {
      content.push(imageBlock(image))
    }
  } else {
    content.push({ type: 'text', text: `Job Description:\n${jdText}` })
  }

  if (profileMode === 'image') {
    content.push({
      type: 'text',
      text: `Đây là ${profileImages.length} ảnh chụp CV/profile của ứng viên (theo đúng thứ tự trang), hãy đọc toàn bộ nội dung trước khi phân tích:`,
    })
    for (const image of profileImages) {
      content.push(imageBlock(image))
    }
  } else {
    content.push({ type: 'text', text: `Profile của ứng viên:\n${profileText}` })
  }

  return content
}

function extractJson(responseText) {
  const trimmed = responseText.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const candidate = fenced ? fenced[1] : trimmed

  let parsed
  try {
    parsed = JSON.parse(candidate)
  } catch {
    const err = new Error('Claude trả về dữ liệu không đúng định dạng JSON. Vui lòng thử lại.')
    err.statusCode = 502
    throw err
  }

  const requiredKeys = ['requirements', 'fit_score', 'decision', 'ideal_candidate', 'gaps']
  const missing = requiredKeys.filter((key) => !(key in parsed))
  if (missing.length > 0) {
    const err = new Error(`Kết quả phân tích thiếu trường: ${missing.join(', ')}.`)
    err.statusCode = 502
    throw err
  }

  return parsed
}

export function validateAnalyzeInput(body) {
  const { jdMode, jdText, jdImages, profileMode, profileText, profileImages } = body || {}

  if (profileMode === 'image') {
    if (!profileImages || profileImages.length === 0) {
      const err = new Error('Vui lòng upload ít nhất 1 ảnh CV/profile trước khi phân tích.')
      err.statusCode = 400
      throw err
    }
  } else if (!profileText || !profileText.trim()) {
    const err = new Error('Vui lòng nhập profile của bạn trước khi phân tích.')
    err.statusCode = 400
    throw err
  }

  if (jdMode === 'image') {
    if (!jdImages || jdImages.length === 0) {
      const err = new Error('Vui lòng upload ít nhất 1 ảnh Job Description trước khi phân tích.')
      err.statusCode = 400
      throw err
    }
  } else if (!jdText || !jdText.trim()) {
    const err = new Error('Vui lòng nhập nội dung Job Description trước khi phân tích.')
    err.statusCode = 400
    throw err
  }
}

export async function runAnalysis(body) {
  validateAnalyzeInput(body)
  const client = getClient()

  let response
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildUserContent(body),
        },
      ],
    })
  } catch (apiError) {
    let message
    if (apiError instanceof Anthropic.APIConnectionError) {
      message = 'Server không thể kết nối tới Claude API do lỗi mạng. Vui lòng thử lại sau.'
    } else if (apiError?.message) {
      message = `Lỗi từ Claude API: ${apiError.message}`
    } else {
      message = 'Lỗi khi gọi Claude API. Vui lòng thử lại.'
    }
    const err = new Error(message)
    err.statusCode = apiError?.status || 502
    throw err
  }

  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock) {
    const err = new Error('Claude không trả về nội dung phân tích.')
    err.statusCode = 502
    throw err
  }

  return extractJson(textBlock.text)
}
