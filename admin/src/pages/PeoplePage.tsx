import { useEffect, useState } from 'react';

import { listPeople, modeLabels, roleLabels, updatePerson, type Mode, type Person, type Role } from '../lib/admin';

export function PeoplePage({ currentUserId }: { currentUserId: string }) {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    try {
      setPeople(await listPeople());
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(person: Person, changes: Partial<Pick<Person, 'role' | 'mode' | 'overseer_id'>>) {
    const updated = { ...person, ...changes };
    setSavingId(person.id);
    setError(null);
    try {
      await updatePerson(updated);
      setPeople((current) => current?.map((p) => (p.id === person.id ? updated : p)) ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  if (!people) return <p className="muted">{error ?? 'Loading…'}</p>;

  const overseers = people.filter((p) => p.role === 'overseer' || p.role === 'admin');
  const query = search.trim().toLowerCase();
  const shown = people.filter(
    (p) => !query || p.full_name.toLowerCase().includes(query) || p.email.toLowerCase().includes(query),
  );

  return (
    <section className="stack">
      <div className="page-header">
        <h1>People & roles</h1>
        <input
          type="search"
          placeholder="Search name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <p className="muted">
        {people.length} people. Changes save straight away. Mode is Guided (step-by-step RRR) or Simple (one tap).
      </p>
      {error && <p className="error">{error}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Mode</th>
              <th>Main overseer</th>
              <th>Last check-in</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((person) => (
              <tr key={person.id} className={savingId === person.id ? 'saving' : undefined}>
                <td>
                  {person.full_name}
                  {person.id === currentUserId && <span className="muted"> (you)</span>}
                </td>
                <td className="muted">{person.email}</td>
                <td>
                  <select
                    value={person.role}
                    disabled={savingId === person.id}
                    onChange={(e) => save(person, { role: e.target.value as Role })}>
                    {(Object.keys(roleLabels) as Role[]).map((role) => (
                      <option key={role} value={role}>
                        {roleLabels[role]}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    value={person.mode}
                    disabled={savingId === person.id}
                    onChange={(e) => save(person, { mode: e.target.value as Mode })}>
                    {(Object.keys(modeLabels) as Mode[]).map((mode) => (
                      <option key={mode} value={mode}>
                        {modeLabels[mode]}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    value={person.overseer_id ?? ''}
                    disabled={savingId === person.id}
                    onChange={(e) => save(person, { overseer_id: e.target.value || null })}>
                    <option value="">— None —</option>
                    {overseers
                      .filter((o) => o.id !== person.id)
                      .map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.full_name}
                        </option>
                      ))}
                  </select>
                </td>
                <td className="muted">{person.last_checkin ?? 'Never'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
