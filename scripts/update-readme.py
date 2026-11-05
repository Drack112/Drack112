
from pathlib import Path

README = Path("README.md")
OUTPUT_DIR = Path(".agent-ascii-out")

START = "<!-- LUCKYURO-START -->"
END = "<!-- LUCKYURO-END -->"

readme = README.read_text(encoding="utf-8")

# Search recursively instead of only checking the root directory.
ascii_files = sorted(OUTPUT_DIR.rglob("*.txt"))

if not ascii_files:
    generated_files = (
        [str(path) for path in OUTPUT_DIR.rglob("*") if path.is_file()]
        if OUTPUT_DIR.exists()
        else []
    )

    raise RuntimeError(
        "No ASCII .txt file was generated.\n"
        f"Output directory: {OUTPUT_DIR.resolve()}\n"
        f"Existing files: {generated_files}"
    )

if START not in readme or END not in readme:
    raise RuntimeError("Luckyuro markers not found in README.md")

start_index = readme.index(START) + len(START)
end_index = readme.index(END)

if start_index >= end_index:
    raise RuntimeError("Invalid Luckyuro marker order")

ascii_art = ascii_files[0].read_text(
    encoding="utf-8"
).rstrip()

replacement = f"""

```text
{ascii_art}
```

"""

updated_readme = (
    readme[:start_index]
    + replacement
    + readme[end_index:]
)

README.write_text(updated_readme, encoding="utf-8")

print(f"README updated using: {ascii_files[0]}")
