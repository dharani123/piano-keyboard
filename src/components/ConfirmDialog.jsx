import { useEffect, useRef } from 'react';

// An in-page yes/no dialog (not window.confirm). Esc or Cancel calls onCancel.
// Keys typed while it is open don't reach the piano.
export default function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onCancel }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    const stop = e => {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
    };
    dialog.addEventListener('keydown', stop);
    return () => { dialog.removeEventListener('keydown', stop); if (dialog.open) dialog.close(); };
  }, []);
  return (
    <dialog ref={ref} className="confirm-dialog" onClick={e => { if (e.target === ref.current) onCancel(); }}>
      <h3>{title}</h3>
      <p>{message}</p>
      <div className="confirm-actions">
        <button autoFocus onClick={onCancel}>Cancel</button>
        <button className="danger" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </dialog>
  );
}
