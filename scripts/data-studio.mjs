/**
 * Localhost data browser for Postgres (all tables + rows).
 * Open http://localhost:5556
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const PORT = Number(process.env.DATA_PORT || 5556);

function loadEnv() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnv();

const pool = new pg.Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || "typeorm_user",
  password: process.env.DB_PASSWORD || "1234",
  database: process.env.DB_NAME || "typeorm_database",
});

function isSafeIdent(name) {
  return typeof name === "string" && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

async function listTables() {
  const res = await pool.query(`
    SELECT
      t.table_name,
      (
        SELECT COUNT(*)::int
        FROM information_schema.columns c
        WHERE c.table_schema = 'public' AND c.table_name = t.table_name
      ) AS columns
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND t.table_name NOT LIKE 'pg_%'
    ORDER BY t.table_name
  `);

  const withCounts = [];
  for (const row of res.rows) {
    if (!isSafeIdent(row.table_name)) continue;
    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS count FROM "${row.table_name}"`,
    );
    withCounts.push({
      name: row.table_name,
      columns: row.columns,
      rows: countRes.rows[0].count,
    });
  }
  return withCounts;
}

async function getTableData(table, limit = 100, offset = 0) {
  if (!isSafeIdent(table)) throw new Error("Invalid table name");

  const colsRes = await pool.query(
    `
    SELECT column_name, data_type, udt_name, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
    `,
    [table],
  );

  const totalRes = await pool.query(
    `SELECT COUNT(*)::int AS count FROM "${table}"`,
  );
  const dataRes = await pool.query(
    `SELECT * FROM "${table}" ORDER BY 1 LIMIT $1 OFFSET $2`,
    [limit, offset],
  );

  return {
    table,
    columns: colsRes.rows.map((c) => ({
      name: c.column_name,
      type: c.data_type === "USER-DEFINED" ? c.udt_name : c.data_type,
      nullable: c.is_nullable === "YES",
    })),
    total: totalRes.rows[0].count,
    limit,
    offset,
    rows: dataRes.rows,
  };
}

function htmlPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>lear-nest Data Studio</title>
  <style>
    :root {
      --bg: #0f1419;
      --panel: #1a2332;
      --text: #e7ecf3;
      --muted: #8b9bb4;
      --accent: #3d8bfd;
      --border: #243247;
      --row: #152031;
      --hover: #1e2d45;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", system-ui, sans-serif;
      background: radial-gradient(1200px 600px at 10% -10%, #1b2a44, var(--bg));
      color: var(--text);
      min-height: 100vh;
      display: grid;
      grid-template-columns: 260px 1fr;
      grid-template-rows: auto 1fr;
    }
    header {
      grid-column: 1 / -1;
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border);
      background: rgba(15, 20, 25, 0.9);
    }
    h1 { font-size: 1.1rem; margin: 0; font-weight: 600; }
    #meta { color: var(--muted); font-size: 0.85rem; margin-left: auto; }
    button, .btn {
      border: 0;
      background: var(--accent);
      color: white;
      padding: 0.45rem 0.9rem;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
    }
    button:hover { filter: brightness(1.08); }
    button:disabled { opacity: 0.5; cursor: default; }
    aside {
      border-right: 1px solid var(--border);
      background: rgba(26, 35, 50, 0.7);
      overflow: auto;
      padding: 0.75rem;
    }
    aside h2 {
      margin: 0.25rem 0.5rem 0.75rem;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--muted);
    }
    .table-item {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
      width: 100%;
      text-align: left;
      background: transparent;
      color: var(--text);
      padding: 0.55rem 0.7rem;
      border-radius: 8px;
      margin-bottom: 0.25rem;
      font-weight: 500;
    }
    .table-item:hover { background: var(--hover); }
    .table-item.active { background: rgba(61, 139, 253, 0.18); color: #9ec5ff; }
    .table-item small { color: var(--muted); font-weight: 400; }
    main { padding: 1.25rem 1.5rem; overflow: auto; }
    .empty {
      color: var(--muted);
      padding: 3rem 1rem;
      text-align: center;
    }
    .toolbar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }
    .toolbar h2 { margin: 0; font-size: 1.15rem; }
    .pager { display: flex; gap: 0.5rem; align-items: center; margin-left: auto; color: var(--muted); font-size: 0.85rem; }
    .wrap {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: auto;
      max-height: calc(100vh - 140px);
    }
    table { border-collapse: collapse; width: 100%; font-size: 0.85rem; }
    th, td {
      padding: 0.55rem 0.75rem;
      border-bottom: 1px solid var(--border);
      text-align: left;
      white-space: nowrap;
      max-width: 320px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    th {
      position: sticky;
      top: 0;
      background: #152031;
      color: var(--muted);
      font-weight: 600;
      z-index: 1;
    }
    th .type { display: block; font-size: 0.7rem; font-weight: 400; opacity: 0.8; }
    tr:nth-child(even) td { background: rgba(15, 20, 25, 0.35); }
    tr:hover td { background: var(--hover); }
    td.null { color: var(--muted); font-style: italic; }
    #error {
      display: none;
      margin-bottom: 1rem;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      background: rgba(255, 107, 107, 0.12);
      color: #ff8f8f;
    }
  </style>
</head>
<body>
  <header>
    <h1>lear-nest Data Studio</h1>
    <span id="meta">Loading…</span>
    <button id="refresh" type="button">Refresh</button>
  </header>
  <aside>
    <h2>Tables</h2>
    <div id="tables"></div>
  </aside>
  <main>
    <div id="error"></div>
    <div id="content" class="empty">Select a table to browse rows.</div>
  </main>
  <script>
    const LIMIT = 100;
    let tables = [];
    let current = null;
    let offset = 0;

    const tablesEl = document.getElementById("tables");
    const contentEl = document.getElementById("content");
    const metaEl = document.getElementById("meta");
    const errorEl = document.getElementById("error");

    function showError(msg) {
      errorEl.style.display = msg ? "block" : "none";
      errorEl.textContent = msg || "";
    }

    function esc(value) {
      return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
    }

    function cell(value) {
      if (value === null || value === undefined) return '<td class="null">null</td>';
      const text = typeof value === "object" ? JSON.stringify(value) : String(value);
      return '<td title="' + esc(text) + '">' + esc(text) + '</td>';
    }

    function renderSidebar() {
      tablesEl.innerHTML = tables.map((t) =>
        '<button class="table-item' + (current === t.name ? ' active' : '') + '" data-table="' + esc(t.name) + '">' +
          '<span>' + esc(t.name) + '</span>' +
          '<small>' + t.rows + '</small>' +
        '</button>'
      ).join("");

      tablesEl.querySelectorAll("[data-table]").forEach((btn) => {
        btn.addEventListener("click", () => {
          current = btn.dataset.table;
          offset = 0;
          loadTable();
          renderSidebar();
        });
      });
    }

    async function loadTables() {
      showError("");
      const res = await fetch("/api/tables");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load tables");
      tables = data.tables;
      metaEl.textContent = tables.length + " tables · " + data.database;
      renderSidebar();
      if (current) await loadTable();
    }

    async function loadTable() {
      if (!current) return;
      showError("");
      contentEl.className = "";
      contentEl.innerHTML = '<div class="empty">Loading ' + esc(current) + "…</div>";
      const res = await fetch("/api/table/" + encodeURIComponent(current) + "?limit=" + LIMIT + "&offset=" + offset);
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || "Failed to load table");
        contentEl.innerHTML = "";
        return;
      }

      const from = data.total === 0 ? 0 : offset + 1;
      const to = Math.min(offset + data.rows.length, data.total);
      const canPrev = offset > 0;
      const canNext = offset + LIMIT < data.total;

      contentEl.innerHTML =
        '<div class="toolbar">' +
          '<h2>' + esc(data.table) + '</h2>' +
          '<span style="color:var(--muted);font-size:0.85rem">' + data.total + ' rows</span>' +
          '<div class="pager">' +
            '<button id="prev" ' + (canPrev ? "" : "disabled") + '>Prev</button>' +
            '<span>' + from + "–" + to + " of " + data.total + '</span>' +
            '<button id="next" ' + (canNext ? "" : "disabled") + '>Next</button>' +
          '</div>' +
        '</div>' +
        '<div class="wrap"><table><thead><tr>' +
          data.columns.map((c) => '<th>' + esc(c.name) + '<span class="type">' + esc(c.type) + '</span></th>').join("") +
        '</tr></thead><tbody>' +
          (data.rows.length
            ? data.rows.map((row) => '<tr>' + data.columns.map((c) => cell(row[c.name])).join("") + '</tr>').join("")
            : '<tr><td colspan="' + data.columns.length + '" class="null">No rows</td></tr>') +
        '</tbody></table></div>';

      document.getElementById("prev")?.addEventListener("click", () => {
        offset = Math.max(0, offset - LIMIT);
        loadTable();
      });
      document.getElementById("next")?.addEventListener("click", () => {
        offset += LIMIT;
        loadTable();
      });
    }

    document.getElementById("refresh").addEventListener("click", () => {
      loadTables().catch((err) => showError(err.message));
    });

    loadTables().catch((err) => showError(err.message));
  </script>
</body>
</html>`;
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);

  try {
    if (url.pathname === "/" || url.pathname === "/index.html") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(htmlPage());
      return;
    }

    if (url.pathname === "/api/tables") {
      const tables = await listTables();
      sendJson(res, 200, {
        database: process.env.DB_NAME || "typeorm_database",
        tables,
      });
      return;
    }

    const match = url.pathname.match(/^\/api\/table\/([a-zA-Z_][a-zA-Z0-9_]*)$/);
    if (match) {
      const limit = Math.min(Number(url.searchParams.get("limit") || 100), 500);
      const offset = Math.max(Number(url.searchParams.get("offset") || 0), 0);
      const data = await getTableData(match[1], limit, offset);
      sendJson(res, 200, data);
      return;
    }

    res.writeHead(404).end("Not found");
  } catch (err) {
    console.error("[data:studio]", err.message);
    sendJson(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`[data:studio] http://localhost:${PORT}`);
});

process.on("SIGINT", async () => {
  await pool.end();
  process.exit(0);
});
