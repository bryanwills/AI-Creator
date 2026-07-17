import {readFile, readdir, rename, rm, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov']);
const TEXT_EXTENSIONS = new Set(['.txt', '.md', '.json']);

export async function readSessionState(repoRoot) {
  const fallback = {activeSessionId: '', sessions: []};
  try {
    const payload = JSON.parse(await readFile(path.join(repoRoot, '.vimax', 'sessions.json'), 'utf8'));
    const records = Object.values(payload.sessions ?? {})
      .filter((record) => record && typeof record === 'object')
      .map(sanitizeSession);
    records.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    return {
      activeSessionId: String(payload.active_session_id ?? ''),
      sessions: records,
    };
  } catch {
    return fallback;
  }
}

export async function deleteSession(repoRoot, sessionId) {
  assertSessionId(sessionId);
  const statePath = path.join(repoRoot, '.vimax', 'sessions.json');
  const payload = JSON.parse(await readFile(statePath, 'utf8'));
  const sessions = payload.sessions && typeof payload.sessions === 'object' ? payload.sessions : {};
  if (!sessions[sessionId]) throw new Error('Project not found');

  delete sessions[sessionId];
  const remaining = Object.values(sessions)
    .filter((record) => record && typeof record === 'object')
    .sort((left, right) => String(right.updated_at ?? right.created_at ?? '').localeCompare(String(left.updated_at ?? left.created_at ?? '')));
  if (payload.active_session_id === sessionId || !sessions[payload.active_session_id]) {
    payload.active_session_id = String(remaining[0]?.session_id ?? '');
  }
  payload.sessions = sessions;

  const temporaryPath = `${statePath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(payload, null, 2)}\n`, {mode: 0o600});
  await rename(temporaryPath, statePath);
  await rm(resolveSessionRoot(repoRoot, sessionId), {recursive: true, force: true});
  await removeSessionLogRecords(repoRoot, sessionId);
  return readSessionState(repoRoot);
}

export async function readSessionHistory(repoRoot, sessionId) {
  assertSessionId(sessionId);
  const logPath = path.join(repoRoot, '.vimax', 'logs', 'loop_history.jsonl');
  try {
    const lines = (await readFile(logPath, 'utf8')).split(/\r?\n/).filter(Boolean);
    const messages = [];
    for (const line of lines) {
      let record;
      try {
        record = JSON.parse(line);
      } catch {
        continue;
      }
      if (record.session_id !== sessionId || !record.raw_user_input) continue;
      const turnId = String(record.turn_id || `turn-${messages.length}`);
      messages.push({
        id: `${turnId}-user`,
        role: 'user',
        text: String(record.raw_user_input),
        createdAt: String(record.created_at || record.timestamp || ''),
      });
      for (const round of Array.isArray(record.tool_rounds) ? record.tool_rounds : []) {
        for (const result of Array.isArray(round.tool_results) ? round.tool_results : []) {
          messages.push({
            id: `${turnId}-tool-${messages.length}`,
            role: 'activity',
            text: String(result.content || result.name || 'Tool completed'),
            tool: String(result.name || 'tool'),
            status: result.ok === false ? 'error' : 'done',
            createdAt: String(record.created_at || record.timestamp || ''),
          });
        }
      }
      if (record.final_assistant_text) {
        messages.push({
          id: `${turnId}-assistant`,
          role: record.status === 'failed' ? 'error' : 'assistant',
          text: String(record.final_assistant_text),
          createdAt: String(record.created_at || record.timestamp || ''),
        });
      }
    }
    return messages.slice(-120);
  } catch {
    return [];
  }
}

export async function listSessionArtifacts(repoRoot, sessionId) {
  const sessionRoot = resolveSessionRoot(repoRoot, sessionId);
  const artifacts = [];

  async function walk(directory) {
    let entries;
    try {
      entries = await readdir(directory, {withFileTypes: true});
    } catch {
      return;
    }
    for (const entry of entries) {
      if (artifacts.length >= 400 || entry.name.startsWith('.')) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(absolute);
        continue;
      }
      if (!entry.isFile()) continue;
      const extension = path.extname(entry.name).toLowerCase();
      const kind = IMAGE_EXTENSIONS.has(extension)
        ? 'image'
        : VIDEO_EXTENSIONS.has(extension)
          ? 'video'
          : TEXT_EXTENSIONS.has(extension)
            ? 'document'
            : null;
      if (!kind) continue;
      const info = await stat(absolute);
      const relativePath = path.relative(sessionRoot, absolute).split(path.sep).join('/');
      artifacts.push({
        path: relativePath,
        name: entry.name,
        kind,
        size: info.size,
        updatedAt: info.mtime.toISOString(),
        url: `/api/artifact?session=${encodeURIComponent(sessionId)}&path=${encodeURIComponent(relativePath)}`,
      });
    }
  }

  await walk(sessionRoot);
  return artifacts.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function resolveArtifactPath(repoRoot, sessionId, relativePath) {
  const sessionRoot = resolveSessionRoot(repoRoot, sessionId);
  const candidate = path.resolve(sessionRoot, String(relativePath || ''));
  if (candidate === sessionRoot || !candidate.startsWith(`${sessionRoot}${path.sep}`)) {
    throw new Error('Artifact path escapes the active session');
  }
  return candidate;
}

export function artifactContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.json': 'application/json; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8',
  }[extension] ?? 'application/octet-stream';
}

function resolveSessionRoot(repoRoot, sessionId) {
  assertSessionId(sessionId);
  const workingRoot = path.resolve(repoRoot, '.working_dir');
  const candidate = path.resolve(workingRoot, sessionId);
  if (!candidate.startsWith(`${workingRoot}${path.sep}`)) {
    throw new Error('Session path escapes .working_dir');
  }
  return candidate;
}

function assertSessionId(sessionId) {
  if (!/^[A-Za-z0-9][A-Za-z0-9-]{0,95}$/.test(String(sessionId || ''))) {
    throw new Error('Invalid session id');
  }
}

async function removeSessionLogRecords(repoRoot, sessionId) {
  const logsRoot = path.join(repoRoot, '.vimax', 'logs');
  let entries;
  try {
    entries = await readdir(logsRoot, {withFileTypes: true});
  } catch {
    return;
  }
  for (const entry of entries) {
    if (!entry.isFile() || path.extname(entry.name) !== '.jsonl') continue;
    const logPath = path.join(logsRoot, entry.name);
    const lines = (await readFile(logPath, 'utf8')).split(/\r?\n/).filter(Boolean);
    const retained = lines.filter((line) => {
      try {
        const record = JSON.parse(line);
        const recordSessionId = record.session_id
          ?? record.sessionId
          ?? record.session?.session_id
          ?? record.context?.session_id
          ?? record.metadata?.session_id;
        return recordSessionId !== sessionId;
      } catch {
        return true;
      }
    });
    if (retained.length === lines.length) continue;
    const temporaryPath = `${logPath}.${process.pid}.tmp`;
    await writeFile(temporaryPath, retained.length ? `${retained.join('\n')}\n` : '', {mode: 0o600});
    await rename(temporaryPath, logPath);
  }
}

function sanitizeSession(record) {
  return {
    sessionId: String(record.session_id ?? ''),
    workingDir: String(record.working_dir ?? ''),
    stage: String(record.stage ?? 'created'),
    summary: String(record.summary ?? ''),
    idea: String(record.idea ?? ''),
    updatedAt: String(record.updated_at ?? record.created_at ?? ''),
    createdAt: String(record.created_at ?? ''),
    compactionTurns: Number(record.compacted_turns ?? 0),
  };
}
