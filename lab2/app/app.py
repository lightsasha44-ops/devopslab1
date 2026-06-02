import os
from flask import Flask

app = Flask(__name__)

@app.route("/")
def index():
    name = os.environ.get("NAME", "World")
    color = os.environ.get("BG_COLOR", "#1a1a2e")
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Hello from K8s</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: 'Segoe UI', sans-serif;
            background: {color};
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
        }}
        .card {{
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 16px;
            padding: 3rem 4rem;
            text-align: center;
        }}
        h1 {{ font-size: 3rem; margin-bottom: 1rem; }}
        .badge {{
            display: inline-block;
            background: rgba(99,179,237,0.2);
            border: 1px solid #63b3ed;
            border-radius: 999px;
            padding: 0.25rem 1rem;
            font-size: 0.85rem;
            color: #63b3ed;
            margin-top: 1rem;
        }}
    </style>
</head>
<body>
    <div class="card">
        <h1>Hello, {name}!</h1>
        <p>Running on Kubernetes</p>
        <div class="badge">Deployed with K8s + Minikube</div>
    </div>
</body>
</html>"""

@app.route("/health")
def health():
    return {"status": "ok"}, 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
