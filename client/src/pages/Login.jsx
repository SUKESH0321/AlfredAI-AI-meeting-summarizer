import { useEffect, useState } from "react";
import { ArrowRight, Check, Github, LockKeyhole, Mail, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import FloatingObjects from "../components/FloatingObjects";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [focus, setFocus] = useState("");
  const [pressed, setPressed] = useState(false);
  const [status, setStatus] = useState("idle");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => { document.title = "AlfredAI — Enter your workspace"; return () => { document.title = "AlfredAI — AI meeting companion"; }; }, []);
  const submit = async (event) => {
    event.preventDefault();
    setPressed(true); 
    setStatus("authenticating");
    try {
      await login(email, password);
      setStatus("success");
      window.setTimeout(() => navigate("/alfred/home"), 560);
    } catch (err) {
      setErrorMessage(err.message || "Invalid email or password");
      setStatus("error");
      setPressed(false);
    }
  };
  const disabled = status === "authenticating" || status === "success";
  return <div className="login-scene"><FloatingObjects focus={focus} pressed={pressed} /><div className="login-glow" /><header className="login-brand"><span className="brand-mark"><Sparkles size={15} /></span><span>AlfredAI</span><span className="login-brand-caption">private workspace</span></header><main className="login-content"><div className="login-heading"><span className="micro-label login-eyebrow"><span className="eyebrow-line" /> Welcome back</span><h1>Your conversations.<br /><em>Understood.</em></h1><p>Capture the thought. Keep the thread.</p></div><form className={`login-form ${status === "error" ? "has-error" : ""}`} onSubmit={submit}>
    <label className={`login-field ${focus === "email" ? "is-focused" : ""}`}><span><Mail size={15} /> Email</span><input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setStatus("idle"); }} onFocus={() => setFocus("email")} onBlur={() => setFocus("")} placeholder="you@studio.com" autoComplete="email" /></label>
    <label className={`login-field ${focus === "password" ? "is-focused" : ""}`}><span><LockKeyhole size={15} /> Password</span><input type="password" value={password} onChange={(event) => { setPassword(event.target.value); setStatus("idle"); }} onFocus={() => setFocus("password")} onBlur={() => setFocus("")} placeholder="Your secret phrase" autoComplete="current-password" /></label>
    <div className="login-form-row"><span className="login-helper" style={{color: status === "error" ? 'var(--color-critical)' : 'inherit'}}>{status === "error" ? errorMessage : "A calm place for unfinished thoughts."}</span><button className="forgot-button" type="button">Forgot password?</button></div>
    <button className={`login-submit ${disabled ? "is-busy" : ""}`} type="submit" disabled={disabled}>{status === "authenticating" ? <><span className="button-loader" /> Opening AlfredAI...</> : status === "success" ? <><Check size={16} /> Welcome to AlfredAI</> : <>Continue <ArrowRight size={17} /></>}</button>
    <div className="login-divider"><span>or new to AlfredAI?</span></div>
    <div className="social-row" style={{justifyContent: 'center', margin: 'auto'}}>
      <button type="button" onClick={() => navigate("/alfred/register")} style={{color: 'var(--color-ink)', textDecoration: 'underline'}}>Create Account</button>
    </div>
  </form><div className="login-footer"><span><span className="login-status-dot" /> Encrypted local prototype</span><span>v1.0 · AlfredAI</span></div></main><div className="login-scribble">Capture <span>·</span> Understand <span>·</span> Remember</div></div>;
}
