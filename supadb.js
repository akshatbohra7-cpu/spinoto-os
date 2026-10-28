// Drop-in replacement for window.claude.use('db') backed by Supabase.
// Same shape: db.collection(name).doc(id).set/update/delete, .onSnapshot(cb)
function makeSupaDB(client) {
  const listeners = {}; // collection -> [cb]
  const cache = {};     // collection -> {id: data}

  async function fetchAll(c) {
    const fresh = {};
    for (let from = 0; ; from += 1000) { // PostgREST returns at most 1000 rows per request
      const { data, error } = await client.from('docs').select('id,data').eq('collection', c).order('id').range(from, from + 999);
      if (error) throw error;
      for (const row of data) fresh[row.id] = row.data;
      if (data.length < 1000) break;
    }
    cache[c] = fresh;
    return cache[c];
  }
  // Order-independent deep compare (Postgres jsonb can reorder keys).
  const stable = v => v && typeof v === 'object'
    ? (Array.isArray(v) ? '[' + v.map(stable).join(',') + ']'
      : '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}')
    : JSON.stringify(v);
  const same = (a, b) => a !== undefined && stable(a) === stable(b);
  function fire(c) {
    const docs = Object.entries(cache[c] || {}).map(([id, data]) => ({ id, data: () => data }));
    (listeners[c] || []).forEach(cb => cb({ docs }));
  }
  // Live updates: many rows can arrive at once (e.g. the sheet sync pushes 400 orders) — redraw once, not 400 times.
  const timers = {};
  function fireSoon(c) { clearTimeout(timers[c]); timers[c] = setTimeout(() => fire(c), 250) }
  const subbed = new Set(), status = {};
  const LIVE = window.LIVE = window.LIVE || { ok: true, at: Date.now() };
  function setLive() {
    const ok = [...subbed].every(c => status[c] === 'SUBSCRIBED') && navigator.onLine !== false;
    if (ok !== LIVE.ok) { LIVE.ok = ok; if (window.render) window.render() }
  }
  // Re-download everything (after the laptop slept, wifi dropped, or the tab sat in the background).
  async function resyncAll() {
    for (const c of subbed) { try { await fetchAll(c); fire(c) } catch (e) { } }
    LIVE.at = Date.now();
  }
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hiddenAt = Date.now();
    else if (hiddenAt && Date.now() - hiddenAt > 30000) resyncAll();
  });
  window.addEventListener('online', () => { setLive(); resyncAll() });
  window.addEventListener('offline', setLive);
  setInterval(() => { if (!document.hidden) resyncAll() }, 5 * 60 * 1000); // safety net
  function ensureSub(c) {
    if (subbed.has(c)) return;
    subbed.add(c);
    client.channel('docs-' + c)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'docs', filter: `collection=eq.${c}` }, payload => {
        if (!cache[c]) cache[c] = {};
        // Skip the realtime echo of our own write: if nothing actually changed, don't re-render.
        if (payload.eventType === 'DELETE') {
          if (!(payload.old.id in cache[c])) return;
          delete cache[c][payload.old.id];
        } else {
          if (same(cache[c][payload.new.id], payload.new.data)) return;
          cache[c][payload.new.id] = payload.new.data;
        }
        LIVE.at = Date.now();
        fireSoon(c);
      }).subscribe(st => {
        const was = status[c]; status[c] = st;
        // reconnected after a drop → fetch what we missed while offline
        if (st === 'SUBSCRIBED' && was && was !== 'SUBSCRIBED') fetchAll(c).then(() => fire(c)).catch(() => { });
        setLive();
      });
  }

  return {
    resync: resyncAll,
    collection(c) {
      return {
        onSnapshot(cb, onErr) {
          (listeners[c] ||= []).push(cb);
          ensureSub(c);
          fetchAll(c).then(() => fire(c)).catch(e => onErr && onErr(e));
          return () => { listeners[c] = (listeners[c] || []).filter(x => x !== cb); };
        },
        doc(id) {
          return {
            async set(v) {
              const { error } = await client.from('docs').upsert({ collection: c, id, data: v, updated_at: new Date().toISOString() });
              if (error) throw error;
              if (!cache[c]) cache[c] = {}; cache[c][id] = v; fire(c);
            },
            async update(v) {
              const cur = (cache[c] && cache[c][id]) || {};
              const merged = { ...cur, ...v };
              const { error } = await client.from('docs').upsert({ collection: c, id, data: merged, updated_at: new Date().toISOString() });
              if (error) throw error;
              if (!cache[c]) cache[c] = {}; cache[c][id] = merged; fire(c);
            },
            async delete() {
              const { error } = await client.from('docs').delete().eq('collection', c).eq('id', id);
              if (error) throw error;
              if (cache[c]) delete cache[c][id]; fire(c);
            }
          };
        }
      };
    }
  };
}

// Plain-browser download, no Claude capability needed.
function browserDownload({ filename, data }) {
  const blob = new Blob([data], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  return { ok: true };
}

window.SpinotoRuntime = { makeSupaDB, browserDownload };
