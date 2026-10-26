// ===== WhatsApp tab: pre-send checker, send log, campaigns + results, opt-outs =====
// Data lives in Supabase tables wa_campaigns / wa_sends / wa_optouts (not the docs table),
// so send history can grow to millions of rows without slowing the rest of the app.
const WA_CATS = ['4W Service', '2W Service', 'Book a Mechanic', 'App Install', 'App Retarget', 'First Order Offer', 'Festive / Seasonal', 'Other'];
const WA_STATUS = ['Planned', 'Sent', 'Results Logged', 'Cancelled'];
const WA_REASONS = ['Replied STOP', 'Blocked / Reported', 'Asked not to message', 'Wrong number', 'Not on WhatsApp', 'Other'];
const WA_SAFE = { 'New': 1, 'Gap OK': 1 };
const WA_JUNK = new Set(['', 'n/a', 'na', 'n.a', 'none', 'nil', '-', '.', 'null', '0', 'unknown', 'customer', 'name']);
(function () { const st = document.createElement('style'); st.textContent = '.waseg{overflow-x:auto;max-width:100%}.waseg button{white-space:nowrap}.wa3{grid-template-columns:2fr 1fr auto}@media(max-width:700px){.wa3{grid-template-columns:1fr 1fr}.wa3>div:first-child{grid-column:1/-1}}'; document.head.appendChild(st) })();
let W = { sub: 'check', camps: [], counts: {}, sum: null, opt: [], optN: 0, loaded: false, loading: false, raw: '', rows: null, filt: 'All', camp: '', date: '', logged: false, armed: '', lk: null, oq: '' };
try { W.sub = localStorage.getItem('wasub') || 'check' } catch (e) { }
window.W = W;

const WS = () => ({ gap: 5, cap: 4, cpm: 0, cc: 91, fb: 'Customer', ...(S.settings.find(x => x.id === 'wa') || {}) });
const waSB = () => window.SB || null;
const fmtD = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';
const nfmt = n => (n == null || n === '') ? '—' : Math.round(n).toLocaleString('en-IN');
const waPct = (a, b) => b ? (a / b * 100).toFixed(1) + '%' : '—';
const dayDiff = (a, b) => Math.round((new Date(a + 'T00:00:00') - new Date(b + 'T00:00:00')) / 864e5);

// ---------- phone / name cleaning ----------
function waPhone(v) {
  let s = String(v ?? '').trim();
  if (/e\+?\d/i.test(s)) return null; // 9.17E+11 — Excel already destroyed it
  s = s.replace(/[\s+\-().]/g, '');
  if (!/^\d{10,13}$/.test(s)) return null;
  const last = s.slice(-10), pre = s.slice(0, -10);
  if (!['', '91', '0', '091'].includes(pre)) return null;
  if (!/^[6-9]/.test(last) || /000000$/.test(last)) return null;
  return last;
}
function waName(v) {
  const t = String(v ?? '').replace(/\s+/g, ' ').trim();
  if (WA_JUNK.has(t.toLowerCase()) || /^[\d\s+\-().]+$/.test(t)) return '';
  return t.toLowerCase().replace(/(^|[\s.'-])\S/g, c => c.toUpperCase());
}
// one row = array of cells; the cell with >=10 digits is the phone, first wordy cell is the name
function waRow(cells) {
  cells = cells.map(c => String(c ?? '').trim()).filter(c => c !== '');
  if (!cells.length) return null;
  let pi = cells.findIndex(c => c.replace(/\D/g, '').length >= 10 || /e\+?\d/i.test(c));
  if (pi < 0) { if (cells.some(c => /\d{5,}/.test(c))) return { raw: cells.join(' '), phone: null, name: '' }; return null } // header / text-only line → ignore
  const raw = cells[pi], nm = cells.find((c, i) => i !== pi && /[a-z]/i.test(c)) || '';
  return { raw, phone: waPhone(raw), name: waName(nm) };
}
function waParse(text) {
  return text.split(/\r?\n/).map(l => waRow(l.split(/\t|,|;|\|/))).filter(Boolean);
}

// ---------- data ----------
async function waAll(table, order) {
  let out = [], from = 0;
  for (; ;) {
    const { data, error } = await waSB().from(table).select('*').order(order, { ascending: true }).range(from, from + 999);
    if (error) throw error; out = out.concat(data); if (data.length < 1000) break; from += 1000;
    if (out.length % 20000 === 0) msg('Downloading… ' + out.length.toLocaleString('en-IN') + ' rows');
  }
  return out;
}
async function waLoad() {
  if (!waSB() || W.loading) return; W.loading = true;
  try {
    const sb = waSB();
    const [c, n, s, o, oc] = await Promise.all([
      waAll('wa_campaigns', 'created_at'),
      sb.from('wa_campaign_counts').select('*').range(0, 9999),
      sb.rpc('wa_summary'),
      sb.from('wa_optouts').select('*').order('created_at', { ascending: false }).range(0, 199),
      sb.from('wa_optouts').select('phone', { count: 'exact', head: true })
    ]);
    for (const r of [n, s, o, oc]) if (r.error) throw r.error;
    W.camps = c.sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : (a.created_at < b.created_at ? 1 : -1));
    W.counts = {}; n.data.forEach(x => W.counts[x.campaign_id] = x);
    W.sum = s.data; W.opt = o.data; W.optN = oc.count || 0; W.loaded = true;
  } catch (e) { msg('WhatsApp data: ' + (e.message || e.code)) }
  W.loading = false; render();
}
function waEnter() { if (!W.date) W.date = today(); waLoad() }
const waSent = c => (W.counts[c.id] || {}).sent || 0;
const waCost = c => { const cpm = c.cost_per_msg ?? WS().cpm; return cpm ? waSent(c) * cpm : 0 };

// ---------- view ----------
function vWA() {
  if (!waSB()) return `<div class="top"><h1>WhatsApp</h1></div><div class="c mu">Needs the Supabase connection (works on the live site).</div>`;
  if (!W.loaded) { if (!W.loading) setTimeout(waEnter, 0); return `<div class="top"><h1>WhatsApp</h1></div><div class="c mu">Loading…</div>` }
  const subs = [['check', 'Check & Send'], ['camps', 'Campaigns'], ['over', 'Overview'], ['opt', 'Opt-outs'], ['set', 'Settings']];
  const await_ = W.camps.filter(c => c.status === 'Sent').length;
  return `<div class="top"><div><h1>WhatsApp</h1><span class="mu">${nfmt(W.sum?.total)} messages logged · ${W.camps.length} campaigns${await_ ? ` · <b style="color:var(--warn)">${await_} awaiting results</b>` : ''}</span></div>
  <div class="seg waseg">${subs.map(([k, n]) => `<button class="${W.sub === k ? 'on' : ''}" onclick="waSub('${k}')">${n}</button>`).join('')}</div></div>` +
    ({ check: waVCheck, camps: waVCamps, over: waVOver, opt: waVOpt, set: waVSet }[W.sub]());
}
function waSub(k) { W.sub = k; W.armed = ''; try { localStorage.setItem('wasub', k) } catch (e) { } render() }

function waVCheck() {
  const open = W.camps.filter(c => c.status !== 'Cancelled');
  const R = W.rows, cnt = {};
  if (R) R.forEach(r => cnt[r.st] = (cnt[r.st] || 0) + 1);
  const safe = R ? R.filter(r => WA_SAFE[r.st]) : [];
  const tiles = [['All', 'Pasted', R?.length || 0, ''], ['Safe', 'Safe to send', safe.length, 'ok'], ['Too soon', 'Too soon', cnt['Too soon'] || 0, 'warn'], ['30-day cap', '30-day cap', cnt['30-day cap'] || 0, 'warn'], ['Opted out', 'Opted out', cnt['Opted out'] || 0, 'bad'], ['Duplicate', 'Duplicates', cnt['Duplicate'] || 0, ''], ['Invalid', 'Invalid', cnt['Invalid'] || 0, '']];
  const shown = !R ? [] : R.filter(r => W.filt === 'All' || (W.filt === 'Safe' ? WA_SAFE[r.st] : r.st === W.filt));
  const camp = W.camps.find(c => c.id === W.camp);
  const lines = W.raw ? W.raw.split(/\r?\n/).filter(l => l.trim()).length : 0;
  const stc = st => WA_SAFE[st] ? 'ok' : st === 'Opted out' ? 'bad' : (st === 'Too soon' || st === '30-day cap') ? 'warn' : '';
  return `<div class="c f wa3" style="align-items:end">
    <div><label>1 · Campaign</label><select id="wa_camp" onchange="W.camp=this.value;W.logged=false;render()"><option value="">— pick a campaign —</option>${open.map(c => `<option value="${c.id}" ${c.id === W.camp ? 'selected' : ''}>${esc(c.name)} · ${fmtD(c.date)} · ${c.status}</option>`).join('')}</select></div>
    <div><label>Send date</label><input id="wa_date" type="date" value="${W.date}" onchange="W.date=this.value;if(W.rows)waCheck()"></div>
    <button class="btn g" onclick="waCampForm()">+ New campaign</button></div>
  <div class="c" style="margin-top:12px"><div class="row" style="justify-content:space-between;margin:0 0 8px"><label style="margin:0">2 · Paste numbers (one per line — phone and name in any order, straight from Excel) or upload a file</label><span class="mu" style="font-size:12px">${lines.toLocaleString('en-IN')} lines</span></div>
    <textarea id="wa_raw" rows="7" style="width:100%;padding:10px 11px;border:1px solid var(--bd);border-radius:12px;background:var(--s2);color:var(--tx);font:13px/1.5 ui-monospace,Menlo,monospace;resize:vertical" placeholder="9876543210	Ravi&#10;+91 98250 12345, Priya&#10;Amit	919825012345" oninput="W.raw=this.value">${esc(W.raw)}</textarea>
    <div class="row" style="margin-top:10px"><button class="btn" onclick="waCheck()">Check numbers</button><label class="btn g" style="margin:0;display:inline-block">Upload .xlsx / .csv<input type="file" accept=".xlsx,.xls,.csv,.txt" style="display:none" onchange="waFile(this.files[0]);this.value=''"></label>${W.raw || R ? `<button class="btn g" onclick="waClear()">Clear</button>` : ''}</div></div>
  ${R ? `<div class="row" style="margin:14px 0 8px">${tiles.map(([k, l, n, c]) => `<button class="c" onclick="W.filt='${k}';render()" style="cursor:pointer;min-width:112px;padding:10px 14px;text-align:left;font:inherit;color:inherit;${W.filt === k ? 'border-color:var(--ac);' : ''}"><small class="mu">${l}</small><b style="display:block;font-size:22px;${c ? `color:var(--${c})` : ''}">${n.toLocaleString('en-IN')}</b></button>`).join('')}</div>
  <div class="c"><div class="row" style="justify-content:space-between;margin:0">
    <div class="row" style="margin:0"><b>3 · Send</b><button class="btn" ${safe.length ? '' : 'disabled'} onclick="waUpload()">⬇ Upload file · ${safe.length.toLocaleString('en-IN')} rows</button><button class="btn g sm" onclick="waCopy()">Copy safe numbers</button></div>
    <div class="row" style="margin:0"><b>4 · After it's sent</b>${W.logged ? `<span class="chip ok">✓ Logged to ${esc(camp?.name || '')}</span>` : `<button class="btn ${W.armed ? '' : 'g'}" ${safe.length && camp ? '' : 'disabled title="Pick a campaign first"'} onclick="waLog()">${W.armed === 'log2' ? `Already logged today — add ${safe.length.toLocaleString('en-IN')} more anyway?` : W.armed === 'log' ? `Sure? Log ${safe.length.toLocaleString('en-IN')} to “${esc(camp?.name || '')}”` : '✓ Mark as sent'}</button>`}</div></div>
    <p class="mu" style="font-size:12px;margin:8px 0 0">Mark as sent only after the blast actually goes out — it records these ${safe.length.toLocaleString('en-IN')} safe numbers so the gap rule protects them next time.${camp ? '' : ' <b style="color:var(--warn)">Pick a campaign above to enable logging.</b>'}</p></div>
  <div class="c w" style="padding:4px 6px;margin-top:12px"><table><tr><th>Phone</th><th>Name</th><th>Status</th><th>Times sent</th><th>Last sent</th><th>Last campaign</th></tr>
    ${shown.slice(0, 300).map(r => `<tr><td>${esc(r.phone || r.raw)}</td><td>${esc(r.name) || '<span class="mu">—</span>'}</td><td><span class="chip ${stc(r.st)}">${r.st}${r.st === 'Too soon' ? ` (${r.days}d)` : ''}</span></td><td>${r.times ?? ''}</td><td>${r.last ? fmtD(r.last) : ''}</td><td class="mu">${esc(r.lc || '')}</td></tr>`).join('') || '<tr><td colspan="6" class="mu">Nothing here</td></tr>'}</table>
    ${shown.length > 300 ? `<p class="mu" style="font-size:12px;margin:6px 10px">Showing 300 of ${shown.length.toLocaleString('en-IN')}. The upload file has all of them.</p>` : ''}</div>` : ''}`;
}

async function waFile(f) {
  if (!f) return;
  try {
    let rows;
    if (/\.(xlsx|xls)$/i.test(f.name)) { const wb = XLSX.read(await f.arrayBuffer()); rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' }) }
    else rows = (await f.text()).split(/\r?\n/).map(l => l.split(/\t|,|;|\|/));
    W.raw = rows.map(r => r.map(c => String(c ?? '').replace(/[\t\r\n]/g, ' ')).join('\t')).filter(l => l.trim()).join('\n');
    msg('Loaded ' + f.name); await waCheck();
  } catch (e) { msg('Could not read file: ' + (e.message || e)) }
}
function waClear() { W.raw = ''; W.rows = null; W.filt = 'All'; W.logged = false; W.armed = ''; render() }

async function waCheck() {
  const ta = $('#wa_raw'); if (ta) W.raw = ta.value;
  const P = waParse(W.raw || ''); if (!P.length) return msg('Paste some numbers first');
  const date = W.date || today(), cfg = WS(), seen = new Set(), uniq = [];
  P.forEach(r => { if (!r.phone) r.st = 'Invalid'; else if (seen.has(r.phone)) r.st = 'Duplicate'; else { seen.add(r.phone); uniq.push(r.phone) } });
  const info = {};
  try {
    for (let i = 0; i < uniq.length; i += 2000) {
      if (uniq.length > 2000) msg(`Checking… ${Math.min(i + 2000, uniq.length).toLocaleString('en-IN')} / ${uniq.length.toLocaleString('en-IN')}`);
      const { data, error } = await waSB().rpc('wa_check', { p_phones: uniq.slice(i, i + 2000), p_date: date });
      if (error) throw error; data.forEach(d => info[d.phone] = d);
    }
  } catch (e) { return msg('Check failed: ' + (e.message || e.code)) }
  P.forEach(r => {
    const d = info[r.phone]; if (r.st || !d) return;
    r.times = d.times; r.last = d.last_sent; r.lc = d.last_campaign;
    if (d.opted) r.st = 'Opted out';
    else if (!d.times) r.st = 'New';
    else { r.days = dayDiff(date, d.last_sent); r.st = r.days < cfg.gap ? 'Too soon' : d.last30 >= cfg.cap ? '30-day cap' : 'Gap OK' }
  });
  W.rows = P; W.filt = 'All'; W.logged = false; W.armed = ''; msg(`Checked ${P.length.toLocaleString('en-IN')} — ${P.filter(r => WA_SAFE[r.st]).length.toLocaleString('en-IN')} safe`); render();
}
const waSafe = () => (W.rows || []).filter(r => WA_SAFE[r.st]);
function waUpload() {
  const cfg = WS(), c = W.camps.find(x => x.id === W.camp), csvq = s => /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  const data = 'Customer Name,Phone Number,Country Code\n' + waSafe().map(r => [csvq(r.name || cfg.fb), r.phone, cfg.cc].join(',')).join('\n');
  window.SpinotoRuntime.browserDownload({ filename: `upload_${slug(c?.name || 'whatsapp')}_${W.date || today()}.csv`, data });
}
async function waCopy() { try { await navigator.clipboard.writeText(waSafe().map(r => r.phone).join('\n')); msg('Copied ' + waSafe().length + ' numbers') } catch (e) { msg('Copy blocked by browser — use the upload file') } }

async function waLog() {
  const c = W.camps.find(x => x.id === W.camp), safe = waSafe(), date = W.date || today();
  if (!c) return msg('Pick the campaign first'); if (!safe.length) return;
  if (W.armed !== 'log' && W.armed !== 'log2') { W.armed = 'log'; return render() }
  const { count } = await waSB().from('wa_sends').select('id', { count: 'exact', head: true }).eq('campaign_id', c.id).eq('sent_on', date);
  if (count && W.armed === 'log') { W.armed = 'log2'; render(); return msg(`“${c.name}” already has ${count} numbers logged on ${fmtD(date)}. Tap again only if this is a second batch.`) }
  W.armed = '';
  try {
    for (let i = 0; i < safe.length; i += 1000) {
      msg(`Logging… ${Math.min(i + 1000, safe.length).toLocaleString('en-IN')} / ${safe.length.toLocaleString('en-IN')}`);
      const { error } = await waSB().from('wa_sends').insert(safe.slice(i, i + 1000).map(r => ({ campaign_id: c.id, phone: r.phone, name: r.name || null, sent_on: date })));
      if (error) throw error;
    }
    if (c.status === 'Planned') await waSB().from('wa_campaigns').update({ status: 'Sent', date }).eq('id', c.id);
    W.logged = true; log('💬', `WhatsApp: logged ${safe.length} sends for ${c.name}`); msg(`✓ Logged ${safe.length.toLocaleString('en-IN')} sends`); await waLoad();
  } catch (e) { msg('Logging stopped: ' + (e.message || e.code) + ' — some rows may be saved; check the campaign count before retrying') }
}

// ---------- campaigns ----------
function waVCamps() {
  const rows = W.camps.map(c => {
    const s = waSent(c), cost = waCost(c);
    const chipc = { Planned: 'warn', Sent: '', 'Results Logged': 'ok', Cancelled: 'bad' }[c.status];
    return `<tr style="cursor:pointer" onclick="waCampForm('${c.id}')"><td>${fmtD(c.date)}</td><td><b>${esc(c.name)}</b></td><td>${esc(c.category || '')}</td><td class="mu">${esc(c.audience || '')}</td><td><span class="chip ${chipc}">${c.status}</span></td><td>${nfmt(s)}</td><td>${nfmt(c.delivered)}</td><td>${c.delivered ? waPct(c.read || 0, c.delivered) : '—'}</td><td>${c.delivered ? waPct(c.clicks || 0, c.delivered) : '—'}</td><td>${nfmt(c.orders)}</td><td>${c.revenue ? inr(c.revenue) : '—'}</td><td>${cost && c.revenue ? (c.revenue / cost).toFixed(1) + 'x' : '—'}</td></tr>`;
  });
  return `<div class="row" style="justify-content:space-between;margin-bottom:10px"><span class="mu">Tap a campaign to edit it or fill its results (24–48 hrs after sending).</span><button class="btn" onclick="waCampForm()">+ New campaign</button></div>` +
    tbl(['Date', 'Campaign', 'Category', 'Audience', 'Status', 'Sent', 'Delivered', 'Read %', 'Click %', 'Orders', 'Revenue', 'ROAS'], rows);
}
function waCampForm(id) {
  const c = id ? W.camps.find(x => x.id === id) : { date: W.date || today(), status: 'Planned', category: '4W Service' };
  const aud = [...new Set(W.camps.map(x => x.audience).filter(Boolean))], tpl = [...new Set(W.camps.map(x => x.template).filter(Boolean))];
  const I = (k, l, t = 'text', extra = '') => `<div><label>${l}</label><input id="wc_${k}" type="${t}" value="${esc(c[k] ?? '')}" ${extra}></div>`;
  const Sx = (k, l, opts) => `<div><label>${l}</label><select id="wc_${k}">${opts.map(o => `<option ${o === c[k] ? 'selected' : ''}>${o}</option>`).join('')}</select></div>`;
  const sent = id ? waSent(c) : 0;
  closeAll(); $('#drw').innerHTML = `<div class="ov r" onclick="closeAll()"><div class="bx dr" onclick="event.stopPropagation()"><div class="row" style="justify-content:space-between"><b style="font-size:19px">${id ? 'Edit' : 'New'} campaign</b><button class="x" onclick="closeAll()" style="color:var(--mu)">✕</button></div>
  <div class="f" style="grid-template-columns:1fr 1fr;margin-top:14px">
    <div style="grid-column:1/-1"><label>Campaign name (unique)</label><input id="wc_name" value="${esc(c.name || '')}" placeholder="car_service_4.1"></div>
    ${I('date', 'Date', 'date')}${I('send_time', 'Send time', 'text', 'placeholder="9:00 PM"')}
    ${Sx('category', 'Category', WA_CATS)}${Sx('status', 'Status', WA_STATUS)}
    ${I('audience', 'Audience', 'text', 'list="wa_aud" placeholder="Go Mechanic Data"')}${I('template', 'Template', 'text', 'list="wa_tpl"')}
    <div style="grid-column:1/-1"><label>Offer / coupon</label><input id="wc_offer" value="${esc(c.offer || '')}"></div>
  </div>
  ${id ? `<h3 style="margin-top:18px">Results · sent ${nfmt(sent)}</h3><div class="f" style="grid-template-columns:1fr 1fr 1fr">${I('delivered', 'Delivered', 'number')}${I('read', 'Read', 'number')}${I('replies', 'Replies', 'number')}${I('clicks', 'Link clicks', 'number')}${I('bookings', 'Bookings / leads', 'number')}${I('orders', 'Orders', 'number')}${I('revenue', 'Revenue ₹', 'number')}${I('cost_per_msg', 'Cost / msg ₹', 'number', `step="0.01" placeholder="${WS().cpm || ''}"`)}</div>` : ''}
  <div style="margin-top:10px"><label>Notes</label><input id="wc_notes" value="${esc(c.notes || '')}"></div>
  <datalist id="wa_aud">${aud.map(a => `<option>${esc(a)}</option>`).join('')}</datalist><datalist id="wa_tpl">${tpl.map(a => `<option>${esc(a)}</option>`).join('')}</datalist>
  <div class="row" style="margin-top:18px"><button class="btn" onclick="waCampSave('${id || ''}')">Save</button>
  ${id && !sent ? `<button class="btn g" onclick="if(this.dataset.a){waCampDel('${id}')}else{this.dataset.a=1;this.textContent='Sure? Tap again'}">Delete</button>` : ''}</div>
  ${id && sent ? `<details style="margin-top:16px"><summary>Logged by mistake? Undo a log</summary><div class="row"><input id="wc_undo" type="date" value="${(W.counts[id] || {}).last_sent || ''}" style="max-width:170px"><button class="btn g sm" onclick="if(this.dataset.a){waUnlog('${id}')}else{this.dataset.a=1;this.textContent='Sure? This deletes those sends'}">Remove sends on this date</button></div></details>` : ''}
  </div></div>`;
  if (!id) $('#wc_name').focus();
}
async function waCampSave(id) {
  const g = k => { const e = $('#wc_' + k); return e ? e.value.trim() : undefined }, num = k => { const v = g(k); return v === undefined ? undefined : v === '' ? null : +v };
  const d = { name: norm(g('name')), date: g('date') || today(), send_time: g('send_time') || null, category: g('category'), status: g('status'), audience: g('audience') || null, template: g('template') || null, offer: g('offer') || null, notes: g('notes') || null };
  if (!d.name) return msg('Campaign name required');
  if (id) ['delivered', 'read', 'replies', 'clicks', 'bookings', 'orders', 'revenue', 'cost_per_msg'].forEach(k => d[k] = num(k));
  if (id && d.status === 'Sent' && d.delivered != null) d.status = 'Results Logged';
  const q = id ? waSB().from('wa_campaigns').update(d).eq('id', id).select() : waSB().from('wa_campaigns').insert(d).select();
  const { data, error } = await q;
  if (error) return msg(/duplicate|unique/i.test(error.message) ? 'A campaign with this name already exists' : 'Could not save: ' + error.message);
  if (!id && data && data[0]) { W.camp = data[0].id; log('💬', 'New WhatsApp campaign: ' + d.name) }
  closeAll(); msg('Saved ✓'); await waLoad();
}
async function waCampDel(id) { const { error } = await waSB().from('wa_campaigns').delete().eq('id', id); if (error) return msg('Could not delete: ' + error.message); if (W.camp === id) W.camp = ''; closeAll(); await waLoad() }
async function waUnlog(id) { const d = $('#wc_undo').value; if (!d) return; const { data, error } = await waSB().rpc('wa_unlog', { p_campaign: id, p_date: d }); if (error) return msg('Undo failed: ' + error.message); closeAll(); msg(`Removed ${data} sends`); await waLoad() }

// ---------- overview ----------
function waVOver() {
  const s = W.sum || {}, C = W.camps.filter(c => c.status !== 'Cancelled'), R = C.filter(c => c.delivered != null);
  const tot = k => C.reduce((a, c) => a + (+c[k] || 0), 0), cost = C.reduce((a, c) => a + waCost(c), 0), rev = tot('revenue');
  const fs = R.reduce((a, c) => a + waSent(c), 0), fd = R.reduce((a, c) => a + (+c.delivered || 0), 0);
  const fun = [['Sent', fs], ['Delivered', fd], ['Read', R.reduce((a, c) => a + (+c.read || 0), 0)], ['Replies', R.reduce((a, c) => a + (+c.replies || 0), 0)], ['Link clicks', R.reduce((a, c) => a + (+c.clicks || 0), 0)], ['Bookings / leads', R.reduce((a, c) => a + (+c.bookings || 0), 0)], ['Orders', R.reduce((a, c) => a + (+c.orders || 0), 0)]];
  const k = (l, v, sub) => `<div class="c"><small class="mu">${l}</small><b style="display:block;font-size:26px;font-weight:800;letter-spacing:-.02em">${v}</b>${sub ? `<small class="mu">${sub}</small>` : ''}</div>`;
  const mo = []; for (let i = 5; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); const m = iso(d).slice(0, 7); mo.push([m, ((s.monthly || []).find(x => x.m === m) || {}).n || 0, C.filter(c => (c.date || '').startsWith(m)).length]) }
  const mx = Math.max(1, ...mo.map(x => x[1]));
  const cat = WA_CATS.map(n => { const L = C.filter(c => c.category === n); if (!L.length) return ''; const del = L.reduce((a, c) => a + (+c.delivered || 0), 0), rd = L.reduce((a, c) => a + (+c.read || 0), 0), o = L.reduce((a, c) => a + (+c.orders || 0), 0), rv = L.reduce((a, c) => a + (+c.revenue || 0), 0), cs = L.reduce((a, c) => a + waCost(c), 0); return `<tr><td><b>${n}</b></td><td>${L.length}</td><td>${nfmt(L.reduce((a, c) => a + waSent(c), 0))}</td><td>${nfmt(del)}</td><td>${del ? waPct(rd, del) : '—'}</td><td>${nfmt(o)}</td><td>${del ? waPct(o, del) : '—'}</td><td>${rv ? inr(rv) : '—'}</td><td>${cs && rv ? (rv / cs).toFixed(1) + 'x' : '—'}</td></tr>` }).filter(Boolean);
  const lk = W.lk;
  return `<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(170px,1fr))">${k('Messages sent', nfmt(s.total), nfmt(s.unique) + ' unique numbers')}${k('Last 7 days', nfmt(s.last7))}${k('Last 30 days', nfmt(s.last30))}${k('Campaigns', C.filter(c => c.status !== 'Planned').length, C.filter(c => c.status === 'Planned').length + ' planned')}${k('Orders', nfmt(tot('orders')))}${k('Revenue', inr(rev))}${k('Spend', cost ? inr(cost) : '—', cost ? '' : 'set cost/msg in Settings')}${k('ROAS', cost && rev ? (rev / cost).toFixed(1) + 'x' : '—')}</div>
  <div class="two" style="margin-top:14px"><div class="c"><div class="ct">Funnel · campaigns with results</div>${fs ? fun.map(([l, v], i) => `<div class="row" style="justify-content:space-between;margin:0"><span>${l}</span><span><b>${nfmt(v)}</b> <small class="mu">${i > 1 ? waPct(v, fd) + ' of delivered' : i === 1 ? waPct(v, fs) + ' delivered' : ''}</small></span></div><div class="bar"><i style="width:${fs ? Math.max(1, v / fs * 100) : 0}%"></i></div>`).join('') : '<p class="mu">Fill Delivered / Read / Orders on a sent campaign to see the funnel.</p>'}</div>
  <div class="c"><div class="ct">Last 6 months · messages</div>${mo.map(([m, n, cc]) => `<div class="row" style="justify-content:space-between;margin:0"><span>${new Date(m + '-01T00:00:00').toLocaleString('en', { month: 'short', year: '2-digit' })}</span><span><b>${nfmt(n)}</b> <small class="mu">${cc} campaigns</small></span></div><div class="bar"><i style="width:${n / mx * 100}%"></i></div>`).join('')}</div></div>
  <h3>By category</h3>${tbl(['Category', 'Campaigns', 'Sent', 'Delivered', 'Read %', 'Orders', 'Order %', 'Revenue', 'ROAS'], cat)}
  <h3>Number lookup</h3><div class="c"><div class="row"><input id="wa_lk" placeholder="Any phone number" style="max-width:240px" onkeydown="if(event.key==='Enter')waLookup()"><button class="btn sm" onclick="waLookup()">Look up</button></div>
  ${lk ? (lk.err ? `<p class="mu">${lk.err}</p>` : `<p style="margin:10px 0 0"><b>${lk.phone}</b> — messaged <b>${lk.times}</b> time${lk.times === 1 ? '' : 's'}${lk.last_sent ? `, last on <b>${fmtD(lk.last_sent)}</b> (${esc(lk.last_campaign || '')})` : ''} · ${lk.opted ? '<span class="chip bad">Opted out — never message</span>' : '<span class="chip ok">Not opted out</span>'}</p>`) : ''}</div>`;
}
async function waLookup() {
  const p = waPhone(val('wa_lk')); if (!p) { W.lk = { err: 'Not a valid Indian mobile number' }; return render() }
  const { data, error } = await waSB().rpc('wa_check', { p_phones: [p], p_date: today() }); W.lk = error ? { err: error.message } : data[0]; render();
}

// ---------- opt-outs ----------
function waVOpt() {
  const q = W.oq;
  return `<div class="c"><div class="ct">Add opt-outs <span class="mu" style="text-transform:none;letter-spacing:0">${W.optN.toLocaleString('en-IN')} total — they're blocked from every future check</span></div>
  <div class="f" style="grid-template-columns:2fr 1fr auto;align-items:end"><div><label>Numbers (one per line, any format)</label><textarea id="wo_raw" rows="3" style="width:100%;padding:10px 11px;border:1px solid var(--bd);border-radius:12px;background:var(--s2);color:var(--tx);font:inherit"></textarea></div>
  <div><label>Reason</label><select id="wo_reason">${WA_REASONS.map(r => `<option>${r}</option>`).join('')}</select></div><button class="btn" onclick="waOptAdd()">Add</button></div></div>
  <div class="row" style="margin:14px 0 8px"><input id="wo_q" placeholder="Search a number" style="max-width:240px" value="${esc(q)}" onkeydown="if(event.key==='Enter')waOptFind()"><button class="btn g sm" onclick="waOptFind()">Search</button>${q ? `<button class="btn g sm" onclick="W.oq='';waLoad()">Show recent</button>` : ''}</div>
  ${tbl(['Phone', 'Reason', 'Added', ''], W.opt.map(o => `<tr><td>${o.phone}</td><td>${esc(o.reason || '')}</td><td class="mu">${fmtD((o.created_at || '').slice(0, 10))}</td><td><button class="x" onclick="waOptDel('${o.phone}')">${W.armed === 'o' + o.phone ? 'Sure?' : '✕'}</button></td></tr>`))}
  ${!q && W.optN > W.opt.length ? `<p class="mu" style="font-size:12px">Showing latest ${W.opt.length}. Search to find older ones.</p>` : ''}`;
}
async function waOptAdd() {
  const ps = [...new Set(($('#wo_raw').value || '').split(/[\n,;\t]+/).map(waPhone).filter(Boolean))];
  if (!ps.length) return msg('No valid numbers found');
  const reason = val('wo_reason');
  const { error } = await waSB().from('wa_optouts').upsert(ps.map(phone => ({ phone, reason })), { onConflict: 'phone' });
  if (error) return msg('Could not save: ' + error.message);
  msg(`✓ ${ps.length} number${ps.length > 1 ? 's' : ''} opted out`); $('#wo_raw').value = ''; await waLoad();
}
async function waOptFind() { const p = waPhone(val('wo_q')) || val('wo_q').replace(/\D/g, ''); W.oq = val('wo_q'); if (!p) return; const { data, error } = await waSB().from('wa_optouts').select('*').like('phone', '%' + p.slice(-10) + '%').limit(200); if (error) return msg(error.message); W.opt = data; render() }
async function waOptDel(p) { if (W.armed !== 'o' + p) { W.armed = 'o' + p; return render() } W.armed = ''; const { error } = await waSB().from('wa_optouts').delete().eq('phone', p); if (error) return msg(error.message); await waLoad() }

// ---------- settings + backup ----------
function waVSet() {
  const c = WS(), I = (k, l, t, help) => `<div><label>${l}</label><input id="ws_${k}" type="${t}" value="${esc(c[k])}" ${t === 'number' ? 'step="any"' : ''}><small class="mu">${help}</small></div>`;
  return `<div class="c f" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));align-items:start">
    ${I('gap', 'Minimum gap (days)', 'number', 'Same number can’t be messaged again within this many days.')}
    ${I('cap', 'Max messages per 30 days', 'number', 'Blocks a number that already got this many in 30 days.')}
    ${I('cpm', 'Cost per message ₹', 'number', 'Your BSP rate — drives spend and ROAS.')}
    ${I('cc', 'Country code', 'number', 'Filled in the upload file.')}
    ${I('fb', 'Name if blank', 'text', 'Used in the upload file for {{name}}.')}
    <button class="btn" style="align-self:center" onclick="waSetSave()">Save settings</button></div>
  <h3>Backup</h3><div class="c"><p class="mu" style="margin-top:0">Everything is stored in your Supabase database — separate from the app, so nothing is lost if the site goes down. Download a full Excel copy anytime (good habit: once a week).</p>
  <button class="btn" onclick="waBackup()">⬇ Download full backup (Excel)</button></div>`;
}
async function waSetSave() { const g = k => $('#ws_' + k).value.trim(); if (await put('settings', 'wa', { gap: +g('gap') || 0, cap: +g('cap') || 99, cpm: +g('cpm') || 0, cc: +g('cc') || 91, fb: g('fb') || 'Customer' })) msg('Settings saved ✓') }
async function waBackup() {
  try {
    msg('Preparing backup…');
    const [c, s, o] = await Promise.all([waAll('wa_campaigns', 'created_at'), waAll('wa_sends', 'id'), waAll('wa_optouts', 'created_at')]);
    const cn = {}; c.forEach(x => cn[x.id] = x.name);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(c.map(x => ({ Date: x.date, 'Send Time': x.send_time, Campaign: x.name, Category: x.category, Audience: x.audience, Template: x.template, Offer: x.offer, Status: x.status, Sent: waSent(x), Delivered: x.delivered, Read: x.read, Replies: x.replies, Clicks: x.clicks, Bookings: x.bookings, Orders: x.orders, Revenue: x.revenue, 'Cost/Msg': x.cost_per_msg, Notes: x.notes }))), 'Campaigns');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(s.map(x => ({ 'Date Sent': x.sent_on, Campaign: cn[x.campaign_id] || '', Phone: x.phone, Name: x.name || '' }))), 'Send Log');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(o.map(x => ({ Phone: x.phone, Reason: x.reason, Notes: x.notes, Added: (x.created_at || '').slice(0, 10) }))), 'Opt-Outs');
    XLSX.writeFile(wb, `whatsapp-backup-${today()}.xlsx`); msg(`Backup ready — ${s.length.toLocaleString('en-IN')} sends`);
  } catch (e) { msg('Backup failed: ' + (e.message || e.code)) }
}
