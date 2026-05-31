#!/usr/bin/env python3
"""CLI bridge for PPT generation — called by Express backend via subprocess."""

import argparse
import asyncio
import json
import sys
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))

from services.ppt.generator import generate_ppt_from_file


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['generate'])
    parser.add_argument('--file', required=True)
    parser.add_argument('--title', default='')
    parser.add_argument('--theme', default='professional')
    parser.add_argument('--language', default='vi')
    parser.add_argument('--output-dir', default='/tmp/vietrag/ppt')
    args = parser.parse_args()

    try:
        Path(args.output_dir).mkdir(parents=True, exist_ok=True)
        result = await generate_ppt_from_file(
            file_path=args.file,
            output_dir=args.output_dir,
            theme=args.theme,
            language=args.language,
        )
        print(json.dumps({
            'file_path': result.file_path,
            'file_name': result.file_name,
            'file_size': result.file_size,
            'slide_count': result.slide_count,
            'title': result.title,
            'theme': result.theme,
        }))
    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    asyncio.run(main())
