# JD Fit Checker

Web app giúp người dùng dán Job Description (JD) và profile cá nhân, nhận lại phân tích mức độ phù hợp (fit score, gaps, chân dung ứng viên lý tưởng) bằng Claude API.

## Tech stack

- React (Vite)
- Claude API (Anthropic) — model `claude-sonnet-4-6`
- Deploy: Vercel (serverless function tại `api/analyze.js`)

## Cài đặt API key

1. Mở file `.env.local` ở thư mục gốc (đã có sẵn, không commit lên git).
2. Điền API key của bạn:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
3. Nếu server (`npm run dev`) đang chạy, khởi động lại để đọc key mới.

## Chạy project locally

```bash
npm install
npm run dev
```

Mở trình duyệt tại `http://localhost:5173`. Vite dev server đã tích hợp sẵn middleware xử lý `/api/analyze` ngay trên local — không cần cài Vercel CLI để test.

## Cấu trúc thư mục

```
src/
  components/     # UI components (JDInput, ProfileInput, ResultsSection)
  lib/            # claudeApi.js — gọi /api/analyze từ frontend
api/
  analyze.js      # Vercel serverless function — gọi Claude API (đọc ANTHROPIC_API_KEY server-side)
  _lib/analyzeCore.js  # Logic phân tích dùng chung giữa Vercel function và Vite dev middleware
```

## Cách hoạt động

1. Người dùng nhập JD (text hoặc upload ảnh) + profile.
2. Frontend gọi `POST /api/analyze`.
3. Server đọc `ANTHROPIC_API_KEY` từ biến môi trường, gọi Claude API (model `claude-sonnet-4-6`, hỗ trợ đọc ảnh trực tiếp) với system prompt yêu cầu trả về JSON.
4. Kết quả gồm: bảng requirements vs fit, fit score + decision (Apply/Consider/Skip), chân dung ứng viên lý tưởng, danh sách gaps.
5. Nếu decision là Apply/Consider, hiển thị thêm khối text gộp (JD + profile + kết quả phân tích + câu lệnh mẫu) kèm nút Copy để dùng tối ưu CV.

## Trạng thái hiện tại

Logic phân tích + gọi Claude API thật đã hoàn thành. Chưa làm: styling nâng cao, deploy lên Vercel.
