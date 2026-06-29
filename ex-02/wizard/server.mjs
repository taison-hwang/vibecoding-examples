// 바이브코딩 위자드 — 정적 서빙 + 확정 문서 저장 서버
// 사용자가 위자드에서 생성·입력한 최종 문서(URD/ADR/UI)를
// wizard/data/user-docs/ 아래 .md 파일로 저장/로드한다.
//   실행:  node wizard/server.mjs   (또는  cd wizard && node server.mjs)
//   기본 포트 4173 (PORT 환경변수로 변경 가능)
import { createServer } from "node:http";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve, extname, normalize } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname; // wizard/
const USER_DOCS = resolve(ROOT, "data/user-docs");
const PORT = Number(process.env.PORT) || 4173;
const ALLOWED = { URD: "URD.md", ADR: "ADR.md", UI: "UI.md" };

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const json = (res, code, obj) => {
  res.writeHead(code, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
};

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

async function loadDocs() {
  await mkdir(USER_DOCS, { recursive: true });
  const out = {};
  for (const [id, file] of Object.entries(ALLOWED)) {
    try {
      out[id] = await readFile(resolve(USER_DOCS, file), "utf8");
    } catch (_) {
      out[id] = "";
    }
  }
  return out;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const path = url.pathname;

    // --- API ---
    if (path === "/api/load" && req.method === "GET") {
      return json(res, 200, { ok: true, docs: await loadDocs() });
    }
    if (path === "/api/save" && req.method === "POST") {
      const { id, content } = JSON.parse((await readBody(req)) || "{}");
      if (!ALLOWED[id]) return json(res, 400, { ok: false, error: "unknown id" });
      await mkdir(USER_DOCS, { recursive: true });
      const file = resolve(USER_DOCS, ALLOWED[id]);
      await writeFile(file, content ?? "", "utf8");
      return json(res, 200, {
        ok: true,
        id,
        path: "wizard/data/user-docs/" + ALLOWED[id],
        bytes: Buffer.byteLength(content ?? "", "utf8"),
      });
    }
    if (path === "/api/list" && req.method === "GET") {
      await mkdir(USER_DOCS, { recursive: true });
      return json(res, 200, { ok: true, files: await readdir(USER_DOCS) });
    }

    // --- 정적 파일 ---
    let rel = decodeURIComponent(path === "/" ? "/index.html" : path);
    const filePath = normalize(resolve(ROOT, "." + rel));
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      return res.end("Forbidden");
    }
    try {
      const data = await readFile(filePath);
      res.writeHead(200, { "content-type": MIME[extname(filePath)] || "application/octet-stream" });
      res.end(data);
    } catch (_) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not Found: " + rel);
    }
  } catch (e) {
    json(res, 500, { ok: false, error: String(e && e.message || e) });
  }
});

server.listen(PORT, () => {
  console.log(`바이브코딩 위자드 서버 실행 중 → http://localhost:${PORT}`);
  console.log(`확정 문서 저장 위치: wizard/data/user-docs/  (URD.md · ADR.md · UI.md)`);
});
