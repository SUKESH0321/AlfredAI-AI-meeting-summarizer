import { useEffect, useRef } from "react";
import { Headphones, Mic, Paperclip, PenLine, Sparkles, Waves } from "lucide-react";

const objects = [
  { type: "mic", className: "float-one", depth: .8, label: "floating microphone" },
  { type: "mic", className: "float-two", depth: .42, label: "floating microphone" },
  { type: "mic", className: "float-three", depth: .62, label: "floating microphone" },
  { type: "pen", className: "float-four", depth: .7, label: "floating pen" },
  { type: "pen", className: "float-five", depth: .38, label: "floating pen" },
  { type: "clip", className: "float-six", depth: .3, label: "floating paper clip" },
  { type: "spark", className: "float-seven", depth: .55, label: "floating sparkle" },
  { type: "headphones", className: "float-eight", depth: .5, label: "floating headphones" },
  { type: "wave", className: "float-nine", depth: .34, label: "floating waveform" },
];

const Icon = ({ type }) => type === "mic" ? <Mic /> : type === "pen" ? <PenLine /> : type === "clip" ? <Paperclip /> : type === "spark" ? <Sparkles /> : type === "headphones" ? <Headphones /> : <Waves />;

export default function FloatingObjects({ focus, pressed }) {
  const layerRef = useRef(null);
  useEffect(() => {
    const move = (event) => { const x = (event.clientX / window.innerWidth - .5) * 2; const y = (event.clientY / window.innerHeight - .5) * 2; layerRef.current?.style.setProperty("--mouse-x", `${x}`); layerRef.current?.style.setProperty("--mouse-y", `${y}`); };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);
  return <div ref={layerRef} className={`floating-layer focus-${focus} ${pressed ? "is-pressed" : ""}`} aria-hidden="true">{objects.map((object, index) => <span key={`${object.type}-${index}`} className={`floating-object ${object.className} ${object.type}`} style={{ "--depth": object.depth }} aria-label={object.label}><Icon type={object.type} /></span>)}</div>;
}
