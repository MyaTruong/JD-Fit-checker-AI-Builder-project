import Anthropic from '@anthropic-ai/sdk'

const MODEL = 'claude-sonnet-4-6'

const SYSTEM_PROMPT = `Bạn là một chuyên gia tuyển dụng, chuyên phân tích mức độ phù hợp giữa Job Description (JD) và hồ sơ (profile) của ứng viên.

Nhiệm vụ của bạn, dựa trên JD và profile được cung cấp:
1. Liệt kê từng yêu cầu chính trong JD, đánh giá mức độ đáp ứng của profile với từng yêu cầu bằng một trong 3 ký hiệu: "✅" (đáp ứng đầy đủ), "⚠️" (đáp ứng một phần), "❌" (chưa đáp ứng). Kèm ghi chú ngắn gọn giải thích lý do.
2. Tính fit score tổng (một số nguyên từ 0 đến 100, thể hiện % phù hợp).
3. Dựa trên fit score, đưa ra quyết định: "Apply" nếu fit score >= 70, "Consider" nếu fit score từ 50 đến 69, "Skip" nếu fit score < 50.
4. Viết "score_reasoning": 1 đoạn 2-4 câu giải thích LOGIC đằng sau fit_score — không lặp lại bảng requirements, mà tổng hợp thành lý do có tính thuyết phục (điểm mạnh nào kéo điểm lên, gap nào kéo điểm xuống, vì sao rơi vào ngưỡng Apply/Consider/Skip).
5. Mô tả ngắn gọn (2-3 câu) "chân dung ứng viên lý tưởng" cho vị trí này theo JD.
6. Liệt kê 2-3 "strengths_to_highlight" — điểm mạnh của ứng viên nên được nhấn mạnh khi apply/phỏng vấn. Mỗi điểm mạnh phải: (a) match với 1 yêu cầu KHÓ/quan trọng trong JD, không phải yêu cầu chung chung, và (b) phần "why_it_matters" nêu rõ vì sao đây là lợi thế NGÁCH so với các ứng viên khác cùng apply — không chỉ liệt kê lại kinh nghiệm.
7. Liệt kê 2-3 "gaps" (khoảng cách) chính giữa profile và JD, mỗi gap kèm 1 "quick_action" — gợi ý hành động ngắn gọn trong 1 câu, cụ thể và có thể làm được ngay (KHÔNG viết roadmap dài hạn, không mốc thời gian, không kế hoạch học tập).

Nếu ảnh JD hoặc ảnh CV/profile khó đọc, mờ, bị cắt, hoặc thiếu thông tin: VẪN PHẢI trả về đúng cấu trúc JSON đầy đủ như bên dưới — dùng trường "note" (trong requirements) hoặc "gaps" để ghi chú rằng nội dung không rõ ràng/không đọc được. TUYỆT ĐỐI KHÔNG được từ chối phân tích, không hỏi lại người dùng, không viết câu giải thích thay vì JSON — hãy phân tích hết mức có thể với thông tin đọc được và nêu rõ phần không chắc chắn trong nội dung JSON.

QUAN TRỌNG: Câu trả lời của bạn phải bắt đầu bằng ký tự "{" và kết thúc bằng ký tự "}". Chỉ trả về DUY NHẤT một JSON object hợp lệ. TUYỆT ĐỐI KHÔNG thêm lời chào, lời dẫn, giải thích, ghi chú, hay markdown code fence (dấu \`\`\`) trước hoặc sau JSON. JSON phải đúng cấu trúc sau:

{
  "requirements": [{"item": "string", "fit": "✅|⚠️|❌", "note": "string"}],
  "fit_score": number,
  "decision": "Apply|Consider|Skip",
  "score_reasoning": "string",
  "ideal_candidate": "string",
  "strengths_to_highlight": [{"strength": "string", "why_it_matters": "string"}],
  "gaps": [{"gap": "string", "quick_action": "string"}]
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

// Cleans up common ways Claude's response deviates from pure JSON:
// markdown code fences, and any stray prose before/after the object.
function cleanJsonCandidate(responseText) {
  let text = responseText.trim()

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (fenced) {
    text = fenced[1].trim()
  }

  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1)
  }

  return text
}

function extractJson(responseText) {
  const candidate = cleanJsonCandidate(responseText)

  let parsed
  try {
    parsed = JSON.parse(candidate)
  } catch (parseError) {
    // This is a distinct failure mode from a failed API call: the request to
    // Claude succeeded, but the text it returned isn't valid JSON even after
    // stripping code fences/prose. Log the full raw text (not just the
    // cleaned candidate) so intermittent cases can be diagnosed from Vercel
    // function logs.
    console.error(
      '[analyzeCore] JSON.parse failed after cleaning:',
      parseError.message,
      '\nCleaned candidate:',
      candidate,
      '\nOriginal raw response:',
      responseText
    )
    const err = new Error(
      'Claude không trả về đúng định dạng JSON — có thể do ảnh khó đọc/mờ. Vui lòng thử ảnh rõ nét hơn hoặc dùng chế độ dán text.'
    )
    err.statusCode = 502
    throw err
  }

  const requiredKeys = [
    'requirements',
    'fit_score',
    'decision',
    'score_reasoning',
    'ideal_candidate',
    'strengths_to_highlight',
    'gaps',
  ]
  const missing = requiredKeys.filter((key) => !(key in parsed))
  if (missing.length > 0) {
    console.error(
      '[analyzeCore] Parsed JSON is missing required fields:',
      missing,
      '\nParsed object:',
      JSON.stringify(parsed)
    )
    const err = new Error(
      `Kết quả phân tích không đầy đủ (thiếu trường: ${missing.join(', ')}). Vui lòng thử lại, hoặc dùng ảnh rõ nét hơn/chế độ dán text nếu vẫn lỗi.`
    )
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

  console.log('[analyzeCore] Starting analysis:', {
    jdMode: body.jdMode,
    jdImageCount: body.jdImages?.length || 0,
    profileMode: body.profileMode,
    profileImageCount: body.profileImages?.length || 0,
  })

  let response
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 3072,
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
    console.error('[analyzeCore] Claude API call failed:', apiError)

    let message
    if (apiError instanceof Anthropic.APIConnectionError) {
      message = 'Server không thể kết nối tới Claude API do lỗi mạng. Vui lòng thử lại sau.'
    } else if (apiError?.message && /image|media_type/i.test(apiError.message)) {
      message =
        'Định dạng ảnh không được Claude hỗ trợ (chỉ nhận JPEG/PNG/GIF/WEBP). Vui lòng thử ảnh khác hoặc dùng chế độ dán text.'
    } else if (apiError?.message) {
      message = `Lỗi từ Claude API: ${apiError.message}`
    } else {
      message = 'Lỗi khi gọi Claude API. Vui lòng thử lại.'
    }
    const err = new Error(message)
    err.statusCode = apiError?.status || 502
    throw err
  }

  console.log('[analyzeCore] Claude responded, stop_reason:', response.stop_reason)

  if (response.stop_reason === 'max_tokens') {
    const err = new Error(
      'Kết quả phân tích bị cắt do quá dài (thường do quá nhiều ảnh). Vui lòng thử lại với ít ảnh hơn.'
    )
    err.statusCode = 502
    throw err
  }

  if (response.stop_reason === 'refusal') {
    console.error('[analyzeCore] Claude refused the request. stop_details:', JSON.stringify(response.stop_details))
    const err = new Error(
      'Claude từ chối phân tích nội dung này. Vui lòng kiểm tra lại ảnh/nội dung hoặc thử lại.'
    )
    err.statusCode = 502
    throw err
  }

  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock) {
    const err = new Error('Claude không trả về nội dung phân tích.')
    err.statusCode = 502
    throw err
  }

  // Always log the raw text Claude returned, before any cleaning/parsing —
  // this is what lets an intermittent failure be diagnosed after the fact
  // from Vercel function logs, instead of only when parsing happens to fail.
  console.log(`[analyzeCore] Raw response text (length=${textBlock.text.length}):`, textBlock.text)

  return extractJson(textBlock.text)
}
