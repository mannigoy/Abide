import { useEffect, useState } from 'react';

import {
  groupTypeLabels,
  listGroups,
  listPeople,
  removeMember,
  setGroupOverseer,
  type AdminGroup,
  type Person,
} from '../lib/admin';

export function GroupsPage() {
  const [groups, setGroups] = useState<AdminGroup[] | null>(null);
  const [overseers, setOverseers] = useState<Person[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [groupList, people] = await Promise.all([listGroups(), listPeople()]);
      setGroups(groupList);
      setOverseers(people.filter((p) => p.role === 'overseer' || p.role === 'admin'));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!groups) return <p className="muted">{error ?? 'Loading…'}</p>;

  return (
    <section className="stack">
      <div className="page-header">
        <h1>Groups</h1>
      </div>
      <p className="muted">
        {groups.length} groups. Overseers create groups in the phone app; here you can move a group to another
        overseer or remove members.
      </p>
      {error && <p className="error">{error}</p>}

      <div className="cards">
        {groups.map((group) => (
          <article key={group.id} className="card">
            <h2>{group.name}</h2>
            <p className="muted">
              {groupTypeLabels[group.type]} · code <code>{group.join_code}</code>
            </p>

            <label>
              Overseer
              <select
                value={group.overseer_id}
                disabled={busy}
                onChange={(e) => run(() => setGroupOverseer(group.id, e.target.value))}>
                {overseers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.full_name}
                  </option>
                ))}
              </select>
            </label>

            <h3>
              {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
            </h3>
            <ul className="members">
              {group.members.map((member) => (
                <li key={member.id}>
                  <span>{member.full_name}</span>
                  <button
                    className="link danger"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm(`Remove ${member.full_name} from ${group.name}?`)) {
                        run(() => removeMember(group.id, member.id));
                      }
                    }}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
