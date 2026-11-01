import { useEffect, useState } from 'react';

import { listFeedback, setFeedbackResolved, type Feedback } from '../lib/admin';

export function FeedbackPage() {
  const [items, setItems] = useState<Feedback[] | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setItems(await listFeedback());
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(item: Feedback) {
    setError(null);
    try {
      await setFeedbackResolved(item.id, item.resolved_at === null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!items) return <p className="muted">{error ?? 'Loading…'}</p>;

  const open = items.filter((i) => i.resolved_at === null);
  const shown = showResolved ? items : open;

  return (
    <section className="stack">
      <div className="page-header">
        <h1>Feedback</h1>
        <label className="checkbox">
          <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
          Show resolved
        </label>
      </div>
      <p className="muted">
        {open.length} open · {items.length - open.length} resolved. Sent from “Report a problem” in the app’s Profile tab.
      </p>
      {error && <p className="error">{error}</p>}

      {shown.length === 0 && <p className="muted">Nothing to see here. 🎉</p>}

      <div className="stack">
        {shown.map((item) => (
          <article key={item.id} className={`card${item.resolved_at ? ' resolved' : ''}`}>
            <p className="muted">
              <strong>{item.full_name}</strong> · {item.email} · {new Date(item.created_at).toLocaleString()}
            </p>
            <p className="message">{item.message}</p>
            <div>
              <button className={item.resolved_at ? 'secondary small' : 'small'} onClick={() => toggle(item)}>
                {item.resolved_at ? 'Reopen' : 'Mark resolved'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
