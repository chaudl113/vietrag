"""PPT Generator — orchestrates the full pipeline.

Document → Extract → Plan slides → Build PPTX → Return file
"""

from __future__ import annotations

import os
import uuid
from pathlib import Path
from dataclasses import dataclass

from .document_extractor import extract_document
from .slide_planner import plan_slides, DeckPlan
from .pptx_builder import build_pptx


@dataclass
class PPTGenerationResult:
    """Result of PPT generation."""
    file_path: str
    file_name: str
    file_size: int
    slide_count: int
    title: str
    theme: str


async def generate_ppt_from_file(
    file_path: str,
    output_dir: str = "/tmp/vietrag/ppt",
    theme: str = "professional",
    language: str = "vi",
) -> PPTGenerationResult:
    """Full pipeline: extract document → plan slides → build PPTX."""

    # Step 1: Extract document content
    doc = extract_document(file_path)
    markdown_content = doc.to_markdown()

    if not markdown_content.strip():
        raise ValueError("Không thể trích xuất nội dung từ tài liệu")

    # Step 2: AI-powered slide planning
    plan = await plan_slides(
        content=markdown_content,
        title=doc.title,
        language=language,
    )

    # Override theme if specified
    if theme != "professional":
        plan.theme = theme

    # Step 3: Build PPTX
    source_name = Path(file_path).stem
    output_filename = f"{source_name}_{uuid.uuid4().hex[:8]}.pptx"
    output_path = os.path.join(output_dir, output_filename)

    pptx_bytes = await build_pptx(plan, output_path)

    return PPTGenerationResult(
        file_path=output_path,
        file_name=f"{source_name}.pptx",
        file_size=len(pptx_bytes),
        slide_count=len(plan.slides),
        title=plan.title,
        theme=plan.theme,
    )


async def generate_ppt_from_text(
    text: str,
    title: str = "",
    output_dir: str = "/tmp/vietrag/ppt",
    theme: str = "professional",
    language: str = "vi",
) -> PPTGenerationResult:
    """Generate PPT from raw text content."""

    plan = await plan_slides(content=text, title=title, language=language)

    if theme != "professional":
        plan.theme = theme

    safe_title = "".join(c if c.isalnum() or c in "-_" else "_" for c in (title or "presentation"))[:50]
    output_filename = f"{safe_title}_{uuid.uuid4().hex[:8]}.pptx"
    output_path = os.path.join(output_dir, output_filename)

    pptx_bytes = await build_pptx(plan, output_path)

    return PPTGenerationResult(
        file_path=output_path,
        file_name=f"{safe_title}.pptx",
        file_size=len(pptx_bytes),
        slide_count=len(plan.slides),
        title=plan.title,
        theme=plan.theme,
    )
