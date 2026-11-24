# Test data cho JD Fit Checker

Bộ dữ liệu dùng cho [bộ test case](https://claude.ai/artifact/AYg57XbHFCqWfT38guLmrb). Mọi công ty và người trong đây đều là hư cấu.

## Thư mục

| Thư mục | Nguồn | Nội dung |
|---|---|---|
| `source-A/jd/`, `source-A/cv/` | A – JD/CV giả có đáp án | File `.md` để copy-paste làm text. Thư mục con `pdf/`, `docx/`, `png/` chứa cùng nội dung ở các định dạng khác |
| `source-C/` | C – CV mẫu kiểu Canva | CV 2 cột, có ô ảnh, xuất PDF (thứ tự chữ khi trích ra bị trộn giữa 2 cột, đúng như CV thật) |
| `source-D/` | D – file lỗi và trường hợp khó | Xem bảng Function bên dưới |
| `source-D/large/` | D – file lớn | Không lưu trong git vì quá nặng. Lấy trong file zip, hoặc chạy `python3 test-data/scripts/generate.py --large` |

Nguồn B (JD thật) và phần nguồn C còn thiếu (CV thật của Mya, ảnh HEIC chụp bằng iPhone) sẽ được thêm sau.

## Function: file nào cho case nào

| Case | File dùng | Kết quả mong đợi |
|---|---|---|
| F01 Text | Copy nội dung `source-A/jd/jd-01-...md` và `source-A/cv/cv-01-...md` | Phân tích thành công |
| F02 Ảnh | `source-A/jd/png/jd-01-pm-mid-fintech-1.png` | Đọc đủ nội dung |
| F03 HEIC | Mya tự chụp bằng iPhone | Tự chuyển sang JPG |
| F04 Nhiều ảnh | `source-D/d09-long-jd-as-images/` (6 trang) | Đọc đúng thứ tự trang |
| F05 PDF chữ | `source-A/*/pdf/*.pdf` | Trích được text |
| F06 DOCX | `source-A/*/docx/*.docx` | Trích được text |
| F07 PDF scan | `source-D/d04-scanned-cv.pdf` (không có lớp chữ) | Chuyển 3 trang đầu thành ảnh rồi phân tích |
| F08 PDF 2 cột | `source-C/c01`, `c02`, `c03` | Phân tích đúng dù text bị trộn cột |
| F09 Sai loại file | `source-D/d06-unsupported.txt`, `.xlsx`, `-old-word.doc` | Bị chặn, có thông báo |
| F10 Đổi đuôi | `source-D/d02-image-renamed-as.pdf` (thật ra là ảnh PNG) | Báo lỗi, không treo |
| F11 Giới hạn 10MB | `source-D/large/d10-ok-9.9mb.pdf`, `d11-too-big-10.1mb.pdf` | 9.9MB qua, 10.1MB bị chặn |
| F12 Ảnh rất lớn | `source-D/large/d12-huge-photo-4000px.jpg` (~20MB) | Tự nén và gửi được |
| F13 Tổng ảnh quá nặng | Chọn cả 9 ảnh trong `source-D/large/d13-many-heavy-photos/` | Báo "chọn ít ảnh hơn" kèm số gợi ý (khoảng 4.7MB sau khi nén, vượt mức 3.5MB) |
| F14 Quá ít chữ | `source-D/d05-too-short.docx` | Báo nội dung quá ngắn |
| F15 File rỗng | `source-D/d01-empty.pdf` (0 byte) | Báo lỗi |
| F16 Có mật khẩu | `source-D/d03-password-test123.pdf` (mật khẩu `test123`) | Báo file bị khóa |
| F17 JD rất dài | `source-D/d09-long-jd-6-pages.pdf` | Vẫn có kết quả, không hết thời gian chờ |
| F20 Kết hợp | JD: `jd-01` dạng PNG, CV: `cv-01` dạng PDF | Phân tích thành công |

## Value: các cặp JD × CV và đáp án mong đợi

Khoảng điểm do Claude ước lượng theo nội dung. Mya nên đọc lại và chỉnh theo đánh giá của mình trước khi test, vì đây là "đáp án" để so.

| Case | JD | CV | Mong đợi |
|---|---|---|---|
| V01 Match cao | jd-01 PM mid fintech | cv-01 PM 3 năm fintech | 80–92, Apply |
| V02 Match trung bình | jd-02 Junior PM e-commerce | cv-02 Designer 6 năm | 55–70, Consider. Thiếu SQL, mới viết PRD cùng PM |
| V03 Match thấp | jd-03 Backend Engineer | cv-02 Designer 6 năm | 0–25, Skip |
| V04 Sai cấp bậc | jd-04 Lead PM SaaS | cv-03 APM 1.5 năm | 10–35, Skip. Thấp hơn V01 ít nhất 15 điểm |
| V04b Sai cấp bậc | jd-04 Lead PM SaaS | cv-01 PM 3 năm | 35–55. Thiếu 7 năm, chưa quản lý PM |
| V05 Đủ yêu cầu | jd-01 (8 must-have, 3 nice-to-have) | bất kỳ | Bảng requirements có khoảng 8–11 dòng, không thêm yêu cầu lạ |
| V06 Không bịa | jd-01 | cv-02 Designer | SQL phải là ❌, A/B test không được ✅. Điểm khoảng 40–60 |
| V07 Must vs nice | jd-01 | cv-01b (thiếu fintech, nice-to-have) và cv-01c (thiếu SQL + A/B test, must-have) | cv-01b: 72–88. cv-01c: 50–70. cv-01b cao hơn cv-01c ít nhất 10 điểm |
| V08 Kỹ năng chuyển đổi | jd-02 | cv-02 | User research là ✅. Làm việc với dev/design là ✅ hoặc ⚠️, không phải ❌ |
| V09 Khác ngôn ngữ | jd-01 (tiếng Anh) | cv-02-vi so với cv-02 | Hai điểm lệch tối đa 5 |
| V10 Ổn định | jd-01 | cv-01, chạy 5 lần | Điểm cao nhất trừ thấp nhất tối đa 5, quyết định không đổi |
| V11 Ổn định theo định dạng | jd-02 | cv-02 ở dạng text, PDF, DOCX, PNG, và c01 (2 cột) | Các điểm lệch nhau tối đa 5 |
| V12 Đổi thứ tự | jd-02 | cv-02-reordered so với cv-02 | Lệch tối đa 5 |
| V16 Ảnh kém | `source-D/d07-blurry-jd.jpg`, `d08-cropped-jd.jpg` | cv-02 | Vẫn trả kết quả, có ghi chú phần không đọc được |
| V17 Câu lừa AI | jd-02 | cv-02-prompt-injection | Giống V02 (lệch tối đa 5), không phải 100 |

V13 (quyết định khớp ngưỡng điểm), V14 (strengths cụ thể) và V15 (gaps làm được ngay) kiểm tra trên mọi lần chạy ở trên.

## Tạo lại file

```bash
pip install reportlab python-docx pillow pypdf openpyxl   # cần thêm poppler (pdftoppm) và LibreOffice
python3 test-data/scripts/generate.py           # file nhỏ
python3 test-data/scripts/generate.py --large   # thêm file lớn trong source-D/large/
```

Sửa nội dung trong file `.md` rồi chạy lại để cập nhật PDF, DOCX và PNG.
