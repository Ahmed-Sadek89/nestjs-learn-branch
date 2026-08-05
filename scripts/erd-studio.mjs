/**
 * Localhost ERD studio (Prisma Studio-style) for TypeORM/Postgres.
 * Open http://localhost:5555
 *
 * Regenerates from the DB on:
 * - page load / Refresh
 * - entity file changes (auto)
 * - SSE push to open browser tabs
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateErd } from "./generate-erd.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const srcDir = path.join(root, "src");
const PORT = Number(process.env.ERD_PORT || 5555);
const DEBOUNCE_MS = Number(process.env.ERD_DEBOUNCE_MS || 2500);

let latest = { mermaid: "erDiagram\n", updatedAt: null, tables: 0, error: null };
const clients = new Set();
let timer = null;
let refreshing = false;
let queued = false;

function htmlPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>lear-nest ERD Studio</title>
  <script type="module">
    import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
    mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "loose" });

    const statusEl = document.getElementById("status");
    const diagramEl = document.getElementById("diagram");
    const metaEl = document.getElementById("meta");
    let renderId = 0;

    async function render(payload) {
      if (payload.error) {
        statusEl.textContent = "Error: " + payload.error;
        statusEl.dataset.state = "error";
        return;
      }
      statusEl.textContent = "Live";
      statusEl.dataset.state = "ok";
      metaEl.textContent = (payload.tables ?? 0) + " tables · updated " + (payload.updatedAt || "—");
      const id = "erd-" + (++renderId);
      diagramEl.innerHTML = '<pre class="mermaid" id="' + id + '">' + payload.mermaid + "</pre>";
      await mermaid.run({ nodes: [document.getElementById(id)] });
    }

    async function load() {
      const res = await fetch("/api/erd");
      render(await res.json());
    }

    document.getElementById("refresh").addEventListener("click", async () => {
      statusEl.textContent = "Refreshing…";
      const res = await fetch("/api/refresh", { method: "POST" });
      render(await res.json());
    });

    const es = new EventSource("/api/events");
    es.onmessage = (e) => render(JSON.parse(e.data));
    load();
  </script>
  <style>
    :root {
      --bg: #0f1419;
      --panel: #1a2332;
      --text: #e7ecf3;
      --muted: #8b9bb4;
      --accent: #3d8bfd;
      --ok: #3dd68c;
      --err: #ff6b6b;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", system-ui, sans-serif;
      background: radial-gradient(1200px 600px at 10% -10%, #1b2a44, var(--bg));
      color: var(--text);
      min-height: 100vh;
    }
    header {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid #243247;
      background: rgba(15, 20, 25, 0.85);
      backdrop-filter: blur(8px);
      position: sticky;
      top: 0;
      z-index: 10;
    }
    h1 { font-size: 1.1rem; margin: 0; font-weight: 600; letter-spacing: 0.02em; }
    #meta { color: var(--muted); font-size: 0.85rem; margin-left: auto; }
    #status {
      font-size: 0.75rem;
      padding: 0.25rem 0.6rem;
      border-radius: 999px;
      background: #243247;
      color: var(--muted);
    }
    #status[data-state="ok"] { color: var(--ok); background: rgba(61, 214, 140, 0.12); }
    #status[data-state="error"] { color: var(--err); background: rgba(255, 107, 107, 0.12); }
    button {
      border: 0;
      background: var(--accent);
      color: white;
      padding: 0.45rem 0.9rem;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
    }
    button:hover { filter: brightness(1.08); }
    main { padding: 1.5rem; overflow: auto; }
    #diagram {
      background: var(--panel);
      border: 1px solid #243247;
      border-radius: 12px;
      padding: 1.5rem;
      min-height: 70vh;
      display: flex;
      justify-content: center;
      align-items: flex-start;
    }
    .mermaid { width: 100%; }
    footer {
      padding: 0.75rem 1.5rem 1.25rem;
      color: var(--muted);
      font-size: 0.8rem;
    }
    code { color: #b6d0ff; }
  </style>
</head>
<body>
  <header>
    <h1>lear-nest ERD Studio</h1>
    <span id="status">Connecting…</span>
    <span id="meta"></span>
    <button id="refresh" type="button">Refresh</button>
  </header>
  <main>
    <div id="diagram"></div>
  </main>
  <footer>
    Auto-updates when <code>*.entity.ts</code> changes (after TypeORM synchronize).
    Prisma-style local viewer for TypeORM — not an official TypeORM product.
  </footer>
</body>
</html>`;
}

function broadcast() {
  const data = `data: ${JSON.stringify(latest)}\n\n`;
  for (const res of clients) res.write(data);
}

async function refresh(reason = "manual") {
  if (refreshing) {
    queued = true;
    return latest;
  }
  refreshing = true;
  try {
    const result = await generateErd();
    latest = {
      mermaid: result.mermaid,
      updatedAt: result.updatedAt,
      tables: result.tables,
      error: null,
    };
    console.log(`[erd:studio] refreshed (${reason}) · ${result.tables} tables`);
    broadcast();
  } catch (err) {
    latest = { ...latest, error: err.message };
    console.error(`[erd:studio] refresh failed:`, err.message);
    broadcast();
  } finally {
    refreshing = false;
    if (queued) {
      queued = false;
      return refresh("queued");
    }
  }
  return latest;
}

function schedule(reason) {
  clearTimeout(timer);
  timer = setTimeout(() => refresh(reason), DEBOUNCE_MS);
}

function isEntityFile(filePath) {
  return /\.entity\.ts$/.test(filePath);
}

function watchEntities() {
  try {
    fs.watch(srcDir, { recursive: true }, (_event, filename) => {
      if (!filename) return;
      if (isEntityFile(filename)) {
        console.log(`[erd:studio] entity change: ${filename}`);
        schedule("entity-change");
      }
    });
    console.log(`[erd:studio] watching src/**/*.entity.ts`);
  } catch (err) {
    console.warn(`[erd:studio] watch unavailable: ${err.message}`);
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);

  if (url.pathname === "/" || url.pathname === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(htmlPage());
    return;
  }

  if (url.pathname === "/api/erd") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(latest));
    return;
  }

  if (url.pathname === "/api/refresh" && req.method === "POST") {
    const payload = await refresh("button");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(payload));
    return;
  }

  if (url.pathname === "/api/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write(`data: ${JSON.stringify(latest)}\n\n`);
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }

  res.writeHead(404).end("Not found");
});

await refresh("startup");
watchEntities();
server.listen(PORT, () => {
  console.log(`[erd:studio] http://localhost:${PORT}`);
});
