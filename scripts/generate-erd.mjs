/**
 * Generates docs/erd.md (Mermaid ER diagram) from the live Postgres schema.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outFile = path.join(root, "docs", "erd.md");

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

function mermaidId(name) {
  return String(name).replace(/[^a-zA-Z0-9_]/g, "_");
}

function mapType(dataType, udtName) {
  if (dataType === "USER-DEFINED") return udtName || dataType;
  if (dataType === "character varying") return "varchar";
  if (dataType === "timestamp with time zone") return "timestamptz";
  if (dataType === "timestamp without time zone") return "timestamp";
  if (dataType === "double precision") return "float8";
  return dataType;
}

export async function generateErd() {
  const client = new pg.Client({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || "typeorm_user",
    password: process.env.DB_PASSWORD || "1234",
    database: process.env.DB_NAME || "typeorm_database",
  });

  await client.connect();

  try {
    const tablesRes = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE 'pg_%'
      ORDER BY table_name
    `);

    const columnsRes = await client.query(`
      SELECT
        c.table_name,
        c.column_name,
        c.data_type,
        c.udt_name,
        c.is_nullable
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
      ORDER BY c.table_name, c.ordinal_position
    `);

    const pkRes = await client.query(`
      SELECT tc.table_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.constraint_type = 'PRIMARY KEY'
    `);

    const uniqueRes = await client.query(`
      SELECT tc.table_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.constraint_type = 'UNIQUE'
    `);

    const fkRes = await client.query(`
      SELECT
        tc.table_name AS from_table,
        kcu.column_name AS from_column,
        ccu.table_name AS to_table,
        ccu.column_name AS to_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
       AND ccu.table_schema = tc.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name, kcu.column_name
    `);

    const pks = new Set(pkRes.rows.map((r) => `${r.table_name}.${r.column_name}`));
    const uniques = new Set(uniqueRes.rows.map((r) => `${r.table_name}.${r.column_name}`));
    const columnsByTable = new Map();
    for (const col of columnsRes.rows) {
      if (!columnsByTable.has(col.table_name)) columnsByTable.set(col.table_name, []);
      columnsByTable.get(col.table_name).push(col);
    }

    const diagram = [];
    diagram.push("erDiagram");

    for (const fk of fkRes.rows) {
      const from = mermaidId(fk.from_table);
      const to = mermaidId(fk.to_table);
      const label = fk.from_column.replace(/_id$/, "") || "fk";
      const fkKey = `${fk.from_table}.${fk.from_column}`;
      const rel = uniques.has(fkKey) || pks.has(fkKey) ? "||--||" : "||--o{";
      diagram.push(`    ${to} ${rel} ${from} : "${label}"`);
    }

    if (fkRes.rows.length) diagram.push("");

    for (const { table_name } of tablesRes.rows) {
      const id = mermaidId(table_name);
      diagram.push(`    ${id} {`);
      for (const col of columnsByTable.get(table_name) || []) {
        const type = mapType(col.data_type, col.udt_name);
        const key = `${table_name}.${col.column_name}`;
        const markers = [];
        if (pks.has(key)) markers.push("PK");
        if (uniques.has(key) && !pks.has(key)) markers.push("UK");
        const isFk = fkRes.rows.some(
          (fk) => fk.from_table === table_name && fk.from_column === col.column_name,
        );
        if (isFk) markers.push("FK");
        const markerStr = markers.length ? ` ${markers.join(",")}` : "";
        const nullable = col.is_nullable === "YES" ? ' "nullable"' : "";
        diagram.push(`        ${type} ${mermaidId(col.column_name)}${markerStr}${nullable}`);
      }
      diagram.push("    }");
      diagram.push("");
    }

    const mermaid = diagram.join("\n").trim() + "\n";
    const md = [
      "# Database ERD",
      "",
      "> Auto-generated from the live Postgres schema. Do not edit by hand.",
      `> Last updated: ${new Date().toISOString()}`,
      "",
      "```mermaid",
      mermaid.trimEnd(),
      "```",
      "",
    ].join("\n");

    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, md, "utf8");

    return {
      mermaid,
      updatedAt: new Date().toISOString(),
      tables: tablesRes.rows.length,
      outFile,
    };
  } finally {
    await client.end();
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  generateErd()
    .then((r) => console.log(`[erd] wrote ${path.relative(root, r.outFile)} (${r.tables} tables)`))
    .catch((err) => {
      console.error("[erd] failed:", err.message);
      process.exitCode = 1;
    });
}
