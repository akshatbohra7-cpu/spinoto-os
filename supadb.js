// Drop-in replacement for window.claude.use('db') backed by Supabase.
// Same shape: db.collection(name).doc(id).set/update/delete, .onSnapshot(cb)
function makeSupaDB(client) {
  const listeners = {}; // collection -> [cb]
  const cache = {};     // collection -> {id: data}

  async function fetchAll(c) {
    const { data, error } = await client.from('docs').select('id,data').eq('collection', c);
    if (error) throw error;
    cache[c] = {};
    for (const row of data) cache[c][row.id] = row.data;
    return cache[c];
  }
  function fire(c) {
    const docs = Object.entries(cache[c] || {}).map(([id, data]) => ({ id, data: () => data }));
    (listeners[c] || []).forEach(cb => cb({ docs }));
  }
  function ensureSub(c) {
    if (ensureSub._subbed?.has(c)) return;
    (ensureSub._subbed ||= new Set()).add(c);
    client.channel('docs-' + c)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'docs', filter: `collection=eq.${c}` }, payload => {
        if (!cache[c]) cache[c] = {};
        if (payload.eventType === 'DELETE') delete cache[c][payload.old.id];
        else cache[c][payload.new.id] = payload.new.data;
        fire(c);
      }).subscribe();
  }

  return {
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
