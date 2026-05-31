"""AI-powered slide planner — phân tích nội dung và tạo slide outline.

Uses OpenAI to analyze document content and generate a structured
slide deck plan with titles, bullet points, and layout suggestions.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Literal

SlideType = Literal["title", "content", "bullets", "two-column", "image", "conclusion"]


@dataclass
class SlidePlan:
    """Plan for a single slide."""
    slide_number: int = 0
    slide_type: SlideType = "content"
    title: str = ""
    subtitle: str = ""
    bullets: list[str] = field(default_factory=list)
    left_content: str = ""
    right_content: str = ""
    notes: str = ""
    layout_hint: str = ""  # e.g. "dark", "light", "accent"


@dataclass
class DeckPlan:
    """Full presentation plan."""
    title: str = ""
    subtitle: str = ""
    theme: str = "professional"  # professional, creative, minimal, dark
    slides: list[SlidePlan] = field(default_factory=list)
    language: str = "vi"


SYSTEM_PROMPT = """You are a presentation expert. Given document content, create a structured slide deck plan.

RULES:
1. Create 8-15 slides depending on content length
2. First slide MUST be type "title" with title and subtitle
3. Last slide MUST be type "conclusion" with key takeaways
4. Use "bullets" for key points, "content" for paragraphs, "two-column" for comparisons
5. Each slide should have 3-5 bullet points max
6. Keep text concise — slides are visual aids, not documents
7. Speaker notes should elaborate on the bullet points
8. Match the language of the source content

OUTPUT FORMAT — return ONLY valid JSON:
{
  "title": "Presentation title",
  "subtitle": "Subtitle or tagline",
  "theme": "professional|creative|minimal|dark",
  "slides": [
    {
      "slide_number": 1,
      "slide_type": "title",
      "title": "Slide title",
      "subtitle": "Slide subtitle",
      "bullets": [],
      "notes": "Speaker notes"
    },
    {
      "slide_number": 2,
      "slide_type": "bullets",
      "title": "Section title",
      "bullets": ["Point 1", "Point 2", "Point 3"],
      "notes": "Elaboration for presenter"
    }
  ]
}"""


async def plan_slides(content: str, title: str = "", language: str = "vi") -> DeckPlan:
    """Use OpenAI to generate a slide deck plan from document content."""
    import openai

    # Truncate content to fit context window
    max_chars = 15000
    if len(content) > max_chars:
        content = content[:max_chars] + "\n\n[Content truncated...]"

    user_prompt = f"""Create a presentation plan from this document content.

Document title: {title or "Untitled"}
Language: {language}

Content:
{content}"""

    try:
        client = openai.AsyncOpenAI()
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
            max_tokens=4000,
            response_format={"type": "json_object"},
        )

        data = json.loads(response.choices[0].message.content)
        plan = DeckPlan(
            title=data.get("title", title),
            subtitle=data.get("subtitle", ""),
            theme=data.get("theme", "professional"),
            language=language,
        )

        for i, slide_data in enumerate(data.get("slides", [])):
            slide = SlidePlan(
                slide_number=i + 1,
                slide_type=slide_data.get("slide_type", "content"),
                title=slide_data.get("title", ""),
                subtitle=slide_data.get("subtitle", ""),
                bullets=slide_data.get("bullets", []),
                left_content=slide_data.get("left_content", ""),
                right_content=slide_data.get("right_content", ""),
                notes=slide_data.get("notes", ""),
                layout_hint=slide_data.get("layout_hint", ""),
            )
            plan.slides.append(slide)

        return plan

    except Exception as e:
        # Fallback: create basic plan from content structure
        return _fallback_plan(content, title, language)


def _fallback_plan(content: str, title: str, language: str) -> DeckPlan:
    """Create a basic plan without AI when API fails."""
    plan = DeckPlan(title=title or "Presentation", language=language)

    # Title slide
    plan.slides.append(SlidePlan(
        slide_number=1, slide_type="title",
        title=title or "Presentation",
        subtitle="Generated from document",
    ))

    # Split content into chunks
    paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
    slide_num = 2

    for para in paragraphs[:10]:
        if len(para) < 20:
            continue

        # Check if it looks like a heading
        if para.startswith("#"):
            heading = para.lstrip("#").strip()
            plan.slides.append(SlidePlan(
                slide_number=slide_num, slide_type="bullets",
                title=heading,
                bullets=["Key point from this section"],
            ))
        else:
            # Create content slide
            sentences = [s.strip() for s in para.split(".") if s.strip() and len(s.strip()) > 10]
            bullets = sentences[:5]
            plan.slides.append(SlidePlan(
                slide_number=slide_num, slide_type="bullets",
                title=f"Section {slide_num - 1}",
                bullets=bullets if bullets else [para[:200]],
            ))
        slide_num += 1

    # Conclusion slide
    plan.slides.append(SlidePlan(
        slide_number=slide_num, slide_type="conclusion",
        title="Conclusion" if language == "en" else "Kết luận",
        bullets=["Summary point 1", "Summary point 2", "Summary point 3"],
    ))

    return plan
