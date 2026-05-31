"""PPTX Builder — generate native PowerPoint files from slide plans.

Uses python-pptx to create real editable PPTX with native shapes,
text boxes, and formatting. Inspired by ppt-master's approach.
"""

from __future__ import annotations

import io
from pathlib import Path
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

from .slide_planner import DeckPlan, SlidePlan


# ─── Theme definitions ───────────────────────────────────────

THEMES = {
    "professional": {
        "bg_color": RGBColor(0xFF, 0xFF, 0xFF),
        "title_color": RGBColor(0x1A, 0x36, 0x5D),
        "text_color": RGBColor(0x33, 0x33, 0x33),
        "accent_color": RGBColor(0x2B, 0x57, 0x9A),
        "subtitle_color": RGBColor(0x66, 0x66, 0x66),
        "bullet_color": RGBColor(0x2B, 0x57, 0x9A),
        "title_font_size": Pt(36),
        "body_font_size": Pt(18),
        "bullet_font_size": Pt(16),
    },
    "dark": {
        "bg_color": RGBColor(0x1A, 0x1A, 0x2E),
        "title_color": RGBColor(0xFF, 0xFF, 0xFF),
        "text_color": RGBColor(0xE0, 0xE0, 0xE0),
        "accent_color": RGBColor(0x00, 0xD2, 0xFF),
        "subtitle_color": RGBColor(0xA0, 0xA0, 0xA0),
        "bullet_color": RGBColor(0x00, 0xD2, 0xFF),
        "title_font_size": Pt(36),
        "body_font_size": Pt(18),
        "bullet_font_size": Pt(16),
    },
    "creative": {
        "bg_color": RGBColor(0xF5, 0xF0, 0xEB),
        "title_color": RGBColor(0xE8, 0x4D, 0x3D),
        "text_color": RGBColor(0x33, 0x33, 0x33),
        "accent_color": RGBColor(0xE8, 0x4D, 0x3D),
        "subtitle_color": RGBColor(0x77, 0x77, 0x77),
        "bullet_color": RGBColor(0xE8, 0x4D, 0x3D),
        "title_font_size": Pt(38),
        "body_font_size": Pt(18),
        "bullet_font_size": Pt(16),
    },
    "minimal": {
        "bg_color": RGBColor(0xFF, 0xFF, 0xFF),
        "title_color": RGBColor(0x00, 0x00, 0x00),
        "text_color": RGBColor(0x44, 0x44, 0x44),
        "accent_color": RGBColor(0x00, 0x00, 0x00),
        "subtitle_color": RGBColor(0x88, 0x88, 0x88),
        "bullet_color": RGBColor(0x00, 0x00, 0x00),
        "title_font_size": Pt(40),
        "body_font_size": Pt(20),
        "bullet_font_size": Pt(18),
    },
}


def _set_slide_bg(slide, color: RGBColor):
    """Set solid background color for a slide."""
    background = slide.background
    fill = background.fill
    fill.solid()
    fill.fore_color.rgb = color


def _add_text_box(slide, left, top, width, height, text, font_size, font_color,
                  bold=False, alignment=PP_ALIGN.LEFT, font_name="Calibri"):
    """Add a text box to a slide."""
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = font_size
    p.font.color.rgb = font_color
    p.font.bold = bold
    p.font.name = font_name
    p.alignment = alignment
    return txBox


def _add_accent_bar(slide, left, top, width, height, color: RGBColor):
    """Add a colored accent bar/rectangle."""
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()
    return shape


def build_title_slide(prs: Presentation, slide_plan: SlidePlan, theme: dict):
    """Build a title slide."""
    slide = prs.slides.add_slide(prs.slide_layouts[6])  # Blank layout
    _set_slide_bg(slide, theme["bg_color"])

    # Accent bar at top
    _add_accent_bar(slide, Inches(0), Inches(0), Inches(10), Inches(0.08), theme["accent_color"])

    # Title
    _add_text_box(slide,
        Inches(1), Inches(2.2), Inches(8), Inches(1.5),
        slide_plan.title,
        theme["title_font_size"], theme["title_color"],
        bold=True, alignment=PP_ALIGN.CENTER)

    # Subtitle
    if slide_plan.subtitle:
        _add_text_box(slide,
            Inches(1), Inches(3.8), Inches(8), Inches(0.8),
            slide_plan.subtitle,
            Pt(20), theme["subtitle_color"],
            alignment=PP_ALIGN.CENTER)

    # Bottom accent bar
    _add_accent_bar(slide, Inches(3), Inches(5), Inches(4), Inches(0.04), theme["accent_color"])

    # Speaker notes
    if slide_plan.notes:
        slide.notes_slide.notes_text_frame.text = slide_plan.notes


def build_bullets_slide(prs: Presentation, slide_plan: SlidePlan, theme: dict):
    """Build a bullet points slide."""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    _set_slide_bg(slide, theme["bg_color"])

    # Left accent bar
    _add_accent_bar(slide, Inches(0), Inches(0), Inches(0.08), Inches(7.5), theme["accent_color"])

    # Title
    _add_text_box(slide,
        Inches(0.8), Inches(0.5), Inches(8.5), Inches(0.8),
        slide_plan.title,
        Pt(28), theme["title_color"],
        bold=True)

    # Divider line
    _add_accent_bar(slide, Inches(0.8), Inches(1.3), Inches(2), Inches(0.04), theme["accent_color"])

    # Bullet points
    if slide_plan.bullets:
        txBox = slide.shapes.add_textbox(Inches(0.8), Inches(1.6), Inches(8.5), Inches(5))
        tf = txBox.text_frame
        tf.word_wrap = True

        for i, bullet in enumerate(slide_plan.bullets):
            if i == 0:
                p = tf.paragraphs[0]
            else:
                p = tf.add_paragraph()

            p.text = f"●  {bullet}"
            p.font.size = theme["bullet_font_size"]
            p.font.color.rgb = theme["text_color"]
            p.font.name = "Calibri"
            p.space_after = Pt(12)
            p.level = 0

    if slide_plan.notes:
        slide.notes_slide.notes_text_frame.text = slide_plan.notes


def build_content_slide(prs: Presentation, slide_plan: SlidePlan, theme: dict):
    """Build a content/paragraph slide."""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    _set_slide_bg(slide, theme["bg_color"])

    _add_accent_bar(slide, Inches(0), Inches(0), Inches(10), Inches(0.06), theme["accent_color"])

    # Title
    _add_text_box(slide,
        Inches(0.8), Inches(0.4), Inches(8.5), Inches(0.8),
        slide_plan.title,
        Pt(28), theme["title_color"],
        bold=True)

    # Content — combine bullets or use left/right content
    content_text = slide_plan.left_content or "\\n".join(slide_plan.bullets) or slide_plan.title
    _add_text_box(slide,
        Inches(0.8), Inches(1.5), Inches(8.5), Inches(5),
        content_text,
        theme["body_font_size"], theme["text_color"])

    if slide_plan.notes:
        slide.notes_slide.notes_text_frame.text = slide_plan.notes


def build_two_column_slide(prs: Presentation, slide_plan: SlidePlan, theme: dict):
    """Build a two-column comparison slide."""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    _set_slide_bg(slide, theme["bg_color"])

    _add_accent_bar(slide, Inches(0), Inches(0), Inches(10), Inches(0.06), theme["accent_color"])

    # Title
    _add_text_box(slide,
        Inches(0.8), Inches(0.4), Inches(8.5), Inches(0.8),
        slide_plan.title,
        Pt(28), theme["title_color"],
        bold=True)

    # Left column
    left_text = slide_plan.left_content or "\\n".join(slide_plan.bullets[:len(slide_plan.bullets)//2])
    _add_text_box(slide,
        Inches(0.8), Inches(1.5), Inches(4), Inches(5),
        left_text,
        theme["body_font_size"], theme["text_color"])

    # Divider
    _add_accent_bar(slide, Inches(4.9), Inches(1.5), Inches(0.03), Inches(5), theme["accent_color"])

    # Right column
    right_text = slide_plan.right_content or "\\n".join(slide_plan.bullets[len(slide_plan.bullets)//2:])
    _add_text_box(slide,
        Inches(5.2), Inches(1.5), Inches(4), Inches(5),
        right_text,
        theme["body_font_size"], theme["text_color"])

    if slide_plan.notes:
        slide.notes_slide.notes_text_frame.text = slide_plan.notes


def build_conclusion_slide(prs: Presentation, slide_plan: SlidePlan, theme: dict):
    """Build a conclusion/summary slide."""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    _set_slide_bg(slide, theme["accent_color"])

    # Title
    _add_text_box(slide,
        Inches(1), Inches(1), Inches(8), Inches(1.2),
        slide_plan.title,
        Pt(36), RGBColor(0xFF, 0xFF, 0xFF),
        bold=True, alignment=PP_ALIGN.CENTER)

    # Key takeaways
    if slide_plan.bullets:
        txBox = slide.shapes.add_textbox(Inches(1.5), Inches(2.5), Inches(7), Inches(4))
        tf = txBox.text_frame
        tf.word_wrap = True

        for i, bullet in enumerate(slide_plan.bullets):
            if i == 0:
                p = tf.paragraphs[0]
            else:
                p = tf.add_paragraph()
            p.text = f"✓  {bullet}"
            p.font.size = Pt(18)
            p.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
            p.font.name = "Calibri"
            p.space_after = Pt(16)
            p.alignment = PP_ALIGN.LEFT

    if slide_plan.notes:
        slide.notes_slide.notes_text_frame.text = slide_plan.notes


# Slide builder dispatch
SLIDE_BUILDERS = {
    "title": build_title_slide,
    "bullets": build_bullets_slide,
    "content": build_content_slide,
    "two-column": build_two_column_slide,
    "conclusion": build_conclusion_slide,
}


async def build_pptx(plan: DeckPlan, output_path: str | None = None) -> bytes:
    """Build a PPTX file from a DeckPlan. Returns file bytes."""
    prs = Presentation()

    # Set 16:9 aspect ratio
    prs.slide_width = Inches(10)
    prs.slide_height = Inches(7.5)

    theme = THEMES.get(plan.theme, THEMES["professional"])

    for slide_plan in plan.slides:
        builder = SLIDE_BUILDERS.get(slide_plan.slide_type, build_bullets_slide)
        builder(prs, slide_plan, theme)

    # Save to bytes
    buffer = io.BytesIO()
    prs.save(buffer)
    buffer.seek(0)
    pptx_bytes = buffer.read()

    # Optionally save to file
    if output_path:
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        Path(output_path).write_bytes(pptx_bytes)

    return pptx_bytes
