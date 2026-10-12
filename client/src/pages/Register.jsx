import { useEffect, useState } from "react";
import { ArrowRight, Check, Sparkles, User, Mail, LockKeyhole } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import FloatingObjects from "../components/FloatingObjects";

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [focus, setFocus] = useState("");
  const [pressed, setPressed] = useState(false);
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => { 
    document.title = "AlfredAI — Create Account"; 
    return () => { document.title = "AlfredAI — AI meeting companion"; }; 
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      setStatus("error");
      return;
    }
    
    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters");
      setStatus("error");
      return;
    }

    setPressed(true); 
    setStatus("authenticating");
    try {
      await register(name, email, password);
      setStatus("success");
      // Auto login will happen via AuthContext, then navigate home
      window.setTimeout(() => navigate("/alfred/home"), 560);
    } catch (err) {
      setErrorMessage(err.message || "Failed to create account");
      setStatus("error");
      setPressed(false);
    }
  };

  const disabled = status === "authenticating" || status === "success";

  return (
    <div className="login-scene">
      <FloatingObjects focus={focus} pressed={pressed} />
      <div className="login-glow" />
      <header className="login-brand">
        <span className="brand-mark" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><img src="/logo.png" alt="AlfredAI" style={{ width: 'var(--logo-size, 20px)', height: 'var(--logo-size, 20px)', objectFit: 'contain' }} /></span>
        <span>AlfredAI</span>
        <span className="login-brand-caption">private workspace</span>
      </header>
      <main className="login-content">
        <div className="login-heading">
          <span className="micro-label login-eyebrow"><span className="eyebrow-line" /> Let's begin</span>
          <h1>Join AlfredAI.</h1>
          <p>Your notes, finally making sense.</p>
        </div>
        
        <form className={`login-form ${status === "error" ? "has-error" : ""}`} onSubmit={submit}>
          <label className={`login-field ${focus === "name" ? "is-focused" : ""}`}>
            <span><User size={15} /> Full Name</span>
            <input type="text" required value={name} onChange={(event) => { setName(event.target.value); setStatus("idle"); }} onFocus={() => setFocus("name")} onBlur={() => setFocus("")} placeholder="John Doe" />
          </label>
          <label className={`login-field ${focus === "email" ? "is-focused" : ""}`}>
            <span><Mail size={15} /> Email</span>
            <input type="email" required value={email} onChange={(event) => { setEmail(event.target.value); setStatus("idle"); }} onFocus={() => setFocus("email")} onBlur={() => setFocus("")} placeholder="you@studio.com" />
          </label>
          <label className={`login-field ${focus === "password" ? "is-focused" : ""}`}>
            <span><LockKeyhole size={15} /> Password</span>
            <input type="password" required minLength="6" value={password} onChange={(event) => { setPassword(event.target.value); setStatus("idle"); }} onFocus={() => setFocus("password")} onBlur={() => setFocus("")} placeholder="Create secret phrase" />
          </label>
          <label className={`login-field ${focus === "confirmPassword" ? "is-focused" : ""}`}>
            <span><Check size={15} /> Confirm Password</span>
            <input type="password" required minLength="6" value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); setStatus("idle"); }} onFocus={() => setFocus("confirmPassword")} onBlur={() => setFocus("")} placeholder="Confirm secret phrase" />
          </label>
          
          <div className="login-form-row">
            <span className="login-helper" style={{color: status === "error" ? 'var(--color-critical)' : 'inherit'}}>
              {status === "error" ? errorMessage : "A calm place for unfinished thoughts."}
            </span>
          </div>
          
          <button className={`login-submit ${disabled ? "is-busy" : ""}`} type="submit" disabled={disabled}>
            {status === "authenticating" ? <><span className="button-loader" /> Creating Account...</> : status === "success" ? <><Check size={16} /> Welcome to AlfredAI</> : <>Create Account <ArrowRight size={17} /></>}
          </button>
          
          <div className="login-divider"><span>or</span></div>
          <div className="social-row" style={{justifyContent: 'center', margin: 'auto'}}>
            <Link to="/alfred/login" className="forgot-button" style={{color: 'var(--color-ink)', textDecoration: 'underline'}}>Already have an account? Login</Link>
          </div>
        </form>
        
        <div className="login-footer">
          <span><span className="login-status-dot" /> Encrypted local prototype</span>
          <span>v1.0 · AlfredAI</span>
        </div>
      </main>
      <div className="login-scribble">Capture <span>·</span> Understand <span>·</span> Remember</div>
    </div>
  );
}
