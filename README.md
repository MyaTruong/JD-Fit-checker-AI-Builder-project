# JD Fit Checker

Web app giúp người dùng dán Job Description (JD) và profile cá nhân, nhận lại phân tích mức độ phù hợp (fit score, gaps, chân dung ứng viên lý tưởng).

## Tech stack

- React (Vite)
- Claude API (Anthropic) — sẽ tích hợp ở bước sau
- Deploy: Vercel

## Chạy project locally

```bash
npm install
npm run dev
```

Mở trình duyệt tại địa chỉ hiển thị trong terminal (mặc định `http://localhost:5173`).

## Cấu trúc thư mục

```
src/
  components/   # UI components (JDInput, ProfileInput, ResultsSection, ...)
  lib/          # Logic gọi API (Claude API sẽ được implement ở bước sau)
```

## Trạng thái hiện tại

Đây là bước khởi tạo khung project — giao diện chưa có logic phân tích thật, chưa gọi Claude API, chưa styling chi tiết, chưa deploy.
