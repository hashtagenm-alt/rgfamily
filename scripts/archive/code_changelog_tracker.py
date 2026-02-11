"""
Code Changelog Tracker for RG Family Project
Auto-generates markdown documentation for code changes
"""

import os
from datetime import datetime
from pathlib import Path

class CodeChangeLogger:
    def __init__(self, project_name: str, user_request: str = ""):
        self.project_name = project_name
        self.user_request = user_request
        self.changes = []
        self.timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.reviews_dir = Path("reviews")
        self.reviews_dir.mkdir(exist_ok=True)

    def log_file_creation(self, filepath: str, code_snippet: str, reason: str):
        self.changes.append({
            "type": "creation",
            "filepath": filepath,
            "code": code_snippet[:500] + "..." if len(code_snippet) > 500 else code_snippet,
            "reason": reason
        })

    def log_file_modification(self, filepath: str, old_code: str, new_code: str, reason: str):
        self.changes.append({
            "type": "modification",
            "filepath": filepath,
            "old_code": old_code[:300] + "..." if len(old_code) > 300 else old_code,
            "new_code": new_code[:300] + "..." if len(new_code) > 300 else new_code,
            "reason": reason
        })

    def log_file_deletion(self, filepath: str, reason: str):
        self.changes.append({
            "type": "deletion",
            "filepath": filepath,
            "reason": reason
        })

    def _generate_markdown(self) -> str:
        md = f"""# {self.project_name}

**Date:** {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
**User Request:** {self.user_request}

---

## Changes Summary

| Type | File | Reason |
|------|------|--------|
"""
        for change in self.changes:
            md += f"| {change['type'].upper()} | `{change['filepath']}` | {change['reason']} |\n"

        md += "\n---\n\n## Detailed Changes\n\n"

        for i, change in enumerate(self.changes, 1):
            md += f"### {i}. {change['filepath']}\n\n"
            md += f"**Type:** {change['type'].upper()}\n"
            md += f"**Reason:** {change['reason']}\n\n"

            if change['type'] == 'creation':
                md += f"```\n{change['code']}\n```\n\n"
            elif change['type'] == 'modification':
                md += "**Before:**\n"
                md += f"```\n{change['old_code']}\n```\n\n"
                md += "**After:**\n"
                md += f"```\n{change['new_code']}\n```\n\n"

        return md

    def _update_summary(self):
        """Update SUMMARY.md with all changelog files"""
        files = sorted(self.reviews_dir.glob("*.md"), reverse=True)
        files = [f for f in files if f.name not in ["README.md", "SUMMARY.md"]]

        summary = "# Summary\n\n* [Home](README.md)\n\n## Changelogs\n\n"
        for f in files:
            name = f.stem
            summary += f"* [{name}]({f.name})\n"

        (self.reviews_dir / "SUMMARY.md").write_text(summary)

    def _update_index_html(self):
        """Update index.html with file list"""
        files = sorted(self.reviews_dir.glob("*.md"), reverse=True)
        files = [f for f in files if f.name not in ["README.md", "SUMMARY.md"]]

        file_links = "\n".join([
            f'        <a href="#" onclick="loadFile(\'{f.name}\')" class="nav-link">{f.stem}</a>'
            for f in files
        ])

        default_file = files[0].name if files else "README.md"

        html = f'''<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code Changelog - RG Family</title>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0d1117;
            color: #c9d1d9;
            display: flex;
            min-height: 100vh;
        }}
        .sidebar {{
            width: 280px;
            background: #161b22;
            border-right: 1px solid #30363d;
            padding: 1rem;
            overflow-y: auto;
            position: fixed;
            height: 100vh;
        }}
        .sidebar h2 {{
            color: #f0f6fc;
            font-size: 1.2rem;
            margin-bottom: 1rem;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid #30363d;
        }}
        .nav-link {{
            display: block;
            padding: 0.5rem 0.75rem;
            color: #8b949e;
            text-decoration: none;
            border-radius: 6px;
            margin-bottom: 2px;
            font-size: 0.9rem;
        }}
        .nav-link:hover {{ background: #21262d; color: #c9d1d9; }}
        .nav-link.active {{ background: #388bfd20; color: #58a6ff; }}
        .content {{
            flex: 1;
            margin-left: 280px;
            padding: 2rem;
            max-width: 900px;
        }}
        .markdown-body {{
            background: #0d1117;
            color: #c9d1d9;
            line-height: 1.6;
        }}
        .markdown-body h1 {{ color: #f0f6fc; border-bottom: 1px solid #30363d; padding-bottom: 0.5rem; }}
        .markdown-body h2 {{ color: #f0f6fc; margin-top: 1.5rem; }}
        .markdown-body h3 {{ color: #c9d1d9; }}
        .markdown-body code {{
            background: #161b22;
            padding: 0.2rem 0.4rem;
            border-radius: 4px;
            font-size: 0.9em;
        }}
        .markdown-body pre {{
            background: #161b22;
            padding: 1rem;
            border-radius: 8px;
            overflow-x: auto;
        }}
        .markdown-body pre code {{ background: none; padding: 0; }}
        .markdown-body table {{
            width: 100%;
            border-collapse: collapse;
            margin: 1rem 0;
        }}
        .markdown-body th, .markdown-body td {{
            border: 1px solid #30363d;
            padding: 0.5rem;
            text-align: left;
        }}
        .markdown-body th {{ background: #161b22; }}
        .markdown-body a {{ color: #58a6ff; }}
    </style>
</head>
<body>
    <nav class="sidebar">
        <h2>Changelogs</h2>
{file_links}
    </nav>
    <main class="content">
        <div id="markdown-content" class="markdown-body"></div>
    </main>
    <script>
        async function loadFile(filename) {{
            try {{
                const response = await fetch(filename);
                const text = await response.text();
                document.getElementById('markdown-content').innerHTML = marked.parse(text);
                document.querySelectorAll('.nav-link').forEach(link => {{
                    link.classList.toggle('active', link.textContent === filename.replace('.md', ''));
                }});
            }} catch (e) {{
                document.getElementById('markdown-content').innerHTML = '<p>Error loading file</p>';
            }}
        }}
        loadFile('{default_file}');
    </script>
</body>
</html>'''
        (self.reviews_dir / "index.html").write_text(html)

    def _create_readme(self):
        """Create README.md if not exists"""
        readme_path = self.reviews_dir / "README.md"
        if not readme_path.exists():
            readme = """# RG Family Code Changelog

AI가 생성한 모든 코드 변경사항을 기록합니다.

## 사용법

```bash
cd reviews
python3 -m http.server 4000
```

브라우저에서 http://localhost:4000 접속
"""
            readme_path.write_text(readme)

    def save_and_build(self):
        """Save changelog and update all navigation files"""
        # Save changelog
        filename = f"{self.timestamp}.md"
        filepath = self.reviews_dir / filename
        filepath.write_text(self._generate_markdown())

        # Update navigation
        self._create_readme()
        self._update_summary()
        self._update_index_html()

        print(f"Changelog saved: {filepath}")
        print(f"View at: http://localhost:4000")
        return str(filepath)


if __name__ == "__main__":
    # Example usage
    logger = CodeChangeLogger(
        "RG Family - UI Enhancement",
        user_request="Implement 3 core features"
    )
    logger.log_file_creation("example.ts", "const x = 1;", "Example file")
    logger.save_and_build()
