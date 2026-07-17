import {createReadStream, existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {
  artifactContentType,
  deleteSession,
  listSessionArtifacts,
  readSessionHistory,
  readSessionState,
  resolveArtifactPath,
} from './server-lib.mjs';

const webRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(webRoot, '..');
const isDev = process.argv.includes('--dev');
const host = process.env.VIMAX_WEB_HOST || '127.0.0.1';
const port = Number(process.env.VIMAX_WEB_PORT || 4173);
const subscribers = new Set();
let agentProcess = null;
let activeSessionId = '';

let vite = null;

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || `${host}:${port}`}`);
  try {
    if (url.pathname === '/api/events' && request.method === 'GET') {
      return openEventStream(request, response);
    }
    if (url.pathname === '/api/sessions' && request.method === 'GET') {
      return sendJson(response, 200, await readSessionState(repoRoot));
    }
    if (url.pathname === '/api/sessions' && request.method === 'DELETE') {
      const sessionId = url.searchParams.get('session') || '';
      const current = await readSessionState(repoRoot);
      if (!current.sessions.some((session) => session.sessionId === sessionId)) {
        return sendJson(response, 404, {error: 'Project not found'});
      }
      if (sessionId === activeSessionId) stopAgent('delete');
      const state = await deleteSession(repoRoot, sessionId);
      activeSessionId = state.activeSessionId;
      broadcast({type: 'sessions_changed', ...state});
      return sendJson(response, 200, state);
    }
    if (url.pathname === '/api/history' && request.method === 'GET') {
      return sendJson(response, 200, {messages: await readSessionHistory(repoRoot, url.searchParams.get('session') || '')});
    }
    if (url.pathname === '/api/artifacts' && request.method === 'GET') {
      return sendJson(response, 200, {artifacts: await listSessionArtifacts(repoRoot, url.searchParams.get('session') || '')});
    }
    if (url.pathname === '/api/artifact' && request.method === 'GET') {
      return streamArtifact(response, url.searchParams.get('session') || '', url.searchParams.get('path') || '');
    }
    if (url.pathname === '/api/agent/start' && request.method === 'POST') {
      const body = await readJsonBody(request);
      const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
      await startAgent({newSession: body.newSession === true, sessionId});
      return sendJson(response, 200, {ok: true});
    }
    if (url.pathname === '/api/messages' && request.method === 'POST') {
      const body = await readJsonBody(request);
      const text = String(body.text || '').trim();
      if (!text) return sendJson(response, 400, {error: 'Message text is required'});
      if (!agentProcess?.stdin.writable) return sendJson(response, 409, {error: 'Agent is not running'});
      agentProcess.stdin.write(`${text}\n`);
      return sendJson(response, 202, {ok: true});
    }
    if (url.pathname === '/api/agent/stop' && request.method === 'POST') {
      stopAgent('user');
      return sendJson(response, 200, {ok: true});
    }
    if (url.pathname === '/api/health' && request.method === 'GET') {
      return sendJson(response, 200, {ok: true, agentRunning: Boolean(agentProcess), activeSessionId});
    }
    if (url.pathname === '/assets/vimax.png' && request.method === 'GET') {
      response.writeHead(200, {'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600'});
      createReadStream(path.join(repoRoot, 'assets', 'vimax.png')).pipe(response);
      return;
    }
    if (vite) {
      vite.middlewares(request, response, () => sendJson(response, 404, {error: 'Not found'}));
      return;
    }
    return serveProductionApp(response, url.pathname);
  } catch (error) {
    sendJson(response, 500, {error: error instanceof Error ? error.message : String(error)});
  }
});

if (isDev) {
  vite = await (await import('vite')).createServer({
    root: webRoot,
    server: {middlewareMode: true, hmr: {server}},
    appType: 'spa',
  });
}

server.listen(port, host, () => {
  console.log(`ViMax Web: http://${host}:${port}`);
});

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

async function startAgent({newSession, sessionId}) {
  if (newSession && sessionId) throw new Error('Choose either a new or existing session');
  stopAgent('switch');
  const {command, args} = agentCommand();
  const sessionArgs = newSession ? ['--new-session'] : sessionId ? ['--session', sessionId] : [];
  activeSessionId = sessionId;
  const child = spawn(command, [...args, 'main_agent.py', '--jsonl', '--stdin-repl', ...sessionArgs], {
    cwd: repoRoot,
    env: process.env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  agentProcess = child;
  let childStdoutBuffer = '';
  broadcast({type: 'bridge_status', status: 'starting', message: newSession ? 'Creating workspace' : 'Opening workspace'});
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    if (agentProcess !== child) return;
    childStdoutBuffer += String(chunk);
    const lines = childStdoutBuffer.split(/\r?\n/);
    childStdoutBuffer = lines.pop() || '';
    for (const line of lines) consumeAgentLine(line);
  });
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => {
    if (agentProcess !== child) return;
    for (const line of String(chunk).split(/\r?\n/)) {
      if (line.trim()) broadcast({type: 'terminal', stream: 'stderr', line});
    }
  });
  child.on('error', (error) => {
    if (agentProcess !== child) return;
    broadcast({type: 'error', message: `Agent process error: ${error.message}`});
  });
  child.on('exit', (code, signal) => {
    if (agentProcess !== child) return;
    agentProcess = null;
    broadcast({
      type: 'bridge_status',
      status: code === 0 || signal === 'SIGTERM' ? 'stopped' : 'error',
      message: signal ? `Agent stopped by ${signal}` : `Agent exited with code ${code ?? 0}`,
    });
  });
  setTimeout(async () => {
    if (agentProcess !== child) return;
    const state = await readSessionState(repoRoot);
    activeSessionId = state.activeSessionId || sessionId || activeSessionId;
    broadcast({type: 'sessions_changed', ...state, activeSessionId});
    broadcast({type: 'bridge_status', status: 'ready', message: 'Agent ready'});
  }, 350);
}

function consumeAgentLine(line) {
  if (!line.trim()) return;
  try {
    const event = JSON.parse(line);
    if (event.type === 'session') activeSessionId = event.session?.active_session_id || activeSessionId;
    broadcast(event);
    if (event.type === 'session') {
      readSessionState(repoRoot).then((state) => broadcast({type: 'sessions_changed', ...state}));
    }
  } catch {
    broadcast({type: 'terminal', stream: 'stdout', line});
  }
}

function openEventStream(request, response) {
  response.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  response.write(`data: ${JSON.stringify({type: 'bridge_status', status: agentProcess ? 'ready' : 'idle', message: agentProcess ? 'Agent connected' : 'Agent idle'})}\n\n`);
  subscribers.add(response);
  const heartbeat = setInterval(() => response.write(': keepalive\n\n'), 15_000);
  request.on('close', () => {
    clearInterval(heartbeat);
    subscribers.delete(response);
  });
}

function broadcast(event) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const subscriber of subscribers) subscriber.write(payload);
}

function stopAgent(reason) {
  if (!agentProcess) return;
  const child = agentProcess;
  agentProcess = null;
  child.kill('SIGTERM');
  broadcast({type: 'bridge_status', status: 'stopped', message: reason === 'switch' ? 'Switching workspace' : 'Generation stopped'});
}

function agentCommand() {
  if (process.env.VIMAX_AGENT_COMMAND) {
    return {command: process.env.VIMAX_AGENT_COMMAND, args: splitArgs(process.env.VIMAX_AGENT_ARGS || '')};
  }
  const configuredPython = process.env.VIMAX_PYTHON_CMD;
  if (configuredPython) return {command: configuredPython, args: []};
  const bundledUv = process.env.VIMAX_UV_CMD || path.join(process.env.HOME || '', '.local', 'bin', 'uv');
  if (bundledUv && existsSync(bundledUv)) return {command: bundledUv, args: ['run', 'python']};
  const venvPython = path.join(repoRoot, '.venv', 'bin', 'python3');
  if (existsSync(venvPython)) return {command: venvPython, args: []};
  return {command: 'uv', args: ['run', 'python']};
}

function splitArgs(value) {
  return value.split(/\s+/).map((part) => part.trim()).filter(Boolean);
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return {};
  const text = Buffer.concat(chunks).toString('utf8');
  if (text.length > 1_000_000) throw new Error('Request body is too large');
  return JSON.parse(text);
}

function sendJson(response, status, payload) {
  if (response.writableEnded) return;
  response.writeHead(status, {'Content-Type': 'application/json; charset=utf-8'});
  response.end(JSON.stringify(payload));
}

async function streamArtifact(response, sessionId, relativePath) {
  const filePath = resolveArtifactPath(repoRoot, sessionId, relativePath);
  if (!existsSync(filePath)) return sendJson(response, 404, {error: 'Artifact not found'});
  response.writeHead(200, {
    'Content-Type': artifactContentType(filePath),
    'Cache-Control': 'private, max-age=60',
  });
  createReadStream(filePath).pipe(response);
}

async function serveProductionApp(response, pathname) {
  const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const candidate = path.resolve(webRoot, 'dist', requested);
  const distRoot = path.resolve(webRoot, 'dist');
  const safeCandidate = candidate.startsWith(`${distRoot}${path.sep}`) ? candidate : path.join(distRoot, 'index.html');
  const filePath = existsSync(safeCandidate) ? safeCandidate : path.join(distRoot, 'index.html');
  const body = await readFile(filePath);
  response.writeHead(200, {'Content-Type': artifactContentType(filePath)});
  response.end(body);
}

function shutdown() {
  stopAgent('shutdown');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1_000).unref();
}
