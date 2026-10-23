"""Builds index.html (all topics) and one folder per topic (its own link) from data/*.js."""
import os, html, re
ORDER = ["peer-pressure","time-management","eating-disorders","learning-disability","stress","abuse","loneliness",
         "social-media-addiction","intelligence","development","focus","discipline","mind-body","addiction","ocd","depression"]
extra = sorted(f[:-3] for f in os.listdir("data") if f.endswith(".js") and f[:-3] not in ORDER)
ids = [i for i in ORDER if os.path.exists(f"data/{i}.js")] + extra
tpl = open("index.template.html").read()
root = tpl.replace("<!--DATA-->", "\n".join(f'<script src="data/{i}.js"></script>' for i in ids))
open("index.html", "w").write(root)
for i in ids:
    title = re.search(r'title:"([^"]+)"', open(f"data/{i}.js").read()).group(1)
    os.makedirs(i, exist_ok=True)
    page = (tpl.replace('href="styles.css"', 'href="../styles.css"')
               .replace('src="app.js"', 'src="../app.js"')
               .replace("<!--DATA-->", f'<script>window.QUIZ_ONLY="{i}";</script>\n<script src="../data/{i}.js"></script>')
               .replace("<title>Psychology Quiz</title>", f"<title>{html.escape(title)} · Psychology Quiz</title>"))
    open(f"{i}/index.html", "w").write(page)
print(len(ids), "topics:", " ".join(ids))
