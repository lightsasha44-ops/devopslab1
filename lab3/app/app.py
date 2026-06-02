import os
import time
import psycopg2
from flask import Flask

app = Flask(__name__)

DB_HOST = os.environ.get("DB_HOST", "postgres-service")
DB_PORT = os.environ.get("DB_PORT", "5432")
DB_NAME = os.environ.get("DB_NAME", "appdb")
DB_USER = os.environ.get("DB_USER", "appuser")
DB_PASS = os.environ.get("DB_PASSWORD", "apppassword")


def get_conn():
    return psycopg2.connect(
        host=DB_HOST, port=DB_PORT,
        dbname=DB_NAME, user=DB_USER, password=DB_PASS
    )


def init_db():
    """Create visits table if not exists."""
    for attempt in range(10):
        try:
            conn = get_conn()
            cur = conn.cursor()
            cur.execute("""
                CREATE TABLE IF NOT EXISTS visits (
                    id SERIAL PRIMARY KEY,
                    visited_at TIMESTAMP DEFAULT NOW()
                )
            """)
            conn.commit()
            cur.close()
            conn.close()
            print("DB initialized")
            return
        except Exception as e:
            print(f"DB not ready ({attempt+1}/10): {e}")
            time.sleep(3)
    raise RuntimeError("Could not connect to DB after 10 attempts")


def record_and_count():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("INSERT INTO visits (visited_at) VALUES (NOW())")
    cur.execute("SELECT COUNT(*) FROM visits")
    count = cur.fetchone()[0]
    cur.execute("SELECT visited_at FROM visits ORDER BY visited_at DESC LIMIT 5")
    recent = [row[0].strftime("%Y-%m-%d %H:%M:%S") for row in cur.fetchall()]
    conn.commit()
    cur.close()
    conn.close()
    return count, recent


@app.route("/")
def index():
    name = os.environ.get("NAME", "World")
    color = os.environ.get("BG_COLOR", "#0f172a")
    try:
        count, recent = record_and_count()
        db_status = "connected"
        recent_html = "".join(f"<li>{t}</li>" for t in recent)
    except Exception as e:
        count = "?"
        recent_html = f"<li>Error: {e}</li>"
        db_status = "error"

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
            min-width: 400px;
        }}
        h1 {{ font-size: 2.8rem; margin-bottom: 0.5rem; }}
        .counter {{
            font-size: 4rem;
            font-weight: bold;
            color: #63b3ed;
            margin: 1rem 0;
        }}
        .label {{ opacity: 0.6; font-size: 0.9rem; margin-bottom: 1.5rem; }}
        .recent {{
            text-align: left;
            background: rgba(0,0,0,0.2);
            border-radius: 8px;
            padding: 1rem 1.5rem;
            margin-top: 1.5rem;
        }}
        .recent h3 {{ font-size: 0.85rem; opacity: 0.5; margin-bottom: 0.5rem; text-transform: uppercase; }}
        .recent ul {{ list-style: none; font-size: 0.85rem; opacity: 0.8; }}
        .recent li {{ padding: 2px 0; }}
        .badge {{
            display: inline-block;
            background: rgba(99,179,237,0.2);
            border: 1px solid #63b3ed;
            border-radius: 999px;
            padding: 0.2rem 0.8rem;
            font-size: 0.75rem;
            color: #63b3ed;
            margin-top: 1.5rem;
        }}
        .db-status {{
            font-size: 0.75rem;
            opacity: 0.4;
            margin-top: 0.5rem;
        }}
    </style>
</head>
<body>
    <div class="card">
        <h1>Hello, {name}!</h1>
        <div class="counter">{count}</div>
        <div class="label">total page visits stored in PostgreSQL</div>
        <div class="recent">
            <h3>Last 5 visits</h3>
            <ul>{recent_html}</ul>
        </div>
        <div class="badge">K8s + PostgreSQL + Gateway API</div>
        <div class="db-status">db: {db_status} @ {DB_HOST}</div>
    </div>
</body>
</html>"""


@app.route("/health")
def health():
    try:
        conn = get_conn()
        conn.close()
        return {"status": "ok", "db": "connected"}, 200
    except Exception as e:
        return {"status": "degraded", "db": str(e)}, 200


if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000)


# Called by gunicorn
init_db()
