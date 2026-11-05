from pathlib import Path

README = Path("README.md")
OUTPUT_DIR = Path(".agent-ascii-out")

START = "<!-- LUCKYURO-START -->"
END = "<!-- LUCKYURO-END -->"

readme = README.read_text(encoding="utf-8")

ascii_files = sorted(OUTPUT_DIR.glob("*.txt"))
if len(ascii_files) != 1:
    raise RuntimeError(
        f"Expected exactly one ASCII .txt file in {OUTPUT_DIR}, "
        f"found {len(ascii_files)}"
    )

ascii_art = ascii_files[0].read_text(encoding="utf-8").rstrip()

if START not in readme or END not in readme:
    raise RuntimeError(
        f"README.md must contain {START} and {END} on separate lines"
    )

start_index = readme.index(START) + len(START)
end_index = readme.index(END)

if start_index >= end_index:
    raise RuntimeError("Invalid Luckyuro marker order in README.md")

replacement = f"\n\n```text\n{ascii_art}\n```\n\n"
updated_readme = readme[:start_index] + replacement + readme[end_index:]

README.write_text(updated_readme, encoding="utf-8")
print(f"README updated using {ascii_files[0]}")
