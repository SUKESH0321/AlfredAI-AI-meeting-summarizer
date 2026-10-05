import { useEffect, useRef, useState } from "react";
import { BrowserRouter, HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft, CalendarDays, Check, ChevronRight, CircleHelp, FileAudio, History as HistoryIcon,
  ListChecks, Mic, MoreHorizontal, Pause, Play, Search, Settings2, Sparkles, Square, Upload,
  UserRound, X, Zap, Trash2, Loader2
} from "lucide-react";
import { useAuth, AuthProvider } from "./context/AuthContext";
import CustomCursor from "./components/CustomCursor";
import Login from "./pages/Login";
import Register from "./pages/Register";
import * as api from "./services/api";
import "./index.css";

const getRelativeDayLabel = (d) => {
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
};

const mapMeetingList = (m) => {
  const dt = new Date(m.createdAt);
  const dur = m.duration ? `${Math.round(m.duration/60)} min` : "Processing...";
  return {
    id: m.id,
    title: m.title || m.originalFilename || "Untitled",
    date: dt.toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' }),
    dayLabel: getRelativeDayLabel(dt),
    duration: m.status === 'completed' ? dur : (m.status || 'uploaded'),
    type: "Meeting",
    summary: m.insights?.summary || "",
    status: m.status || 'uploaded'
  };
};

const mapFullMeeting = (data) => {
  const m = data.meeting;
  const tr = data.transcript;
  const ins = data.insights;
  const ai = data.actionItems;

  let parsedTranscript = [];
  try {
     parsedTranscript = tr?.text ? JSON.parse(tr.text) : [];
     if (!Array.isArray(parsedTranscript)) {
         parsedTranscript = [{ time: "00:00", speaker: "Speaker", text: tr?.text }];
     }
  } catch(e) {
     parsedTranscript = [{ time: "00:00", speaker: "Speaker", text: tr?.text }];
  }

  const safeParse = (val, fallback) => {
     if (!val) return fallback;
     if (typeof val === "object") return val;
     try { return JSON.parse(val); } catch(e) { return fallback; }
  };

  const dt = new Date(m.createdAt);
  
  return {
    id: m.id,
    title: m.title || m.originalFilename,
    date: dt.toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' }),
    duration: m.duration ? `${Math.round(m.duration/60)} min` : "0 min",
    type: "Meeting",
    summary: ins?.summary || "No summary available.",
    keyPoints: safeParse(ins?.keyPoints, []),
    decisions: safeParse(ins?.decisions, []),
    nextMeeting: safeParse(ins?.nextMeeting, { date: null, time: null, purpose: null }),
    transcript: parsedTranscript,
    actionItems: (ai || []).map(a => ({ id: a.id, owner: a.assignee || "Unassigned", task: a.task, due: a.deadline || "No date", done: a.status === "completed" }))
  };
};

function DashboardApp() {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const { logout, user, setUser } = useAuth();
  const routeView = location.pathname.endsWith("/history") ? "history" : location.pathname.endsWith("/account") ? "account" : "home";
  
  const initials = user?.name ? user.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase() : '?';
  
  const [view, setView] = useState(routeView);
  const [meetings, setMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [flow, setFlow] = useState("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [uploadName, setUploadName] = useState("");
  const [toast, setToast] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [audioUrl, setAudioUrl] = useState(null);
  const [realAudioBlob, setRealAudioBlob] = useState(null);

  const fetchMeetings = async () => {
    try {
      const data = await api.getMeetings();
      setMeetings((data.meetings || []).map(mapMeetingList));
    } catch(e) {
      setToast("Error connecting to backend");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchMeetings(); }, []);

  useEffect(() => { setView(routeView); }, [routeView]);

  useEffect(() => {
    if (flow !== "recording") return undefined;
    const timer = window.setInterval(() => setRecordingSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [flow]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Polling for processing meetings
  useEffect(() => {
    const hasProcessing = meetings.some(m => m.status === 'processing' || m.status === 'uploaded');
    if (hasProcessing) {
       const timer = setInterval(fetchMeetings, 3000);
       return () => clearInterval(timer);
    }
  }, [meetings]);

  const navigate = (nextView) => {
    setFlow("idle");
    setUploadOpen(false);
    if (nextView === "meeting") { setView(nextView); return; }
    routerNavigate(`/alfred/${nextView}`);
  };

  const startRecording = async () => { 
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4'; 
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = ''; 
        }
      }
      const mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType || undefined });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setRealAudioBlob(audioBlob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
        setFlow("preview");
      };
      
      mediaRecorder.start(250);
      setView("home"); setFlow("recording"); setRecordingSeconds(0); setUploadOpen(false); 
    } catch (err) {
      setToast("Error accessing microphone: " + err.message);
    }
  };

  const stopRecording = () => { 
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const handleDiscard = () => {
    setAudioUrl(null);
    setRealAudioBlob(null);
    setFlow("idle");
  };

  const handleSubmitRecorded = async () => {
    setFlow("processing");
    try {
      const ext = realAudioBlob.type.includes('mp4') ? 'mp4' : 'webm';
      const file = new File([realAudioBlob], `browser_recording.${ext}`, { type: realAudioBlob.type });
      setUploadName(file.name);
      
      const uploadResp = await api.uploadMeeting(file);
      setMeetings(prev => [mapMeetingList({...uploadResp.meeting, status: 'uploaded'}), ...prev]);
      
      await api.processMeeting(uploadResp.meeting.id);
      await fetchMeetings(); // Will trigger polling if processing
      setFlow("idle");
      setToast("Recording submitted successfully. Processing...");
    } catch(e) {
      setToast("Upload or process failed");
      fetchMeetings();
      setFlow("idle");
    }
  };
  const openUpload = () => { setFlow("idle"); setView("home"); setUploadOpen(true); };
  
  const handleFile = async (file) => {
    if (!file) return;
    setUploadName(file.name);
    setUploadOpen(false);
    setView("home");
    setFlow("processing");
    try {
      const uploadResp = await api.uploadMeeting(file);
      setMeetings(prev => [mapMeetingList({...uploadResp.meeting, status: 'uploaded'}), ...prev]);
      
      await api.processMeeting(uploadResp.meeting.id);
      await fetchMeetings(); // Will trigger polling if processing
      setFlow("idle");
      setToast("Upload successful. Processing...");
    } catch(e) {
      setToast("Upload or process failed");
      fetchMeetings();
      setFlow("idle");
    }
  };
  
  const onFileInput = (event) => { handleFile(event.target.files?.[0]); event.target.value = ""; };
  
  const openMeeting = async (mtg) => {
    if (mtg.status !== 'completed') {
      setToast(`Meeting is still ${mtg.status}...`);
      return;
    }
    setFlow("idle"); 
    setView("meeting"); 
    setSelectedMeeting(null); // trigger loading state in UI
    try {
      const resp = await api.getMeetingById(mtg.id);
      setSelectedMeeting(mapFullMeeting(resp));
    } catch(e) {
      setToast("Error fetching meeting details");
      setView("history");
    }
  };
  
  const deleteActiveMeeting = async (mtgId) => {
    try {
      await api.deleteMeeting(mtgId);
      setToast("Meeting deleted");
      setView("history");
      fetchMeetings();
    } catch(e) {
      setToast("Failed to delete meeting");
    }
  };

  const handleDrop = (event) => { event.preventDefault(); setIsDragging(false); handleFile(event.dataTransfer.files?.[0]); };

  return (
    <div className={`app-shell ${isDragging ? "is-dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={(event) => { if (event.currentTarget === event.target) setIsDragging(false); }} onDrop={handleDrop}>
      <header className="topbar">
        <button className="brand" onClick={() => navigate("home")} aria-label="Go to AlfredAI home">
          <span className="brand-mark"><Sparkles size={15} strokeWidth={2.3} /></span><span>AlfredAI</span>
        </button>
        <div className="topbar-right"><span className="sync-status"><span className="sync-dot" /> Local workspace</span><button className="icon-button tooltip-trigger" data-tooltip="Help" onClick={() => setToast("Help center is coming soon.")} aria-label="Help"><CircleHelp size={18} /></button><button className="avatar-button" onClick={() => navigate("account")} aria-label="Open account">{initials}</button></div>
      </header>
      <main className="workspace">
        <div key={`${view}-${flow}`} className="page-transition">
          {view === "home" && <HomeView user={user} flow={flow} recordingSeconds={recordingSeconds} uploadName={uploadName} uploadOpen={uploadOpen} isDragging={isDragging} onStart={startRecording} onStop={stopRecording} onUpload={openUpload} onCloseUpload={() => setUploadOpen(false)} onFile={onFileInput} onHistory={() => navigate("history")} onOpenMeeting={openMeeting} fileInputRef={fileInputRef} meetings={meetings} isLoading={isLoading} audioUrl={audioUrl} onDiscard={handleDiscard} onSubmit={handleSubmitRecorded} />}
          {view === "history" && <HistoryView meetings={meetings} isLoading={isLoading} onOpen={openMeeting} onBack={() => navigate("home")} />}
          {view === "meeting" && <MeetingView meeting={selectedMeeting} onBack={() => navigate("history")} onToast={setToast} onDelete={deleteActiveMeeting} />}
          {view === "account" && <AccountView user={user} setUser={setUser} initials={initials} onToast={setToast} onLogout={() => { logout(); routerNavigate("/alfred/login"); }} />}
        </div>
      </main>
      <input ref={fileInputRef} className="hidden-input" type="file" accept="audio/*,video/*,.mp3,.wav,.m4a,.mp4,.webm" onChange={onFileInput} />
      <BottomBar active={view} onNavigate={navigate} onStart={startRecording} onUpload={openUpload} onHistory={() => navigate("history")} onToast={setToast} />
      {toast && <div className="toast"><Check size={15} /> {toast}</div>}
    </div>
  );
}

function HomeView({ user, flow, recordingSeconds, uploadName, uploadOpen, isDragging, onStart, onStop, onUpload, onCloseUpload, onFile, onHistory, onOpenMeeting, fileInputRef, meetings, isLoading, audioUrl, onDiscard, onSubmit }) {
  if (flow === "recording") return <RecordingView seconds={recordingSeconds} onStop={onStop} />;
  if (flow === "processing") return <ProcessingView fileName={uploadName} />;
  if (flow === "preview") return <PreviewView audioUrl={audioUrl} onDiscard={onDiscard} onSubmit={onSubmit} />;
  
  return <section className="home-view page-enter">
    <div className="home-intro"><div className="eyebrow"><span className="eyebrow-line" /> {new Date().toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'})}</div><h1>Good morning, <em>{user?.name?.split(' ')[0]}.</em></h1><p className="home-subtitle">What would you like to capture?</p></div>
    <div className={`capture-grid ${uploadOpen ? "upload-expanded" : ""}`}>
      <button className="capture-card record-card" onClick={onStart}><div className="capture-icon coral-icon"><Mic size={25} /></div><div className="capture-copy"><strong>Record a conversation</strong><span>Start a live recording</span></div><span className="capture-shortcut">⌘ R</span><ChevronRight className="capture-arrow" size={19} /></button>
      <button className={`capture-card upload-card ${uploadOpen ? "selected" : ""}`} onClick={onUpload}><div className="capture-icon blue-icon"><Upload size={23} /></div><div className="capture-copy"><strong>Upload a file</strong><span>MP3, WAV, M4A, MP4, WebM</span></div><span className="capture-shortcut">⌘ U</span><ChevronRight className="capture-arrow" size={19} /></button>
      {uploadOpen && <div className={`upload-zone ${isDragging ? "drop-active" : ""}`}><button className="upload-close" onClick={onCloseUpload} aria-label="Close upload"><X size={17} /></button><div className="upload-zone-icon"><Upload size={23} /></div><strong>{isDragging ? "Drop to upload" : "Drop your recording here"}</strong><span>or <button onClick={() => fileInputRef.current?.click()}>choose a file</button></span><small>MP3 · WAV · M4A · MP4 · WEBM</small></div>}
    </div>
    <div className="home-lower-grid">
      <section className="recent-section">
        <div className="section-heading">
          <div><span className="micro-label">Your notebook</span><h2>Recent recordings</h2></div>
          <button className="text-button" onClick={onHistory}>See all <ChevronRight size={15} /></button>
        </div>
        <div className="recent-list">
          {isLoading && <div style={{color: "var(--color-ink-light)", padding: "1rem"}}>Loading recordings...</div>}
          {!isLoading && meetings.length === 0 && <div style={{color: "var(--color-ink-light)", padding: "1rem"}}>No meetings yet. Upload a recording to get started.</div>}
          {!isLoading && meetings.slice(0, 3).map((meeting, index) => <MeetingRow key={meeting.id} meeting={meeting} index={index} onClick={() => onOpenMeeting(meeting)} />)}
        </div>
      </section>
      <aside className="today-note"><span className="note-pin" /><div className="micro-label">A small nudge</div><p>“The best ideas are often the ones you almost forget to write down.”</p><span className="note-caption">— your future self</span></aside>
    </div>
  </section>;
}

function RecordingView({ seconds, onStop }) { return <section className="center-stage page-enter recording-state"><div className="recording-orbit"><div className="recording-pulse" /><div className="recording-orb"><Mic size={28} /></div></div><span className="recording-kicker"><span className="live-dot" /> Recording in progress</span><h1>Listening<span className="ellipsis">...</span></h1><div className="recording-time">{formatTime(seconds)}</div><Waveform /><p className="recording-hint">Speak naturally. You can pause or stop whenever you’re ready.</p><button className="stop-button" onClick={onStop}><Square size={15} fill="currentColor" /> Stop recording</button></section>; }

function ProcessingView({ fileName }) {
  const steps = ["Audio received", "Transcribing audio", "Understanding conversation", "Generating AlfredAI summary", "Extracting action items"];
  const [activeStep, setActiveStep] = useState(1);
  useEffect(() => { const timer = window.setInterval(() => setActiveStep((step) => Math.min(step + 1, 3)), 820); return () => window.clearInterval(timer); }, []);
  return <section className="center-stage processing-stage page-enter"><div className="processing-icon"><Sparkles size={25} /></div><span className="recording-kicker">{fileName ? "Preparing your upload" : "Preparing your recording"}</span><h1>Making sense of it.</h1><p className="processing-sub">A few quiet seconds while AlfredAI turns your audio into something useful.</p><div className="processing-list">{steps.map((step, index) => <div key={step} className={`processing-step ${index < activeStep ? "done" : index === activeStep ? "active" : ""}`}><span className="step-icon">{index < activeStep ? <Check size={13} /> : index === activeStep ? <span className="step-spinner" /> : <span />}</span><span>{step}</span>{index < activeStep && <small>done</small>}</div>)}</div></section>;
}

function PreviewView({ audioUrl, onDiscard, onSubmit }) { 
  return <section className="center-stage page-enter recording-state">
    <div className="recording-orb is-preview" style={{ marginBottom: "1rem", color: "var(--color-ink)", background: "var(--color-surface-hover)" }}><FileAudio size={28} /></div>
    <span className="recording-kicker">Recording captured</span>
    <h1>Preview recording</h1>
    <div style={{ marginTop: '2rem', marginBottom: '2rem', width: '100%', maxWidth: '400px', display: 'flex', justifyContent: 'center' }}>
      <audio src={audioUrl} controls style={{ width: '100%' }} />
    </div>
    <div style={{ display: 'flex', gap: '1rem' }}>
      <button onClick={onSubmit} style={{ padding: "0.5rem 1rem", borderRadius: "4px", background: "var(--color-ink)", color: "var(--color-surface)", border: "none", cursor: "pointer", fontWeight: 500 }}>Submit & Process</button>
      <button onClick={onDiscard} style={{ padding: "0.5rem 1rem", borderRadius: "4px", background: "var(--color-surface-hover)", color: "var(--color-ink)", border: "none", cursor: "pointer", fontWeight: 500 }}>Discard</button>
    </div>
  </section>; 
}

function HistoryView({ meetings, isLoading, onOpen, onBack }) {
  const [query, setQuery] = useState("");
  const filtered = meetings.filter((meeting) => `${meeting.title} ${meeting.type} ${meeting.date} ${meeting.summary}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="subpage page-enter"><div className="subpage-heading"><div><button className="back-link" onClick={onBack}><ArrowLeft size={15} /> Back</button><span className="micro-label">Archive</span><h1>My notebook</h1><p>Every conversation, kept close.</p></div><div className="history-meta"><span>{meetings.length} notes</span><span className="meta-divider" /><span>Last synced just now</span></div></div><div className="search-shell"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your notebook..." /><kbd>⌘ K</kbd></div><div className="history-list">
    {isLoading && <div className="empty-search">Loading your notebook...</div>}
    {!isLoading && filtered.length === 0 && meetings.length > 0 && <div className="empty-search">No notes match “{query}”.</div>}
    {!isLoading && meetings.length === 0 && <div className="empty-search">No meetings found. Upload a recording to get started.</div>}
    {!isLoading && filtered.map((meeting, index) => <div key={meeting.id} className="history-group" style={{ "--delay": `${index * 70}ms` }}><div className="history-date">{meeting.dayLabel}</div><button className="history-entry" onClick={() => onOpen(meeting)}><span className={`entry-index index-${index + 1}`}>{String(index + 1).padStart(2, "0")}</span><span className="entry-main"><strong>{meeting.title}</strong><span>{meeting.type} · {meeting.duration}</span></span><span className="entry-summary">{meeting.summary || "No summary available."}</span><span className="entry-status"><span className="status-dot" style={{ backgroundColor: meeting.status === 'completed' ? 'inherit' : 'var(--color-ink-lighter)' }} /> {meeting.status === 'completed' ? 'AI summary' : meeting.status}</span><ChevronRight size={17} /></button></div>)}
  </div></section>;
}

function MeetingView({ meeting, onBack, onToast, onDelete }) {
  const [activeTab, setActiveTab] = useState("summary");
  const [playing, setPlaying] = useState(false);
  const [activeLine, setActiveLine] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);
  
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      setPlaying(false);
      audio.currentTime = 0;
    };
    
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('durationchange', updateDuration);
    audio.addEventListener('ended', handleEnded);
    
    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('durationchange', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [meeting?.id]);

  if (!meeting) {
    return <section className="center-stage page-enter"><Loader2 className="processing-icon spinner" style={{animation: 'spin 1.5s linear infinite'}} size={32} /><h2>Loading details...</h2></section>;
  }

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => onToast("Unable to load recording."));
    }
  };

  const handleSeek = (e) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = pos * Math.max(duration, 0); 
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };
  
  const formatTime = (secs) => {
    if (isNaN(secs) || !isFinite(secs)) return "00:00";
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const mediaUrl = `${API_URL}/api/meetings/${meeting.id}/media`;

  return <section className="meeting-page page-enter">
    <div className="meeting-header">
      <div>
        <button className="back-link" onClick={onBack}><ArrowLeft size={15} /> Back to notebook</button>
        <div className="meeting-title-row">
          <span className="meeting-type">{meeting.type}</span><span className="title-dot">·</span><span>{meeting.duration}</span>
        </div>
        <h1>{meeting.title}</h1>
        <p className="meeting-date"><CalendarDays size={15} /> {meeting.date}</p>
      </div>
      <div className="meeting-actions">
        <button className="icon-button paper-button tooltip-trigger" data-tooltip="Share note" onClick={() => onToast("Share link copied to clipboard.")} aria-label="Share note"><Upload size={17} /></button>
        <button className="icon-button paper-button tooltip-trigger" onClick={() => onDelete(meeting.id)} aria-label="Delete note" style={{color: 'var(--color-critical)'}}><Trash2 size={17} /></button>
      </div>
    </div>
    <div className={`audio-strip ${playing ? "is-playing" : ""}`}>
      <audio ref={audioRef} src={mediaUrl} crossOrigin="use-credentials" preload="metadata" />
      <button className="play-button" onClick={togglePlay} aria-label={playing ? "Pause audio" : "Play audio"}>
        {playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
      </button>
      <div className="audio-track" onClick={handleSeek} style={{ cursor: 'pointer' }}>
        <span className="audio-progress" style={{ width: duration ? `${(currentTime / duration) * 100}%` : "0%" }} />
      </div>
      <span className="audio-time">{formatTime(currentTime)} <span>/ {formatTime(duration)}</span></span>
      <span className="audio-label"><FileAudio size={15} /> original recording</span>
    </div>
    <div className="meeting-tabs">
      <button className={activeTab === "summary" ? "active" : ""} onClick={() => setActiveTab("summary")}>Summary</button>
      <button className={activeTab === "transcript" ? "active" : ""} onClick={() => setActiveTab("transcript")}>Transcript <span>{meeting.transcript?.length || 0}</span></button>
    </div>
    {activeTab === "summary" ? <SummaryContent meeting={meeting} onToast={onToast} /> : <TranscriptContent transcript={meeting.transcript} activeLine={activeLine} onSelect={setActiveLine} />}
  </section>;
}

function SummaryContent({ meeting, onToast }) { 
  const [items, setItems] = useState(meeting.actionItems);
  
  const toggleItem = async (itemIndex) => {
    const target = items[itemIndex];
    if (!target) return;
    const previousState = [...items];
    const newStatus = target.done ? "pending" : "completed";
    
    // Optimistic cache
    setItems((current) => current.map((item, index) => index === itemIndex ? { ...item, done: !item.done } : item));
    
    try {
      await api.updateActionItem(target.id, { status: newStatus });
    } catch (e) {
      onToast("Failed to update status");
      setItems(previousState);
    }
  };

  return <div className="summary-layout"><div className="summary-main"><section className="notebook-section summary-block"><SectionLabel icon={<Sparkles size={14} />} label="Summary" /><p className="summary-lede">{meeting.summary}</p></section><section className="notebook-section"><SectionLabel icon={<Zap size={14} />} label="Key points" /><ul className="ink-list">{meeting.keyPoints.length > 0 ? meeting.keyPoints.map((point) => <li key={point}>{point}</li>) : <li>No key points identified.</li>}</ul></section><section className="notebook-section"><SectionLabel icon={<ListChecks size={14} />} label="Action items" /><div className="action-list">{items.length > 0 ? items.map((item, index) => <button className={`action-item ${item.done ? "complete" : ""}`} key={item.id} onClick={() => toggleItem(index)}><span className="checkbox">{item.done && <Check size={13} />}</span><span className="action-copy"><strong>{item.task}</strong><span>{item.owner}</span></span><span className="due-date">Due {item.due}</span></button>) : <p style={{color: 'var(--color-ink-light)'}}>No action items found.</p>}</div></section></div><aside className="summary-aside"><section className="aside-note next-meeting"><span className="note-pin" /><SectionLabel icon={<CalendarDays size={14} />} label="Next meeting" /><strong>{meeting.nextMeeting.date ? `${meeting.nextMeeting.date}${meeting.nextMeeting.time ? ` at ${meeting.nextMeeting.time}` : ''}` : "Not scheduled"}</strong><span>{meeting.nextMeeting.purpose || ""}</span></section><section className="aside-note"><SectionLabel icon={<Check size={14} />} label="Decisions" /><ul className="decision-list">{meeting.decisions.length > 0 ? meeting.decisions.map((decision) => <li key={decision}>{decision}</li>) : <li>No decisions recorded.</li>}</ul></section><div className="ai-footnote"><Sparkles size={14} /><span>Summarized by AlfredAI<br /><small>Based on {meeting.transcript.length} transcript moments</small></span></div></aside></div>; 
}

function TranscriptContent({ transcript, activeLine, onSelect }) { return <div className="transcript-layout"><div className="transcript-intro"><span className="micro-label">Verbatim notes</span><h2>A conversation in context.</h2><p>Tap a timestamp to jump back to the recording when audio playback is connected.</p></div><div className="transcript-list">{transcript.length > 0 ? transcript.map((line, index) => <button className={`transcript-line ${activeLine === index ? "is-current" : ""}`} key={`${line.time}-${line.speaker}-${index}`} onClick={() => onSelect(index)}><span className="transcript-time">{line.time}</span><span><strong>{line.speaker}</strong><span>{line.text}</span></span><Play size={14} /></button>) : <p style={{marginTop: '2rem'}}>No complete transcript available yet.</p>}</div></div>; }

function AccountView({ user, setUser, initials, onToast, onLogout }) {
  const [expanded, setExpanded] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || "");
  const [editEmail, setEditEmail] = useState(user?.email || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    setError(null);
    if (!editName.trim() || !editEmail.trim()) {
      setError("Name and email are required");
      return;
    }
    setLoading(true);
    try {
      const resp = await api.updateProfile(editName, editEmail);
      setUser(resp.user);
      setIsEditing(false);
      onToast("Profile updated successfully!");
    } catch (e) {
      setError(e.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const groups = [{ title: "Preferences", items: [{ icon: Settings2, label: "Appearance", detail: "Warm paper · System theme" }, { icon: Zap, label: "AI behaviour", detail: "Balanced summaries" }] }, { title: "Storage", items: [{ icon: FileAudio, label: "Local recordings", detail: "1.2 GB of 5 GB used" }, { icon: UserRound, label: "Account information", detail: "Personal workspace" }] }];
  return <section className="subpage account-page page-enter"><div className="subpage-heading"><div><span className="micro-label">Workspace</span><h1>Account & settings</h1><p>Keep your notebook feeling like yours.</p></div></div><div className="account-grid"><section className="profile-note"><div className="profile-avatar">{initials}</div>
    {isEditing ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {error && <div style={{ color: "var(--color-critical)", fontSize: "0.8rem", background: "var(--color-critical-surface)", padding: "0.5rem", borderRadius: "4px" }}>{error}</div>}
          <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Full Name" style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid var(--color-ink-lighter)", background: "var(--color-surface)", color: "var(--color-ink)" }} />
          <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="Email Address" style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid var(--color-ink-lighter)", background: "var(--color-surface)", color: "var(--color-ink)" }} />
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
            <button onClick={handleSave} disabled={loading} style={{ padding: "0.5rem", borderRadius: "4px", background: "var(--color-ink)", color: "var(--color-surface)", border: "none", cursor: "pointer", fontWeight: 500, flex: 1 }}>{loading ? "Saving..." : "Save"}</button>
            <button onClick={() => { setIsEditing(false); setEditName(user?.name); setEditEmail(user?.email); setError(null); }} disabled={loading} style={{ padding: "0.5rem", borderRadius: "4px", background: "var(--color-surface-hover)", color: "var(--color-ink)", border: "none", cursor: "pointer", fontWeight: 500, flex: 1 }}>Cancel</button>
          </div>
        </div>
    ) : (
      <>
        <div><span className="micro-label">Signed in as</span><h2>{user?.name}</h2><p>{user?.email}</p></div>
        <button className="icon-button paper-button" onClick={() => setIsEditing(true)} aria-label="Edit profile"><Settings2 size={17} /></button>
      </>
    )}
  </section><div className="settings-list">{groups.map((group) => <SettingsGroup key={group.title} {...group} expanded={expanded} onToggle={setExpanded} onToast={onToast} />)}<button className="signout-button" onClick={onLogout}>Sign out</button></div></div></section>;
}
function SettingsGroup({ title, items, expanded, onToggle, onToast }) { return <section className="settings-group"><span className="micro-label">{title}</span>{items.map(({ icon: Icon, label, detail }) => { const open = expanded === label; return <div className={`settings-item ${open ? "expanded" : ""}`} key={label}><button className="settings-row" onClick={() => onToggle(open ? "" : label)}><span className="settings-icon"><Icon size={17} /></span><span><strong>{label}</strong><small>{detail}</small></span><ChevronRight size={16} /></button><div className="settings-detail"><p>{label === "Appearance" ? "Your paper, ruling, and type stay calm and warm across AlfredAI." : label === "AI behaviour" ? "Choose how much context AlfredAI keeps in your summaries." : label === "Local recordings" ? "Audio files stay on this device in the current demo." : "Personal workspace settings are ready for your account connection."}</p><button onClick={() => onToast(`${label} settings are coming soon.`)}>Edit preference</button></div></div>; })}</section>; }
function SectionLabel({ icon, label }) { return <div className="section-label">{icon}<span>{label}</span></div>; }
function MeetingRow({ meeting, index, onClick }) { return <button className="meeting-row" onClick={onClick}><span className="row-number">0{index + 1}</span><span className="row-copy"><strong>{meeting.title}</strong><span>{meeting.type} · {meeting.duration}</span></span><span className="row-date">{meeting.dayLabel}</span><ChevronRight size={16} /></button>; }
function BottomBar({ active, onNavigate, onStart, onUpload, onHistory, onToast }) { return <nav className="bottom-bar" aria-label="Primary navigation"><button className={`bottom-item ${active === "home" ? "active" : ""}`} onClick={() => onNavigate("home")}><span className="bottom-icon"><Sparkles size={18} /></span><span>Today</span></button><button className="bottom-item record-bottom" onClick={onStart}><span className="bottom-icon record-bottom-icon"><Mic size={19} /></span><span>Record</span></button><button className="bottom-item" onClick={onUpload}><span className="bottom-icon"><Upload size={18} /></span><span>Upload</span></button><button className={`bottom-item ${active === "history" || active === "meeting" ? "active" : ""}`} onClick={onHistory}><span className="bottom-icon"><HistoryIcon size={18} /></span><span>History</span></button><button className={`bottom-item ${active === "account" ? "active" : ""}`} onClick={() => onNavigate("account")}><span className="bottom-icon"><UserRound size={18} /></span><span>Account</span></button><button className="bottom-more" onClick={() => onToast("More workspace tools are coming soon.")} aria-label="More tools"><MoreHorizontal size={20} /></button></nav>; }
function Waveform() { return <div className="waveform" aria-label="Audio waveform">{[12, 24, 38, 20, 32, 48, 26, 42, 18, 34, 51, 28, 40, 20, 30, 44, 23, 37, 17, 28, 42, 25, 36, 18, 30, 48, 25, 39, 20, 33, 14].map((height, index) => <span key={index} style={{ height: `${height}px`, animationDelay: `${index * 35}ms` }} />)}</div>; }
function formatTime(value) { const minutes = Math.floor(value / 60).toString().padStart(2, "0"); const seconds = (value % 60).toString().padStart(2, "0"); return `${minutes}:${seconds}`; }
function ProtectedRoute({ children }) {
  const { authenticated } = useAuth();
  return authenticated ? children : <Navigate to="/alfred/login" replace />;
}

function LoginRoute() {
  const { authenticated } = useAuth();
  return authenticated ? <Navigate to="/alfred/home" replace /> : <Login />;
}

function RegisterRoute() {
  const { authenticated } = useAuth();
  return authenticated ? <Navigate to="/alfred/home" replace /> : <Register />;
}

function App() {
  const isElectron = navigator.userAgent.toLowerCase().includes('electron');
  const isDev = import.meta.env.DEV;
  const RouterComponent = (isElectron && !isDev) ? HashRouter : BrowserRouter;

  return <AuthProvider><RouterComponent><CustomCursor /><Routes>
    <Route path="/alfred" element={<Navigate to="/alfred/login" replace />} />
    <Route path="/alfred/login" element={<LoginRoute />} />
    <Route path="/alfred/register" element={<RegisterRoute />} />
    <Route path="/alfred/home" element={<ProtectedRoute><DashboardApp /></ProtectedRoute>} />
    <Route path="/alfred/history" element={<ProtectedRoute><DashboardApp /></ProtectedRoute>} />
    <Route path="/alfred/account" element={<ProtectedRoute><DashboardApp /></ProtectedRoute>} />
    <Route path="*" element={<Navigate to="/alfred" replace />} />
  </Routes></RouterComponent></AuthProvider>;
}

export default App;
