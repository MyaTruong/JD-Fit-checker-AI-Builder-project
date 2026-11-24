"""Generate test files for JD Fit Checker from the Markdown sources.

Run from the repo root:
    python3 test-data/scripts/generate.py           # small files (committed)
    python3 test-data/scripts/generate.py --large   # also large files (not committed)

Needs: reportlab, python-docx, pillow, pypdf, openpyxl, and pdftoppm (poppler).
"""
import io
import os
import random
import re
import shutil
import subprocess
import sys
from pathlib import Path

from docx import Document
from docx.shared import Pt
from openpyxl import Workbook
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from pypdf import PdfReader, PdfWriter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (Frame, PageTemplate, BaseDocTemplate, Paragraph,
                                SimpleDocTemplate, Spacer, ListFlowable, ListItem,
                                FrameBreak)

ROOT = Path(__file__).resolve().parent.parent
FONT_DIR = Path("/usr/share/fonts/truetype/dejavu")
pdfmetrics.registerFont(TTFont("DejaVu", str(FONT_DIR / "DejaVuSans.ttf")))
pdfmetrics.registerFont(TTFont("DejaVu-Bold", str(FONT_DIR / "DejaVuSans-Bold.ttf")))
from reportlab.pdfbase.pdfmetrics import registerFontFamily
registerFontFamily("DejaVu", normal="DejaVu", bold="DejaVu-Bold", italic="DejaVu", boldItalic="DejaVu-Bold")

BASE = ParagraphStyle("base", fontName="DejaVu", fontSize=10, leading=14)
STYLES = {
    "h1": ParagraphStyle("h1", parent=BASE, fontName="DejaVu-Bold", fontSize=18, leading=22, spaceAfter=6),
    "h2": ParagraphStyle("h2", parent=BASE, fontName="DejaVu-Bold", fontSize=13, leading=17, spaceBefore=10, spaceAfter=4),
    "h3": ParagraphStyle("h3", parent=BASE, fontName="DejaVu-Bold", fontSize=11, leading=15, spaceBefore=6, spaceAfter=2),
    "p": ParagraphStyle("p", parent=BASE, spaceAfter=4),
}


# ---------- Markdown parsing ----------

def parse_md(text):
    """Return a list of (kind, text) blocks. kind: h1 h2 h3 p bullet number."""
    blocks = []
    for line in text.splitlines():
        s = line.strip()
        if not s:
            continue
        if s.startswith("### "):
            blocks.append(("h3", s[4:]))
        elif s.startswith("## "):
            blocks.append(("h2", s[3:]))
        elif s.startswith("# "):
            blocks.append(("h1", s[2:]))
        elif s.startswith("- "):
            blocks.append(("bullet", s[2:]))
        elif re.match(r"^\d+\. ", s):
            blocks.append(("number", re.sub(r"^\d+\. ", "", s)))
        else:
            blocks.append(("p", s))
    return blocks


def md_inline_to_rl(s):
    s = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)


def plain(s):
    return re.sub(r"\*\*(.+?)\*\*", r"\1", s)


# ---------- Writers ----------

def flowables(blocks):
    out, pending, kind = [], [], None

    def flush():
        nonlocal pending, kind
        if pending:
            items = [ListItem(Paragraph(md_inline_to_rl(t), STYLES["p"]), leftIndent=12) for t in pending]
            out.append(ListFlowable(items, bulletType="bullet" if kind == "bullet" else "1",
                                    start="•" if kind == "bullet" else 1,
                                    bulletFontName="DejaVu", leftIndent=14,
                                    **({} if kind == "bullet" else {"bulletFormat": "%s."})))
            pending, kind = [], None

    for k, t in blocks:
        if k in ("bullet", "number"):
            if kind and kind != k:
                flush()
            kind = k
            pending.append(t)
            continue
        flush()
        out.append(Paragraph(md_inline_to_rl(t), STYLES[k]))
    flush()
    return out


def write_pdf(blocks, path):
    doc = SimpleDocTemplate(str(path), pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm,
                            topMargin=18 * mm, bottomMargin=18 * mm)
    doc.build(flowables(blocks))


def write_docx(blocks, path):
    d = Document()
    d.styles["Normal"].font.name = "Arial"
    d.styles["Normal"].font.size = Pt(10.5)
    for k, t in blocks:
        if k == "h1":
            d.add_heading(plain(t), level=0)
        elif k == "h2":
            d.add_heading(plain(t), level=1)
        elif k == "h3":
            d.add_heading(plain(t), level=2)
        elif k == "bullet":
            d.add_paragraph(plain(t), style="List Bullet")
        elif k == "number":
            d.add_paragraph(plain(t), style="List Number")
        else:
            p = d.add_paragraph()
            for i, part in enumerate(re.split(r"\*\*(.+?)\*\*", t)):
                r = p.add_run(part)
                r.bold = i % 2 == 1
    d.save(str(path))


def pdf_to_pngs(pdf, out_prefix, dpi=110):
    subprocess.run(["pdftoppm", "-png", "-r", str(dpi), str(pdf), str(out_prefix)], check=True)
    return sorted(out_prefix.parent.glob(out_prefix.name + "-*.png"))


def build_formats(md_path):
    """For one .md file, write pdf/, docx/, png/ siblings."""
    base = md_path.parent
    name = md_path.stem
    blocks = parse_md(md_path.read_text(encoding="utf-8"))
    for sub in ("pdf", "docx", "png"):
        (base / sub).mkdir(exist_ok=True)
    pdf = base / "pdf" / f"{name}.pdf"
    write_pdf(blocks, pdf)
    write_docx(blocks, base / "docx" / f"{name}.docx")
    for old in (base / "png").glob(f"{name}-[0-9]*.png"):
        old.unlink()
    pdf_to_pngs(pdf, base / "png" / name)


# ---------- Source C: Canva-like two-column CV ----------

def two_column_cv(md_path, out_pdf, accent):
    blocks = parse_md(md_path.read_text(encoding="utf-8"))
    title = blocks[0][1]
    contact = blocks[1][1]
    # Sidebar = Skills, Education, Languages; main = everything else.
    side_names = {"Skills", "Education", "Languages", "Kỹ năng", "Học vấn", "Ngoại ngữ"}
    sections, cur = [], None
    for k, t in blocks[2:]:
        if k == "h2":
            cur = [t, []]
            sections.append(cur)
        elif cur:
            cur[1].append((k, t))
    side = [s for s in sections if s[0] in side_names]
    main = [s for s in sections if s[0] not in side_names]

    W, H = A4
    side_w = 68 * mm
    white = ParagraphStyle("w", parent=BASE, textColor=colors.white, fontSize=9, leading=12.5)
    white_h = ParagraphStyle("wh", parent=white, fontName="DejaVu-Bold", fontSize=11.5, leading=15,
                             spaceBefore=10, spaceAfter=4)
    name_st = ParagraphStyle("n", parent=white, fontName="DejaVu-Bold", fontSize=17, leading=21, alignment=1)
    contact_st = ParagraphStyle("c", parent=white, fontSize=8.5, leading=12, alignment=1)
    main_h = ParagraphStyle("mh", parent=STYLES["h2"], textColor=accent)

    def draw_bg(canvas, _doc):
        canvas.saveState()
        canvas.setFillColor(accent)
        canvas.rect(0, 0, side_w, H, stroke=0, fill=1)
        # Photo placeholder circle with initials
        cx, cy, r = side_w / 2, H - 38 * mm, 20 * mm
        canvas.setFillColor(colors.HexColor("#F2E6DA"))
        canvas.circle(cx, cy, r, stroke=0, fill=1)
        canvas.setFillColor(accent)
        canvas.setFont("DejaVu-Bold", 22)
        initials = "".join(w[0] for w in title.split()[-2:]).upper()
        canvas.drawCentredString(cx, cy - 8, initials)
        canvas.restoreState()

    side_frame = Frame(6 * mm, 10 * mm, side_w - 12 * mm, H - 72 * mm, id="side")
    main_frame = Frame(side_w + 10 * mm, 12 * mm, W - side_w - 20 * mm, H - 24 * mm, id="main")
    doc = BaseDocTemplate(str(out_pdf), pagesize=A4)
    doc.addPageTemplates([PageTemplate(id="cv", frames=[side_frame, main_frame], onPage=draw_bg)])

    story = [Paragraph(md_inline_to_rl(title), name_st),
             Paragraph(md_inline_to_rl(contact).replace(" · ", "<br/>"), contact_st)]
    for head, items in side:
        story.append(Paragraph(head.upper(), white_h))
        for k, t in items:
            for piece in (t.split(", ") if head in ("Skills", "Kỹ năng") else [t]):
                story.append(Paragraph("• " + md_inline_to_rl(piece), white))
    story.append(FrameBreak())
    for head, items in main:
        story.append(Paragraph(head.upper(), main_h))
        story.extend(flowables(items))
    doc.build(story)


# ---------- Source D: broken / edge-case files ----------

def make_source_d(large=False):
    d = ROOT / "source-D"
    d.mkdir(exist_ok=True)
    a_jd = ROOT / "source-A" / "jd"
    a_cv = ROOT / "source-A" / "cv"

    # D01 empty file
    (d / "d01-empty.pdf").write_bytes(b"")
    # D02 a JPG renamed to .pdf
    shutil.copy(next((a_jd / "png").glob("jd-01-pm-mid-fintech-*.png")), d / "d02-image-renamed-as.pdf")
    # D03 password-protected PDF (password: test123)
    r = PdfReader(str(a_jd / "pdf" / "jd-01-pm-mid-fintech.pdf"))
    w = PdfWriter()
    for p in r.pages:
        w.add_page(p)
    w.encrypt(user_password="test123", owner_password="owner123")
    with open(d / "d03-password-test123.pdf", "wb") as f:
        w.write(f)
    # D04 scanned PDF: page images only, slightly rotated and grey, no text layer
    pages = []
    for png in sorted((a_cv / "png").glob("cv-02-designer-6y-[0-9]*.png")):
        im = Image.open(png).convert("L").rotate(0.8, expand=True, fillcolor=235)
        im = im.filter(ImageFilter.GaussianBlur(0.6)).convert("RGB")
        pages.append(im)
    pages[0].save(d / "d04-scanned-cv.pdf", save_all=True, append_images=pages[1:], resolution=110)
    # D05 too little text (< 200 characters)
    doc = Document()
    doc.add_paragraph("Tuyển PM gấp. Lương tốt. Liên hệ HR.")
    doc.save(str(d / "d05-too-short.docx"))
    # D06 file types the app should reject
    (d / "d06-unsupported.txt").write_text((a_jd / "jd-01-pm-mid-fintech.md").read_text(encoding="utf-8"), encoding="utf-8")
    wb = Workbook()
    wb.active["A1"] = "This is a spreadsheet, not a JD"
    wb.save(str(d / "d06-unsupported.xlsx"))
    subprocess.run(["soffice", "--headless", "--convert-to", "doc", "--outdir", str(d),
                    str(a_jd / "docx" / "jd-01-pm-mid-fintech.docx")], check=True, capture_output=True)
    os.replace(d / "jd-01-pm-mid-fintech.doc", d / "d06-unsupported-old-word.doc")
    # D07 blurry photo of a JD, D08 cropped photo (bottom half missing)
    jd_png = Image.open(next((a_jd / "png").glob("jd-02-pm-junior-ecommerce-*.png"))).convert("RGB")
    jd_png.filter(ImageFilter.GaussianBlur(3.2)).save(d / "d07-blurry-jd.jpg", quality=80)
    jd_png.crop((0, 0, jd_png.width, int(jd_png.height * 0.45))).save(d / "d08-cropped-jd.jpg", quality=85)
    # D09 long JD (6+ pages) for the timeout test
    long_md = ROOT / "source-D" / "d09-long-jd-6-pages.md"
    base = (a_jd / "jd-01-pm-mid-fintech.md").read_text(encoding="utf-8")
    filler = ("PayNest builds simple and safe payment experiences. Our teams work in small squads, "
              "share learnings every week, and care about clear writing, kind feedback and fast decisions. ") * 6
    extra = ["\n## About PayNest in detail\n"]
    for i in range(1, 19):
        extra.append(f"### Team value {i}\n{filler}\n")
    long_md.write_text(base + "\n".join(extra), encoding="utf-8")
    write_pdf(parse_md(long_md.read_text(encoding="utf-8")), d / "d09-long-jd-6-pages.pdf")
    pages_dir = d / "d09-long-jd-as-images"
    pages_dir.mkdir(exist_ok=True)
    for old in pages_dir.glob("*.png"):
        old.unlink()
    pdf_to_pngs(d / "d09-long-jd-6-pages.pdf", pages_dir / "page")

    if large:
        big = d / "large"
        big.mkdir(exist_ok=True)
        src_pdf = a_jd / "pdf" / "jd-01-pm-mid-fintech.pdf"
        # D10 / D11: PDFs just under and just over the 10MB limit (padding in a PDF attachment)
        for name, size in (("d10-ok-9.9mb.pdf", int(9.9 * 1024 * 1024)), ("d11-too-big-10.1mb.pdf", int(10.1 * 1024 * 1024))):
            r = PdfReader(str(src_pdf))
            w = PdfWriter()
            for p in r.pages:
                w.add_page(p)
            buf = io.BytesIO()
            w.write(buf)
            pad = max(0, size - buf.tell() - 400)
            w.add_attachment("padding.bin", os.urandom(pad))
            with open(big / name, "wb") as f:
                w.write(f)
        # D12 one very large photo (4000px, > 10MB)
        rnd = random.Random(1)
        im = Image.new("RGB", (4000, 5300), "white")
        noise = Image.effect_noise((4000, 5300), 60).convert("RGB")
        jd = Image.open(next((a_jd / "png").glob("jd-01-pm-mid-fintech-*.png"))).convert("RGB").resize((4000, 5300))
        Image.blend(jd, noise, 0.25).save(big / "d12-huge-photo-4000px.jpg", quality=100, subsampling=0)
        # D13 several heavy photos (total stays > 3.5MB even after the app compresses them)
        many = big / "d13-many-heavy-photos"
        many.mkdir(exist_ok=True)
        for i in range(1, 10):
            n = Image.effect_noise((2400, 3200), 70 + i).convert("RGB")
            Image.blend(jd.resize((2400, 3200)), n, 0.35).save(many / f"photo-{i}.jpg", quality=90)


def main():
    large = "--large" in sys.argv
    for md in sorted((ROOT / "source-A").glob("*/*.md")):
        build_formats(md)
    c = ROOT / "source-C"
    c.mkdir(exist_ok=True)
    two_column_cv(ROOT / "source-A" / "cv" / "cv-02-designer-6y.md", c / "c01-designer-2-columns.pdf", colors.HexColor("#8A4B2A"))
    two_column_cv(ROOT / "source-A" / "cv" / "cv-02-designer-6y-vi.md", c / "c02-designer-2-columns-vi.pdf", colors.HexColor("#2F5D62"))
    two_column_cv(ROOT / "source-A" / "cv" / "cv-01-pm-3y-fintech.md", c / "c03-pm-2-columns.pdf", colors.HexColor("#3B3F73"))
    make_source_d(large)
    print("done")


if __name__ == "__main__":
    main()
