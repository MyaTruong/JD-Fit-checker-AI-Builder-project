import { runAnalysis } from './_lib/analyzeCore.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const result = await runAnalysis(req.body)
    res.status(200).json(result)
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Đã xảy ra lỗi không xác định.' })
  }
}
