import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ArrowUp,
  Check,
  ChevronDown,
  CircleStop,
  Clapperboard,
  FileJson,
  FileText,
  Film,
  Folder,
  Image as ImageIcon,
  Menu,
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRight,
  Sparkles,
  Video,
  X,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {getArtifacts, getHistory, getSessions, sendMessage, startAgent, stopAgent, subscribeToEvents} from './api';
import {applyAgentEvent, appendLocalUser, composeAgentPrompt, createChatState, humanize} from './events';
import type {AgentEvent, Artifact, ChatState, Message, SessionSummary} from './types';

const CONTEXT_TARGET = 160_000;

type Workflow = 'auto' | 'idea2video' | 'script2video' | 'novel2video';

const workflowLabels: Record<Workflow, string> = {
  auto: 'Auto workflow',
  idea2video: 'Idea to video',
  script2video: 'Script to video',
  novel2video: 'Novel to video',
};

export default function App() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [chat, setChat] = useState<ChatState>(() => createChatState());
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [selectedArtifactPath, setSelectedArtifactPath] = useState('');
  const [workflow, setWorkflow] = useState<Workflow>('auto');
  const [connected, setConnected] = useState(false);
  const [agentReady, setAgentReady] = useState(false);
  const [bridgeLabel, setBridgeLabel] = useState('Local agent idle');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [artifactPanelOpen, setArtifactPanelOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [loadError, setLoadError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedSession = sessions.find((session) => session.sessionId === selectedSessionId);
  const selectedArtifact = artifacts.find((artifact) => artifact.path === selectedArtifactPath) || artifacts[0];

  const refreshSessions = useCallback(async () => {
    const state = await getSessions();
    setSessions(state.sessions);
    return state;
  }, []);

  const refreshArtifacts = useCallback(async (sessionId: string) => {
    if (!sessionId) {
      setArtifacts([]);
      setSelectedArtifactPath('');
      return;
    }
    const payload = await getArtifacts(sessionId);
    setArtifacts(payload.artifacts);
    setSelectedArtifactPath((current) => payload.artifacts.some((artifact) => artifact.path === current) ? current : payload.artifacts[0]?.path || '');
  }, []);

  useEffect(() => subscribeToEvents((event) => {
    if (event.type === 'sessions_changed') {
      setSessions(event.sessions || []);
      if (event.activeSessionId) setSelectedSessionId(event.activeSessionId);
      return;
    }
    if (event.type === 'bridge_status') {
      setBridgeLabel(event.message || 'Local agent');
      if (event.status === 'ready' || event.status === 'starting') setAgentReady(true);
      if (event.status === 'stopped' || event.status === 'error') setAgentReady(false);
    }
    if (event.type === 'session') {
      const sessionId = event.session?.active_session_id || event.session?.session?.session_id || '';
      if (sessionId) {
        setSelectedSessionId(sessionId);
        void refreshSessions();
        void refreshArtifacts(sessionId);
      }
    }
    setChat((current) => applyAgentEvent(current, event));
  }, setConnected), [refreshArtifacts, refreshSessions]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const state = await refreshSessions();
        if (cancelled || !state.activeSessionId) return;
        setSelectedSessionId(state.activeSessionId);
        const [history] = await Promise.all([
          getHistory(state.activeSessionId),
          refreshArtifacts(state.activeSessionId),
          startAgent({sessionId: state.activeSessionId}),
        ]);
        if (!cancelled) {
          setChat(createChatState(history.messages));
          setAgentReady(true);
        }
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : String(error));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshArtifacts, refreshSessions]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTo({top: element.scrollHeight, behavior: chat.busy ? 'smooth' : 'auto'});
  }, [chat.messages, chat.busy]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = '0px';
    textarea.style.height = `${Math.min(168, Math.max(28, textarea.scrollHeight))}px`;
  }, [draft]);

  async function openSession(sessionId: string) {
    if (!sessionId || sessionId === selectedSessionId) {
      setMobileSidebarOpen(false);
      return;
    }
    setLoadError('');
    setSelectedSessionId(sessionId);
    setMobileSidebarOpen(false);
    setChat(createChatState());
    try {
      const [history] = await Promise.all([
        getHistory(sessionId),
        refreshArtifacts(sessionId),
        startAgent({sessionId}),
      ]);
      setChat(createChatState(history.messages));
      setAgentReady(true);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
    }
  }

  async function newProject() {
    setLoadError('');
    setMobileSidebarOpen(false);
    setSelectedSessionId('');
    setChat(createChatState());
    setArtifacts([]);
    setSelectedArtifactPath('');
    setWorkflow('auto');
    try {
      await startAgent({newSession: true});
      setAgentReady(true);
      window.setTimeout(() => void refreshSessions().then((state) => {
        if (state.activeSessionId) setSelectedSessionId(state.activeSessionId);
      }), 450);
      textareaRef.current?.focus();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
    }
  }

  async function submit() {
    const text = draft.trim();
    if (!text || chat.busy) return;
    setLoadError('');
    setDraft('');
    setChat((current) => appendLocalUser(current, text));
    try {
      if (!agentReady) {
        await startAgent(selectedSessionId ? {sessionId: selectedSessionId} : {newSession: true});
        setAgentReady(true);
      }
      const outbound = composeAgentPrompt(text, workflow);
      await sendMessage(outbound);
    } catch (error) {
      const event: AgentEvent = {type: 'error', message: error instanceof Error ? error.message : String(error)};
      setChat((current) => applyAgentEvent(current, event));
    }
  }

  async function stop() {
    await stopAgent();
    setAgentReady(false);
    setChat((current) => ({...current, busy: false}));
  }

  const contextPercent = Math.min(100, Math.round((chat.promptTokens / CONTEXT_TARGET) * 100));
  const hasConversation = chat.messages.length > 0;

  return (
    <div className="app-shell">
      <Sidebar
        open={sidebarOpen}
        mobileOpen={mobileSidebarOpen}
        sessions={sessions}
        selectedSessionId={selectedSessionId}
        onToggle={() => setSidebarOpen((value) => !value)}
        onMobileClose={() => setMobileSidebarOpen(false)}
        onNew={() => void newProject()}
        onSelect={(sessionId) => void openSession(sessionId)}
        onArtifacts={() => setArtifactPanelOpen(true)}
      />

      <main className="workspace-main">
        <header className="workspace-header">
          <div className="workspace-title-row">
            <button className="icon-button mobile-only" onClick={() => setMobileSidebarOpen(true)} aria-label="Open navigation">
              <Menu size={19} />
            </button>
            {!sidebarOpen && (
              <button className="icon-button desktop-only" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">
                <PanelLeftOpen size={18} />
              </button>
            )}
            <div className="workspace-title-copy">
              <strong>{sessionTitle(selectedSession)}</strong>
              <span>{selectedSession?.workingDir || '.working_dir / new session'}</span>
            </div>
            {selectedSession && <StageBadge stage={selectedSession.stage} />}
          </div>
          <div className="workspace-actions">
            <div className="context-meter" title={`${chat.promptTokens.toLocaleString()} / ${CONTEXT_TARGET.toLocaleString()} context tokens`}>
              <span>Context</span>
              <i><b style={{width: `${Math.max(2, contextPercent)}%`}} /></i>
              <span>{contextPercent}%</span>
            </div>
            <button className="icon-button artifact-toggle" onClick={() => setArtifactPanelOpen((value) => !value)} aria-label="Toggle artifacts">
              <PanelRight size={18} />
              {artifacts.length > 0 && <span className="count-badge">{artifacts.length}</span>}
            </button>
          </div>
        </header>

        <div className="conversation" ref={scrollRef}>
          {!hasConversation ? (
            <EmptyState workflow={workflow} onWorkflow={setWorkflow} />
          ) : (
            <div className="message-stream">
              {chat.messages.map((message) => <MessageRow key={message.id} message={message} />)}
              {chat.busy && <ThinkingRow messages={chat.messages} />}
            </div>
          )}
        </div>

        <div className="composer-zone">
          {loadError && (
            <div className="inline-error" role="alert">
              <span>{loadError}</span>
              <button onClick={() => setLoadError('')} aria-label="Dismiss error"><X size={15} /></button>
            </div>
          )}
          <div className={`composer ${chat.busy ? 'is-busy' : ''}`}>
            <div className="composer-project-strip">
              <Folder size={15} />
              <span>{sessionTitle(selectedSession)}</span>
              <span className={`connection-dot ${connected ? 'is-connected' : ''}`} />
              <small>{connected ? bridgeLabel : 'Reconnecting'}</small>
            </div>
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void submit();
                }
              }}
              placeholder="Describe what you want to make"
              aria-label="Message ViMax"
              disabled={chat.busy}
              rows={1}
            />
            <div className="composer-controls">
              <label className="workflow-select">
                <Clapperboard size={15} />
                <select value={workflow} onChange={(event) => setWorkflow(event.target.value as Workflow)} disabled={chat.busy}>
                  {(Object.keys(workflowLabels) as Workflow[]).map((value) => <option key={value} value={value}>{workflowLabels[value]}</option>)}
                </select>
                <ChevronDown size={14} />
              </label>
              <div className="composer-spacer" />
              {chat.busy ? (
                <button className="send-button stop" onClick={() => void stop()} aria-label="Stop generation"><CircleStop size={18} /></button>
              ) : (
                <button className="send-button" onClick={() => void submit()} disabled={!draft.trim()} aria-label="Send message"><ArrowUp size={19} /></button>
              )}
            </div>
          </div>
        </div>
      </main>

      <ArtifactPanel
        open={artifactPanelOpen}
        artifacts={artifacts}
        selected={selectedArtifact}
        onSelect={setSelectedArtifactPath}
        onClose={() => setArtifactPanelOpen(false)}
      />
    </div>
  );
}

function Sidebar({open, mobileOpen, sessions, selectedSessionId, onToggle, onMobileClose, onNew, onSelect, onArtifacts}: {
  open: boolean;
  mobileOpen: boolean;
  sessions: SessionSummary[];
  selectedSessionId: string;
  onToggle: () => void;
  onMobileClose: () => void;
  onNew: () => void;
  onSelect: (sessionId: string) => void;
  onArtifacts: () => void;
}) {
  return (
    <>
      {mobileOpen && <button className="sidebar-scrim" onClick={onMobileClose} aria-label="Close navigation" />}
      <aside className={`sidebar ${open ? 'is-open' : 'is-collapsed'} ${mobileOpen ? 'is-mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-mark"><Film size={17} /></div>
          <strong>ViMax</strong>
          <button className="icon-button sidebar-collapse desktop-only" onClick={onToggle} aria-label="Collapse navigation">
            <PanelLeftClose size={17} />
          </button>
          <button className="icon-button mobile-only" onClick={onMobileClose} aria-label="Close navigation"><X size={18} /></button>
        </div>
        <nav className="primary-nav" aria-label="Primary navigation">
          <button onClick={onNew}><MessageSquarePlus size={17} /><span>New project</span></button>
          <button className="is-active"><Sparkles size={17} /><span>Workspace</span></button>
          <button onClick={onArtifacts}><Video size={17} /><span>Renders</span></button>
        </nav>
        <div className="session-section">
          <div className="section-label"><span>Projects</span><span>{sessions.length}</span></div>
          <div className="session-list">
            {sessions.map((session) => (
              <button
                key={session.sessionId}
                className={session.sessionId === selectedSessionId ? 'is-selected' : ''}
                onClick={() => onSelect(session.sessionId)}
              >
                <span className={`stage-dot stage-${session.stage}`} />
                <span className="session-copy">
                  <strong>{sessionTitle(session)}</strong>
                  <small>{relativeTime(session.updatedAt)} · {stageLabel(session.stage)}</small>
                </span>
              </button>
            ))}
            {sessions.length === 0 && <span className="empty-list">No projects yet</span>}
          </div>
        </div>
        <div className="sidebar-footer">
          <span className="avatar">V</span>
          <div><strong>Local workspace</strong><small>Local · ViMax</small></div>
        </div>
      </aside>
    </>
  );
}

function EmptyState({workflow, onWorkflow}: {workflow: Workflow; onWorkflow: (workflow: Workflow) => void}) {
  return (
    <section className="empty-state">
      <h1>What should we create?</h1>
      <div className="workflow-quick-picks" role="group" aria-label="Workflow preference">
        {(['idea2video', 'script2video', 'novel2video'] as Workflow[]).map((value) => (
          <button key={value} className={workflow === value ? 'is-selected' : ''} onClick={() => onWorkflow(value)}>
            {workflow === value && <Check size={14} />}{workflowLabels[value]}
          </button>
        ))}
      </div>
    </section>
  );
}

function MessageRow({message}: {message: Message}) {
  if (message.role === 'activity') return <ActivityRow message={message} />;
  return (
    <article className={`message-row role-${message.role}`}>
      <div className="message-avatar">{message.role === 'user' ? 'You' : message.role === 'error' ? '!' : 'V'}</div>
      <div className="message-body">
        <div className="message-author">{message.role === 'user' ? 'You' : message.role === 'error' ? 'Runtime' : 'ViMax'}</div>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{a: (props) => <a {...props} target="_blank" rel="noreferrer" />}}>
          {message.text}
        </ReactMarkdown>
      </div>
    </article>
  );
}

function ActivityRow({message}: {message: Message}) {
  const stage = message.stage ? humanize(message.stage) : '';
  const detail = stage.toLowerCase() === message.text.toLowerCase() ? message.text : [stage, message.text].filter(Boolean).join(' · ');
  return (
    <div className={`activity-row status-${message.status || 'done'}`}>
      <span className="activity-indicator">{message.status === 'running' ? <i /> : message.status === 'error' ? <X size={13} /> : <Check size={13} />}</span>
      <div>
        <strong>{humanize(message.tool || 'Workflow')}</strong>
        <span>{detail}</span>
      </div>
    </div>
  );
}

function ThinkingRow({messages}: {messages: Message[]}) {
  const running = [...messages].reverse().find((message) => message.role === 'activity' && message.status === 'running');
  return (
    <div className="thinking-row">
      <span className="thinking-mark"><i /><i /><i /></span>
      <span>{running ? `${humanize(running.tool || 'ViMax')} · ${running.text}` : 'ViMax is thinking'}</span>
    </div>
  );
}

function ArtifactPanel({open, artifacts, selected, onSelect, onClose}: {
  open: boolean;
  artifacts: Artifact[];
  selected?: Artifact;
  onSelect: (path: string) => void;
  onClose: () => void;
}) {
  return (
    <aside className={`artifact-panel ${open ? 'is-open' : ''}`}>
      <header>
        <div><strong>Artifacts</strong><span>{artifacts.length} files</span></div>
        <button className="icon-button" onClick={onClose} aria-label="Close artifacts"><X size={18} /></button>
      </header>
      {selected ? (
        <div className="artifact-preview">
          {selected.kind === 'image' && <img src={selected.url} alt={selected.name} />}
          {selected.kind === 'video' && <video src={selected.url} controls preload="metadata" />}
          {selected.kind === 'document' && <div className="document-preview"><FileJson size={28} /><span>{selected.name}</span></div>}
          <div className="artifact-preview-meta"><strong>{selected.name}</strong><span>{selected.path}</span></div>
        </div>
      ) : (
        <div className="artifact-empty"><ImageIcon size={25} /><span>No artifacts yet</span></div>
      )}
      <div className="artifact-list">
        {artifacts.map((artifact) => (
          <button key={artifact.path} className={artifact.path === selected?.path ? 'is-selected' : ''} onClick={() => onSelect(artifact.path)}>
            <span className="artifact-thumb">
              {artifact.kind === 'image' ? <img src={artifact.url} alt="" /> : artifact.kind === 'video' ? <Film size={18} /> : <FileText size={18} />}
            </span>
            <span><strong>{artifact.name}</strong><small>{artifact.path} · {formatBytes(artifact.size)}</small></span>
          </button>
        ))}
      </div>
    </aside>
  );
}

function StageBadge({stage}: {stage: string}) {
  return <span className={`stage-badge stage-${stage}`}><i />{stageLabel(stage)}</span>;
}

function sessionTitle(session?: SessionSummary) {
  if (!session) return 'New video';
  const source = session.idea || session.summary;
  if (source) return source.length > 38 ? `${source.slice(0, 38).trim()}…` : source;
  return session.sessionId.replace(/^\d{8}-\d{6}-?/, '') || 'Untitled video';
}

function stageLabel(stage: string) {
  const labels: Record<string, string> = {
    created: 'Created',
    narrative_planning: 'Planning',
    narrative_planned: 'Plan ready',
    novel_planning: 'Planning novel',
    novel_planned: 'Novel ready',
    rendering: 'Rendering',
    rendered: 'Rendered',
    error: 'Needs attention',
  };
  return labels[stage] || humanize(stage || 'Created');
}

function relativeTime(value: string) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'Recently';
  const delta = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return 'Now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
