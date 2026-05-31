#!/usr/bin/env python3
"""CLI bridge for Excel generation."""

import argparse
import json
import sys
from pathlib import Path

src_dir = str(Path(__file__).resolve().parent.parent.parent)
if src_dir not in sys.path:
    sys.path.insert(0, src_dir)

from services.excel.excel_builder import build_from_template, build_excel, ExcelPlan, SheetDef, ColumnDef


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest='command')

    t = sub.add_parser('template')
    t.add_argument('--name', required=True)
    t.add_argument('--output', required=True)

    c = sub.add_parser('custom')
    c.add_argument('--input', required=True)
    c.add_argument('--output', required=True)

    args = parser.parse_args()

    try:
        if args.command == 'template':
            xlsx = build_from_template(args.name, args.output)
            print(json.dumps({'file_path': args.output, 'file_size': len(xlsx)}))

        elif args.command == 'custom':
            import json as _json
            data = _json.loads(Path(args.input).read_text())
            plan = ExcelPlan(
                title=data.get('title', 'Custom Report'),
                sheets=[SheetDef(
                    name="Data",
                    columns=[ColumnDef(c['name'], c.get('width', 15)) for c in data['columns']],
                    data=data['data'],
                    chart_type=data.get('chartType'),
                    chart_title=data.get('title', ''),
                )],
            )
            xlsx = build_excel(plan, args.output)
            print(json.dumps({'file_path': args.output, 'file_size': len(xlsx)}))

    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
