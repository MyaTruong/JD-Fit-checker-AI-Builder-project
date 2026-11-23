# PDF & DOCX Upload — State List + Test Plan

Written before implementation, per task working rules.

## Scope recap
- Add `.pdf` / `.docx` upload to JD and Profile fields, alongside existing text-paste and image modes.
- Extraction happens in the browser (pdf.js for PDF, mammoth for DOCX). Only extracted **text** is sent to `/api/analyze` — no file bytes leave the browser, so the existing Vercel body-size limit and `analyzeCore.js` / result schema are untouched.
- Legacy `.doc` is rejected with a clear message, not silently ignored.
- Max 10MB per file, 1 file per field.
- Scanned PDFs (no real text layer) fall back to rendering up to 3 pages as images and reuse the existing image-upload pipeline (same compression, same `/api/analyze` image path).

## State list (per field: JD and Profile, independently)

A field's "file" mode has its own local state machine, separate from `text`/`image` mode:

1. **idle** — drop zone / "Upload PDF hoặc DOCX" button shown, no file chosen yet. Paste-text and upload-image toggles remain available as sibling modes.
2. **extracting** — file picked, extraction in progress. Shows file name + spinner/progress text. Upload control disabled while this runs.
3. **success** — extraction produced usable text (or, for scanned PDFs, usable fallback images). Shows:
   - File chip: file name, page count, character count (or "N trang (ảnh)" for the image-fallback case)
   - Collapsible "Xem / sửa nội dung trích xuất" — editable textarea pre-filled with the extracted text (hidden by default, expands on click). Edits here become the text actually sent for analysis.
   - "Xóa file" (remove) button — clears back to **idle** and discards extracted text/images.
4. **error** — extraction failed. Shows the file name, a specific message, and a clear next step. Analyze button stays disabled for that field until resolved (remove file / try another / switch to paste). Sub-types:
   - `unsupported_type` — not .pdf/.docx (incl. legacy `.doc`) → "Định dạng không được hỗ trợ. Vui lòng lưu lại dưới dạng .docx hoặc PDF."
   - `too_large` — file > 10MB → "File vượt quá 10MB. Vui lòng dùng file nhỏ hơn."
   - `password_protected` — PDF requires a password → "File PDF có mật khẩu bảo vệ. Vui lòng mở khóa file rồi thử lại, hoặc dán nội dung dạng text."
   - `scanned_fallback_failed` — PDF has no text layer AND rendering pages as images also failed → "Không thể đọc nội dung từ file này (có thể là bản scan). Vui lòng dán nội dung dạng text."
   - `too_short` — extracted text < 200 characters (and not classified as scanned) → "Nội dung trích xuất quá ngắn (dưới 200 ký tự). Vui lòng kiểm tra file hoặc dán nội dung dạng text."
   - `read_failed` — generic parse exception (corrupt file, etc.) → "Không thể đọc file này. Vui lòng thử file khác hoặc dán nội dung dạng text."

### Scanned-PDF path (not a dead end, not silent)
If the PDF's text layer yields near-zero text (heuristic: < 20 chars/page average):
1. Attempt to render up to the first 3 pages to JPEG images (same 1600px/0.75-quality pipeline as the existing image mode).
2. On success: switch that field to **image mode** automatically with those pages pre-loaded (existing thumbnail grid, existing remove-per-image control), and show a one-line note "Đã phát hiện file scan — chuyển sang {N} ảnh." The field's own state becomes effectively image-mode's "has images" state, not a new state.
3. On failure (render also fails, or PDF has >3 pages and rendering the first 3 still yields nothing usable): **error / `scanned_fallback_failed`**.

## Test file list

- `src/lib/fileExtract.test-notes.md` *(manual test notes, no automated test runner in this repo — see "Manual acceptance tests" below)*
- Exercises `src/lib/fileExtract.js`:
  - `extractPdfText()` — 1-page text PDF, 3-page text PDF, scanned PDF (no text layer), password-protected PDF, corrupt/non-PDF file renamed `.pdf`
  - `extractDocxText()` — normal DOCX, DOCX with < 200 chars, legacy `.doc` renamed `.docx` (should still fail gracefully if mammoth can't parse it), corrupt file
  - `validateFile()` — oversized file (>10MB), unsupported extension (`.txt`, `.doc`, `.pages`)
- Exercises `src/components/FileUploadField.jsx` (shared by JDInput/ProfileInput):
  - idle → extracting → success transition
  - idle → extracting → error (each error sub-type above)
  - success → remove → idle
  - editing extracted text in the collapsible preview updates what gets analyzed
- Exercises `src/App.jsx` wiring:
  - Analyze button stays enabled/disabled correctly while a field is in `extracting` or `error` state
  - Result JSON shape from `/api/analyze` is unchanged whether the source was paste, image, or file-extracted text

## Manual acceptance tests (run before merging)

1. 1-page CV PDF exported from Canva → upload → extract → analyze → result renders.
2. 3-page CV PDF exported from Google Docs → same.
3. 3-page CV PDF exported from Word → same.
4. DOCX CV (Word, typical length) → extract → analyze → result renders.
5. Scanned PDF (image-only, e.g. a photographed CV saved as PDF) → auto-falls back to image mode, analysis completes.
6. Legacy `.doc` file → error shown, Analyze button disabled for that field.
7. 12MB PDF → `too_large` error, Analyze button disabled for that field.
8. Mobile Safari and Chrome (iOS) → file picker opens and accepts the upload.
9. Compare one result from file-upload text against the same CV pasted as text → same JSON shape/fields (`requirements`, `fit_score`, `decision`, `score_reasoning`, `ideal_candidate`, `strengths_to_highlight`, `gaps`).
10. Analytics events appear in the browser console for each step (`upload_started`, `extract_success` / `extract_failed`, `analysis_completed` / `analysis_failed`).

## Analytics events

| Event | When | Payload |
|---|---|---|
| `upload_started` | File picked, before extraction begins | `{ field: 'jd'\|'profile', type: 'pdf'\|'docx' }` |
| `extract_success` | Extraction (text or scanned-image fallback) succeeds | `{ field, type, pages, chars }` (`chars` omitted for image fallback) |
| `extract_failed` | Any error state above | `{ field, type, reason }` (`reason` = one of the error sub-type codes) |
| `analysis_completed` | `/api/analyze` returns 200 | `{ jdMode, profileMode }` |
| `analysis_failed` | `/api/analyze` throws/errors | `{ jdMode, profileMode, reason }` |

Implementation: a tiny `src/lib/analytics.js` `track(event, payload)` that `console.log`s with a `[analytics]` prefix (no backend wired up yet — this keeps the event names/shapes stable for whenever one is added).

## Explicitly out of scope for this task
- No change to the Claude analysis prompt (`api/_lib/analyzeCore.js` `SYSTEM_PROMPT`) or to the result UI (`ResultsSection.jsx`).
- No password-entry UI for protected PDFs.
- No DOCX-embedded-image fallback (only the scanned-PDF path renders page images).
