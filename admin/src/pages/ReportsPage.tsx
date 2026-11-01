import { useEffect, useState } from 'react';

import { getMonthlyReport, roleLabels, type MonthlyReportRow } from '../lib/admin';
import { manilaDate } from '../lib/dates';

function daysInMonth(month: string): number {
  const [year, m] = month.split('-').map(Number);
  return new Date(Date.UTC(year, m, 0)).getUTCDate();
}

/** Quotes a value for CSV so commas and quotes in names don't break columns. */
function csvCell(value: string | number | null): string {
  const text = value === null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function ReportsPage() {
  const [month, setMonth] = useState(manilaDate().slice(0, 7)); // 'YYYY-MM'
  const [rows, setRows] = useState<MonthlyReportRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    getMonthlyReport(month)
      .then((result) => {
        if (!ignore) setRows(result);
      })
      .catch((e: Error) => {
        if (!ignore) setError(e.message);
      });
    return () => {
      ignore = true;
    };
  }, [month]);

  // For the current month, only count the days that have happened so far.
  const today = manilaDate();
  const totalDays = month === today.slice(0, 7) ? Number(today.slice(8, 10)) : daysInMonth(month);

  function downloadCsv() {
    if (!rows) return;
    const header = ['Name', 'Email', 'Role', 'Groups', `Days read (of ${totalDays})`, 'Current streak'];
    const lines = rows.map((r) =>
      [r.full_name, r.email, roleLabels[r.role], r.groups, r.days_read, r.current_streak].map(csvCell).join(','),
    );
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `abide-report-${month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const readers = rows?.filter((r) => r.days_read > 0).length ?? 0;
  const average = rows && rows.length > 0 ? rows.reduce((sum, r) => sum + r.days_read, 0) / rows.length : 0;

  return (
    <section className="stack">
      <div className="page-header">
        <h1>Monthly report</h1>
        <div className="row">
          <input type="month" value={month} max={today.slice(0, 7)} onChange={(e) => setMonth(e.target.value)} />
          <button className="secondary" onClick={downloadCsv} disabled={!rows}>
            Download CSV
          </button>
        </div>
      </div>
      <p className="muted">
        A simple summary for pastors. It celebrates faithfulness. Please use it to encourage, not to compare.
      </p>
      {error && <p className="error">{error}</p>}
      {!rows && !error && <p className="muted">Loading…</p>}

      {rows && (
        <>
          <div className="stats">
            <div className="card">
              <span className="muted">People</span>
              <strong>{rows.length}</strong>
            </div>
            <div className="card">
              <span className="muted">Read at least once</span>
              <strong>{readers}</strong>
            </div>
            <div className="card">
              <span className="muted">Average days read</span>
              <strong>
                {average.toFixed(1)} <span className="muted">of {totalDays}</span>
              </strong>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Groups</th>
                  <th>Days read</th>
                  <th>Current streak</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.user_id}>
                    <td>{r.full_name}</td>
                    <td className="muted">{roleLabels[r.role]}</td>
                    <td className="muted">{r.groups ?? '—'}</td>
                    <td>
                      {r.days_read} <span className="muted">/ {totalDays}</span>
                    </td>
                    <td>{r.current_streak > 0 ? `🔥 ${r.current_streak}` : '—'}</td>
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
