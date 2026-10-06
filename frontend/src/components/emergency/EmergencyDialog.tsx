import { useEffect, useId, useRef, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { createPortal } from "react-dom";
import "./EmergencyDialog.css";

interface EmergencyDialogProps {
  open: boolean;
  eyebrow?: string;
  title: string;
  description: ReactNode;
  note?: ReactNode;
  confirmLabel: string;
  busyLabel: string;
  busy?: boolean;
  tone?: "emergency" | "clinical";
  children?: ReactNode;
  onClose: () => void;
  onConfirm: () => void;
}

export function EmergencyDialog({ open, eyebrow, title, description, note, confirmLabel, busyLabel, busy=false, tone="emergency", children, onClose, onConfirm }: EmergencyDialogProps) {
  const titleId=useId(), descriptionId=useId();
  const cancelRef=useRef<HTMLButtonElement>(null);
  const restoreFocus=useRef<HTMLElement|null>(null);
  const closeRef=useRef(onClose);closeRef.current=onClose;
  useEffect(()=>{
    if(!open)return;
    restoreFocus.current=document.activeElement as HTMLElement;
    const frame=requestAnimationFrame(()=>cancelRef.current?.focus());
    const keydown=(event:KeyboardEvent)=>{if(event.key==="Escape"&&!busy)closeRef.current();};
    document.addEventListener("keydown",keydown);document.body.classList.add("has-emergency-dialog");
    return()=>{cancelAnimationFrame(frame);document.removeEventListener("keydown",keydown);document.body.classList.remove("has-emergency-dialog");restoreFocus.current?.focus();};
  },[open,busy]);
  if(!open)return null;
  const Icon=tone==="clinical"?CheckCircle2:AlertTriangle;
  return createPortal(<div className="emergency-dialog__backdrop" onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)onClose();}}>
    <section className={`emergency-dialog is-${tone}`} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
      <button className="emergency-dialog__close" type="button" aria-label="Close dialog" disabled={busy} onClick={onClose}><X/></button>
      <div className="emergency-dialog__heading"><span><Icon/></span><div>{eyebrow&&<p>{eyebrow}</p>}<h2 id={titleId}>{title}</h2></div></div>
      <div id={descriptionId} className="emergency-dialog__description">{description}</div>
      {note&&<div className="emergency-dialog__note"><AlertTriangle/>{note}</div>}
      {children}
      <div className="emergency-dialog__actions"><button ref={cancelRef} type="button" className="is-secondary" disabled={busy} onClick={onClose}>Cancel</button><button type="button" className="is-primary" disabled={busy} onClick={onConfirm}>{busy?<span className="emergency-dialog__spinner" aria-hidden="true"/>:<Icon/>}{busy?busyLabel:confirmLabel}</button></div>
    </section>
  </div>,document.body);
}
