
from pathlib import Path

README = Path("README.md")
OUTPUT_DIR = Path(".agent-ascii-out")

START = "<!-- LUCKYURO-START -->"
END = "<!-- LUCKYURO-END -->"

ascii_files = sorted(OUTPUT_DIR.rglob("*.txt"))

if not ascii_files:
    raise RuntimeError(
        f"No ASCII output found in {OUTPUT_DIR.resolve()}"
    )

if len(ascii_files) > 1:
    print(f"Multiple outputs found: {ascii_files}")

ascii_art = ascii_files[0].read_text(
    encoding="utf-8"
).rstrip()

if not ascii_art:
    raise RuntimeError("Generated ASCII file is empty")

readme = README.read_text(encoding="utf-8")

if START not in readme or END not in readme:
    raise RuntimeError("Luckyuro README markers are missing")

start_index = readme.index(START) + len(START)
end_index = readme.index(END)

if start_index >= end_index:
    raise RuntimeError("Invalid README marker positions")

replacement = (
    "\n\n```text\n"
    + ascii_art
    + "\n```\n\n"
)

updated = (
    readme[:start_index]
    + replacement
    + readme[end_index:]
)

README.write_text(updated, encoding="utf-8")

print(f"Luckyuro ASCII updated from {ascii_files[0]}")
