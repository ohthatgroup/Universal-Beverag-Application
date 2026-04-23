import argparse
import json
import sys

from pypdf import PdfReader


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Extract layout-preserving text lines from a PDF for section parsing."
    )
    parser.add_argument("pdf_path", help="Absolute or relative path to the source PDF.")
    args = parser.parse_args()

    reader = PdfReader(args.pdf_path)
    payload = {"pages": []}

    for index, page in enumerate(reader.pages, start=1):
        text = page.extract_text(extraction_mode="layout") or ""
        payload["pages"].append(
            {
                "pageNumber": index,
                "lines": text.splitlines(),
            }
        )

    json.dump(payload, sys.stdout, ensure_ascii=False)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
