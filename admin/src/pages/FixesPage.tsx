import { useEffect, useState } from 'react';

import {
  addAdjustment,
  deleteCheckin,
  getAdjustments,
  getHistory,
  getStreak,
  listPeople,
  removeAdjustment,
  type Adjustment,
  type HistoryDay,
  type Person,
} from '../lib/admin';
import { formatDay, manilaDate } from '../lib/dates';

const DAYS = 30;

type DayDetail = {
  date: string;
  checkin: HistoryDay | undefined;
  adjustment: Adjustment | undefined;
};

export function FixesPage({ currentUserId }: { currentUserId: string }) {
  const [people, setPeople] = useState<Person[]>([]);
  const [personId, setPersonId] = useState('');
  const [history, setHistory] = useState<HistoryDay[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [streak, setStreak] = useState<number | null>(null);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listPeople()
      .then(setPeople)
      .catch((e: Error) => setError(e.message));
  }, []);

  async function loadPerson(id: string) {
    if (!id) return;
    const [historyResult, adjustmentResult, streakResult] = await Promise.all([
      getHistory(id, DAYS),
      getAdjustments(id),
      getStreak(id),
    ]);
    setHistory(historyResult);
    setAdjustments(adjustmentResult);
    setStreak(streakResult);
  }

  function choosePerson(id: string) {
    setPersonId(id);
    setEditingDate(null);
    setError(null);
    setStreak(null);
    loadPerson(id).catch((e: Error) => setError(e.message));
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await loadPerson(personId);
      setEditingDate(null);
      setReason('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const person = people.find((p) => p.id === personId);
  const days: DayDetail[] = Array.from({ length: DAYS }, (_, i) => {
    const date = manilaDate(-i);
    return {
      date,
      checkin: history.find((h) => h.reading_date === date && !h.is_adjustment),
      adjustment: adjustments.find((a) => a.reading_date === date),
    };
  });

  return (
    <section className="stack">
      <div className="page-header">
        <h1>Check-in fixes</h1>
      </div>
      <p className="muted">
        If someone read but couldn’t check in (a dead phone battery, an app problem), add an adjustment for that
        day. It counts towards their streak. Check-in text is private and never shown here.
      </p>

      <label>
        Person
        <select value={personId} onChange={(e) => choosePerson(e.target.value)}>
          <option value="">Choose someone…</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name} ({p.email})
            </option>
          ))}
        </select>
      </label>

      {error && <p className="error">{error}</p>}

      {person && (
        <>
          <p>
            <strong>{person.full_name}</strong>
            {streak !== null && <span className="muted"> · current streak: {streak} days</span>}
          </p>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {days.map(({ date, checkin, adjustment }) => (
                  <tr key={date}>
                    <td>{formatDay(date)}</td>
                    <td>
                      {checkin && <span className="status read">✓ Checked in{checkin.passage ? ` · ${checkin.passage}` : ''}</span>}
                      {!checkin && adjustment && (
                        <span className="status adjusted">✓ Adjusted · {adjustment.reason}</span>
                      )}
                      {!checkin && !adjustment && editingDate !== date && <span className="muted">Not read</span>}
                      {editingDate === date && (
                        <form
                          className="inline-form"
                          onSubmit={(e) => {
                            e.preventDefault();
                            run(() => addAdjustment(personId, currentUserId, date, reason));
                          }}>
                          <input
                            autoFocus
                            required
                            maxLength={300}
                            placeholder="Reason, e.g. phone battery died"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                          />
                          <button type="submit" className="small" disabled={busy}>
                            Save
                          </button>
                          <button type="button" className="secondary small" onClick={() => setEditingDate(null)}>
                            Cancel
                          </button>
                        </form>
                      )}
                    </td>
                    <td className="actions">
                      {checkin && (
                        <button
                          className="link danger"
                          disabled={busy}
                          onClick={() => {
                            if (window.confirm(`Delete ${person.full_name}’s check-in on ${formatDay(date)}? This can’t be undone.`)) {
                              run(() => deleteCheckin(personId, date));
                            }
                          }}>
                          Delete check-in
                        </button>
                      )}
                      {!checkin && adjustment && (
                        <button className="link danger" disabled={busy} onClick={() => run(() => removeAdjustment(adjustment.id))}>
                          Remove adjustment
                        </button>
                      )}
                      {!checkin && !adjustment && editingDate !== date && (
                        <button
                          className="link"
                          disabled={busy}
                          onClick={() => {
                            setEditingDate(date);
                            setReason('');
                          }}>
                          Add adjustment
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
