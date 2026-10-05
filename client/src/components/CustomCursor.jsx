import { useEffect, useRef, useState } from "react";

export default function CustomCursor() {
  const [visible, setVisible] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const target = useRef({ x: 0, y: 0 });
  const ring = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const move = (event) => { target.current = { x: event.clientX, y: event.clientY }; setVisible(true); setInteractive(Boolean(event.target.closest("button, a, input, [data-cursor='interactive']"))); };
    const click = (event) => { const ripple = document.createElement("span"); ripple.className = "cursor-ripple"; ripple.style.left = `${event.clientX}px`; ripple.style.top = `${event.clientY}px`; document.body.appendChild(ripple); window.setTimeout(() => ripple.remove(), 500); };
    window.addEventListener("mousemove", move); window.addEventListener("click", click);
    let frame;
    const animate = () => { ring.current.x += (target.current.x - ring.current.x) * .16; ring.current.y += (target.current.y - ring.current.y) * .16; if (dotRef.current) dotRef.current.style.transform = `translate3d(${target.current.x}px, ${target.current.y}px, 0)`; if (ringRef.current) ringRef.current.style.transform = `translate3d(${ring.current.x}px, ${ring.current.y}px, 0)`; frame = requestAnimationFrame(animate); };
    frame = requestAnimationFrame(animate);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("click", click); cancelAnimationFrame(frame); };
  }, []);

  return <><span ref={dotRef} className={`cursor-dot ${visible ? "is-visible" : ""}`} /><span ref={ringRef} className={`cursor-ring ${visible ? "is-visible" : ""} ${interactive ? "is-interactive" : ""}`} /></>;
}
