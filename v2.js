// ===== Spinoto OS v2: grouped nav, Today, Areas, Analytics (+ Unit economics) =====
const V2I = {
  home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z', analytics: 'M3 3v18h18M7 15l4-4 3 3 5-6', ads: 'M4 20V11M10 20V4M16 20v-7M22 20H2',
  wa: 'M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3 21l1.9-5.4A8.5 8.5 0 1 1 21 11.5z', content: 'M3 5h18v14H3zM10 9l5 3-5 3z', creatives: 'M3 4h18v16H3zM3 16l5-5 4 4 3-3 6 6',
  orders: 'M6 8h12l-1 13H7L6 8zM9 8V6a3 3 0 0 1 6 0v2', areas: 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  money: 'M3 7h18v12H3zM16 13h2M3 7l3-4h12l3 4', lab: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3', growth: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  team: 'M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 20v-1a4 4 0 0 0-3-3.9', data: 'M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1',
  phone: 'M7 2h10v20H7zM11 18h2', user: 'M20 21v-1a5 5 0 0 0-5-5H9a5 5 0 0 0-5 5v1M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', cac: 'M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  repeat: 'M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3', car: 'M5 17h14M6 17l1.5-5h9L18 17M7 17v2M17 17v2', wrench: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2'
};
const v2ico = (k, s = 17) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${V2I[k] || V2I.home}"/></svg>`;
const NAVG = [['', [['home', 'Today'], ['analytics', 'Analytics']]], ['Channels', [['ads', 'Ads'], ['wa', 'WhatsApp'], ['content', 'Content'], ['creatives', 'Creatives']]], ['Business', [['orders', 'Orders'], ['areas', 'Areas'], ['money', 'Wallet & spend'], ['lab', 'Experiments'], ['growth', 'App growth']]], ['Admin', [['team', 'People & access'], ['data', 'Settings']]]];
function navHTML() {
  const ok = k => k === 'team' ? isSuper() : canTab(k) !== 'none';
  return `<div class="brand"><i>S</i><b>spinoto<span>.os</span></b></div><button class="jump" onclick="openPal()"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><span>Jump to…</span><kbd>⌘K</kbd></button>` +
    NAVG.map(([g, it]) => { const L = it.filter(([k]) => ok(k)); return L.length ? `<div class="grp">${g ? `<div class="gl">${g}</div>` : ''}${L.map(([k, n]) => `<button class="n ${k === tab ? 'on' : ''}" onclick="go('${k}')">${v2ico(k)}<span>${n}</span></button>`).join('')}</div>` : '' }).join('') +
    (ME ? `<button class="me" onclick="meMenu()"><span class="ini">${esc((ME.name || ME.email).slice(0, 2).toUpperCase())}</span><span><b style="font-size:13px;font-weight:600">${esc((ME.name || ME.email).split(' ')[0])}</b><small>${esc(roleLabel(ME.role))}</small></span></button>` : '');
}

// ---------- shared helpers ----------
const v2n = s => norm(String(s || '').replace(/\n/g, ' '));
const vehOf = r => { const v = String(r.vehicle || ''); return /4|car|four/i.test(v) ? '4W' : /2|bike|scoot|two|moto/i.test(v) ? '2W' : 'Other' };
const areaOf = r => { const a = v2n(r.area); return a ? a.toLowerCase().replace(/(^|[\s(/-])\S/g, c => c.toUpperCase()) : '—' };
const amtOf = r => { const n = parseFloat(String(r.amount ?? '').replace(/[^\d.]/g, '')); return isFinite(n) ? n : 0 };
const ECD = () => ({ inc: { ads: true, wa: true, pr: true, other: false }, comm: '', target: '', ...(S.settings.find(x => x.id === 'econ') || {}) });
function perLabel(R) {
  const m = new Date(R.b + 'T00:00:00').toLocaleString('en', { month: 'long' });
  return { td: 'Today', yd: 'Yesterday', '7d': 'Last 7 days', '30d': 'Last 30 days', mtd: m + ', so far', lm: m, '90d': 'Last 90 days', all: 'All time' }[EX.per] || fd(R.a) + ' – ' + fd(R.b);
}
function v2delta(c, p, good) { // good: 1 higher is better, 0 lower is better, 2 neutral
  if (p === null || p === undefined || !isFinite(p) || p === 0) return ['', 'ne'];
  const x = (c - p) / Math.abs(p) * 100; if (Math.abs(x) < 1) return ['● flat', 'ne'];
  return [(x > 0 ? '▲ ' : '▼ ') + Math.abs(x).toFixed(0) + '%', good === 2 ? 'ne' : (good ? x > 0 : x < 0) ? 'up' : 'dn'];
}
function spendIn(a, b, M) {
  const E = ECD(), ads = sum(M.rows.filter(x => x.date >= a && x.date <= b), x => x.dSpend) * (1 + GST);
  const wa = (window.W && W.loaded) ? W.camps.filter(c => c.date >= a && c.date <= b && c.status !== 'Cancelled').reduce((s, c) => s + waCost(c), 0) : 0;
  const ex = S.expenses.filter(x => x.date && String(x.date).slice(0, 10) >= a && String(x.date).slice(0, 10) <= b);
  const pr = sum(ex.filter(x => x.type === 'PR'), x => +x.amount || 0), other = sum(ex.filter(x => x.type !== 'PR'), x => +x.amount || 0);
  const parts = { ads, wa, pr, other }, total = Object.keys(parts).reduce((s, k) => s + (E.inc[k] ? parts[k] : 0), 0);
  return { ...parts, total };
}
function ordersAll() { const d = ordDS(); return d.rows }
function v2bars(B, rows, W = 640, H = 170) {
  const g = B.map(b => { const r = inR(rows, b.a, b.b); return { b, t: r.filter(x => vehOf(x) === '2W').length, f: r.filter(x => vehOf(x) === '4W').length, o: r.filter(x => vehOf(x) === 'Other').length } });
  const mx = Math.max(1, ...g.map(x => x.t + x.f + x.o)), bw = W / Math.max(1, g.length), sc = (H - 14) / mx, gap = Math.min(6, bw * .25);
  const bars = g.map((x, i) => { const X = (i * bw + gap / 2).toFixed(1), w = Math.max(1, bw - gap).toFixed(1); let y = H; const seg = (n, cl) => { if (!n) return ''; const h = n * sc; y -= h; return `<rect x="${X}" y="${y.toFixed(1)}" width="${w}" height="${(h - .8).toFixed(1)}" rx="2" fill="${cl}"/>` };
    return `<g class="tb" onclick="exDay('${x.b.a}','${x.b.b}')"><title>${x.b.l}: ${x.t + x.f + x.o} orders (2W ${x.t}, 4W ${x.f}${x.o ? ', other ' + x.o : ''})</title><rect x="${i * bw}" y="0" width="${bw}" height="${H}" fill="transparent"/>${seg(x.t, 'var(--ink)')}${seg(x.f, 'var(--ac)')}${seg(x.o, 'var(--bd)')}</g>` }).join('');
  const tk = g.length < 2 ? [0] : [0, Math.floor((g.length - 1) / 2), g.length - 1];
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="width:100%;height:170px;display:block" role="img" aria-label="Orders over time split into 2-wheeler and 4-wheeler"><line x1="0" x2="${W}" y1="${H - .5}" y2="${H - .5}" stroke="var(--bd)"/>${bars}</svg><div class="tk2">${tk.map(i => `<span>${g[i] ? g[i].b.l : ''}</span>`).join('')}</div>`;
}
const topN = (rows, f, n) => { const c = {}; rows.forEach(r => { const k = f(r); if (k && k !== '—') c[k] = (c[k] || 0) + 1 }); return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, n) };

// ---------- ORDER STATUS ----------
const STS = [['CONFIRMED', 'Confirmed', 'var(--in)'], ['ASSIGNED', 'Assigned', 'var(--warn)'], ['COMPLETED', 'Completed', 'var(--ok)'], ['CANCELLED', 'Cancelled', 'var(--bad)'], ['FAILED', 'Failed', 'var(--mu)']];
const stOf = x => { const t = String(x.status || '').toUpperCase(); return !t ? '' : /CANCEL/.test(t) ? 'CANCELLED' : /FAIL/.test(t) ? 'FAILED' : /COMPLET|DONE|DELIVER/.test(t) ? 'COMPLETED' : /ASSIGN|PROGRESS|STARTED|ON.?THE.?WAY|ARRIV/.test(t) ? 'ASSIGNED' : /CONFIRM|PLACED|NEW|PENDING|BOOKED/.test(t) ? 'CONFIRMED' : t };
const stLabel = x => { const k = stOf(x), f = STS.find(s => s[0] === k); return f ? f[1] : String(x.status || '').toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase()) }; window.stLabel = stLabel;
function statusPanel(a, b) {
  const all = S.orders.filter(x => x.date && String(x.date).slice(0, 10) >= a && String(x.date).slice(0, 10) <= b && x.status);
  if (!all.length) return `<div class="empty">Order status arrives with the Google Sheet sync.</div>`;
  const c = {}; all.forEach(x => { const k = stOf(x); c[k] = (c[k] || 0) + 1 });
  const known = STS.map(([k, l, col]) => ({ k, l, col, n: c[k] || 0 })), other = all.length - known.reduce((s, x) => s + x.n, 0);
  const open = (c.CONFIRMED || 0) + (c.ASSIGNED || 0), lost = (c.CANCELLED || 0) + (c.FAILED || 0), done = c.COMPLETED || 0, closed = done + lost;
  return `<div class="sbar" style="height:12px;margin:2px 0 12px">${known.filter(x => x.n).map(x => `<span title="${x.l}: ${x.n}" style="width:${(x.n / all.length * 100).toFixed(1)}%;background:${x.col}"></span>`).join('')}</div>
  ${known.map(x => `<div class="lr" style="grid-template-columns:12px minmax(0,1fr) 48px 44px;min-height:34px"><span style="width:10px;height:10px;border-radius:3px;background:${x.col}"></span><span>${x.l}</span><b class="mono" style="text-align:right">${x.n}</b><span class="mono mu" style="text-align:right;font-size:12px">${Math.round(x.n / all.length * 100)}%</span></div>`).join('')}${other > 0 ? `<div class="mu" style="font-size:12px;margin-top:6px">Other: ${Object.entries(all.filter(x => !STS.some(s => s[0] === stOf(x))).reduce((m, x) => { const l = stLabel(x); m[l] = (m[l] || 0) + 1; return m }, {})).map(([l, n]) => esc(l) + ' ' + n).join(' · ')}</div>` : ''}
  <div class="mu" style="font-size:12px;margin-top:10px;padding-top:10px;border-top:1px dashed var(--bd)">${open ? `<b style="color:var(--tx)">${open}</b> still open · ` : ''}${closed ? `<b style="color:${lost / closed > .15 ? 'var(--bad)' : 'var(--tx)'}">${Math.round(lost / closed * 100)}%</b> of closed orders cancelled or failed` : 'None closed yet'}</div>`;
}

// ---------- TODAY ----------
function vHome2() {
  const M = model(); SM = M; const O = ordersAll(), R = exRange(O.length ? O : M.rows), t = today();
  if (window.W && !W.loaded && !W.loading && canTab('wa') !== 'none' && window.waLoad) setTimeout(waLoad, 0);
  const cur = inR(O, R.a, R.b), prev = R.all ? null : inR(O, R.pa, R.pb);
  const ads = (a, b) => M.rows.filter(x => x.date >= a && x.date <= b), inst = r => sum(r.filter(x => x.cat === 'Install'), x => x.dRes), instSp = r => sum(r.filter(x => x.cat === 'Install'), x => x.dSpend);
  const aC = ads(R.a, R.b), aP = R.all ? null : ads(R.pa, R.pb);
  const sC = spendIn(R.a, R.b, M), sP = R.all ? null : spendIn(R.pa, R.pb, M);
  const nw = r => r.filter(x => x._n === 1).length, rp = r => r.filter(x => x._n > 1).length, vo = r => r.filter(x => x._ok).length;
  const E = ECD(), cacC = nw(cur) ? sC.total / nw(cur) : 0, cacP = prev && nw(prev) ? sP.total / nw(prev) : null;
  const iC = inst(aC), iP = aP ? inst(aP) : null;
  const card = (tb, icon, label, value, d, note, dark) => `<button class="kp2 ${dark ? 'dark' : ''}" onclick="go('${tb}')"><span class="kh"><span class="ki">${v2ico(icon, 16)}</span>${label}</span><b>${value}</b><span class="kd ${d[1]}">${d[0] || '&nbsp;'}</span><span class="kn">${note}</span></button>`;
  const incl = ['ads', 'wa', 'pr', 'other'].filter(k => E.inc[k]).map(k => ({ ads: 'ads incl. GST', wa: 'WhatsApp', pr: 'PR', other: 'other costs' })[k]).join(', ');
  const cacD = cacP ? [(cacC <= cacP ? '▼ ' : '▲ ') + inr(Math.abs(cacC - cacP)), cacC <= cacP ? 'up' : 'dn'] : ['', 'ne'];
  const kpis = [
    card('money', 'money', 'Marketing spend', inr(sC.total), v2delta(sC.total, sP && sP.total, 2), incl ? 'Includes ' + incl : 'Nothing included — set in Analytics › Unit economics'),
    card('ads', 'phone', 'App installs', fmtN(iC), v2delta(iC, iP, 1), iC ? c1(instSp(aC) / iC) + ' per install' : 'From install adsets'),
    card('orders', 'orders', 'Orders placed', fmtN(cur.length), v2delta(cur.length, prev && prev.length, 1), cur.length ? `${fmtN(vo(cur))} valid · ${fmtN(cur.length - vo(cur))} cancelled / failed` : 'No orders in this period'),
    card('analytics', 'user', 'New customers', fmtN(nw(cur)), v2delta(nw(cur), prev && nw(prev), 1), vo(cur) ? Math.round(nw(cur) / vo(cur) * 100) + '% of valid orders are first-timers' : 'First-ever valid order by phone'),
    card('analytics', 'repeat', 'Repeat orders', fmtN(rp(cur)), v2delta(rp(cur), prev && rp(prev), 1), vo(cur) ? Math.round(rp(cur) / vo(cur) * 100) + '% of valid orders' : 'Customers ordering again'),
    card('analytics', 'cac', 'Cost per customer', cacC ? inr(cacC) : '—', cacD, 'Spend ÷ new customers' + (+E.target ? ' · target ' + inr(+E.target) : ''), true)
  ].join('');
  // orders split
  const n2 = cur.filter(x => vehOf(x) === '2W').length, n4 = cur.filter(x => vehOf(x) === '4W').length, tot = cur.length || 1;
  const bi = cur.filter(x => /inst/i.test(x.booking || '')).length, bs = cur.filter(x => /sched/i.test(x.booking || '')).length;
  const wdc = WD.map((d, i) => [d, cur.filter(x => new Date(x.date + 'T00:00:00').getDay() === i).length]).sort((a, b) => b[1] - a[1]);
  const day = R.n === 1 ? '' : (wdc[0] && wdc[0][1] ? { Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday' }[wdc[0][0]] : '—');
  // areas
  const ag = {}; cur.forEach(x => { const a = areaOf(x); if (a === '—') return; const o = ag[a] = ag[a] || { n: 0, t: 0, f: 0 }; o.n++; vehOf(x) === '2W' ? o.t++ : vehOf(x) === '4W' ? o.f++ : 0 });
  const ta = Object.entries(ag).sort((a, b) => b[1].n - a[1].n), amx = ta.length ? ta[0][1].n : 1, allAreas = new Set(O.map(areaOf).filter(a => a !== '—')).size;
  const growA = (() => { if (!prev) return ''; const pg = {}; prev.forEach(x => { const a = areaOf(x); pg[a] = (pg[a] || 0) + 1 }); const m = ta.filter(([a, o]) => o.n >= 5 && pg[a]).map(([a, o]) => [a, (o.n - pg[a]) / pg[a]]).sort((a, b) => b[1] - a[1])[0]; return m && m[1] > .1 ? ` · ${esc(m[0])} grew fastest (+${Math.round(m[1] * 100)}%)` : '' })();
  // items, ads, wa, growth
  const items = topN(cur, x => v2n(x.items), 5), imx = items.length ? items[0][1] : 1;
  const adl = M.ads.filter(a => a.sp7 > 0).slice(0, 4).map(a => { const p = a.v === 'Scale' ? 'ok' : a.v === 'Cut' ? 'bad' : a.fat ? 'warn' : ''; return `<div class="lr" style="grid-template-columns:minmax(0,1fr) auto;min-height:48px"><span style="min-width:0;line-height:1.25"><b style="display:block;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.name)}</b><small class="mu">${a.res7 ? c1(a.cost) + ' / result · ' : ''}${inr(a.sp7)}</small></span><span class="pill ${p}">${a.fat && a.v === 'Hold' ? 'Refresh' : a.v}</span></div>` }).join('');
  const waBox = (() => {
    if (!(window.W && W.loaded)) return '<div class="empty">Loading…</div>';
    const c = W.camps.find(x => x.status === 'Sent' || x.status === 'Results Logged'); if (!c) return '<div class="empty">No campaign sent yet.</div>';
    const s = waSent(c), b = (l, v, d) => `<div class="lr" style="grid-template-columns:84px minmax(0,1fr) 54px;min-height:30px;border:0"><span>${l}</span><span class="sbar"><span style="width:${Math.min(100, d ? v / d * 100 : 0).toFixed(1)}%;background:var(--ink)"></span></span><b class="mono" style="text-align:right;font-size:12px">${d ? (v / d * 100).toFixed(v / d < .1 ? 1 : 0) + '%' : '—'}</b></div>`;
    return `<div class="mu" style="font-size:12px;margin:-4px 0 10px">Last: ${esc(c.name)} · ${fd(c.date)} · ${fmtN(s)} sent</div>` + (c.delivered != null ? b('Delivered', +c.delivered, s) + b('Read', +c.read || 0, +c.delivered) + b('Clicked', +c.clicks || 0, +c.delivered) + b('Ordered', +c.orders || 0, +c.delivered) : `<div class="empty">Results not filled yet. <button class="lnk" onclick="go('wa')">Add results</button></div>`);
  })();
  const G = growthDS(), gCur = inR(G.rows, R.a, R.b), st = [...S.store].sort((a, b) => a.date < b.date ? -1 : 1).pop();
  const cp = S.content.filter(x => !['Idea', 'Live'].includes(x.stage)).length, cs = S.content.filter(x => x.stage === 'Scheduled' && x.due && x.due <= addDays(t, 7)).length, cl2 = S.content.filter(x => x.stage === 'Live' && (x.due || x.created || '') >= R.a).length;
  const seg = [['td', 'Today'], ['7d', '7D'], ['mtd', 'Month'], ['90d', '90D']];
  const sync = S.settings.find(x => x.id === 'sync');
  return `<div class="v2h"><div><div class="sub">${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}${sync && sync.at ? ' · orders synced ' + relTime(sync.at) : ''}</div><h1 class="h1" style="margin:4px 0 0">${perLabel(R)}</h1></div>
    <div class="row" style="margin:0"><div class="pseg">${seg.map(([k, l]) => `<button class="${EX.per === k ? 'on' : ''}" onclick="exPer('${k}')">${l}</button>`).join('')}</div>${canTab('ads') === 'edit' ? '<button class="btn" onclick="openLog()">+ Log ads</button>' : ''}</div></div>
  <h2 class="sec">The numbers <span>· vs the previous ${R.n} day${R.n > 1 ? 's' : ''}</span></h2><div class="kpis">${kpis}</div>
  <div class="row2">
    <section class="c f3"><div class="hd"><h2>Orders by ${R.n > 62 ? 'week' : 'day'}</h2><span class="lgd"><span><i class="c2w"></i>2-wheeler</span><span><i class="c4w"></i>4-wheeler</span></span></div>
      <div class="stt"><div><small>2-wheeler</small><b>${n2} <span>${Math.round(n2 / tot * 100)}%</span></b></div><div><small>4-wheeler</small><b>${n4} <span>${Math.round(n4 / tot * 100)}%</span></b></div>${bi + bs ? `<div><small>Instant : scheduled</small><b>${Math.round(bi / (bi + bs) * 100)} : ${Math.round(bs / (bi + bs) * 100)}</b></div>` : ''}${day ? `<div><small>Busiest day</small><b>${day}</b></div>` : ''}</div>
      ${cur.length ? v2bars(exBuckets(R), cur) : '<div class="empty">No orders in this period.</div>'}</section>
    <section class="c f2" style="display:flex;flex-direction:column"><div class="hd"><h2>Top areas</h2><button class="lnk" onclick="go('areas')">All ${allAreas} areas →</button></div>
      ${ta.slice(0, 6).map(([a, o], i) => `<button class="lr" style="grid-template-columns:18px minmax(0,1fr) 96px 34px" onclick="AR.q='${esc(a).replace(/'/g, '')}';go('areas')"><span class="mono mu" style="font-size:12px">${i + 1}</span><span style="font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a)}</span><span class="sbar"><span class="c2w" style="width:${(o.t / amx * 100).toFixed(0)}%"></span><span class="c4w" style="width:${(o.f / amx * 100).toFixed(0)}%"></span></span><b class="mono" style="text-align:right">${o.n}</b></button>`).join('') || '<div class="empty">No areas on orders in this period.</div>'}
      <div class="mu" style="margin-top:auto;padding-top:10px;font-size:12px">Bar shows the 2W / 4W split${growA}</div></section>
  </div>
  <div class="g3">
    <section class="c"><div class="hd"><h2>Order status</h2><button class="lnk" onclick="go('orders')">Orders →</button></div>${statusPanel(R.a, R.b)}</section>
    <section class="c"><div class="hd"><h2>What's selling</h2><button class="lnk" onclick="AN.lens='services';go('analytics')">Analyse →</button></div>${items.map(([n, v]) => `<div style="padding:7px 0;border-top:1px solid var(--line)"><div class="row" style="justify-content:space-between;margin:0 0 5px;font-size:13px"><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">${esc(n)}</span><b class="mono">${v}</b></div><div class="sbar" style="height:6px"><span style="width:${(v / imx * 100).toFixed(0)}%;background:var(--ink)"></span></div></div>`).join('') || '<div class="empty">No services on orders yet.</div>'}</section>
    ${canTab('ads') !== 'none' ? `<section class="c"><div class="hd"><h2>Ads · last 7 days</h2><button class="lnk" onclick="go('ads')">Ads →</button></div>${adl || '<div class="empty">No ad spend in the last 7 days.</div>'}</section>` : ''}
  </div>
  <div class="g3" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">
    ${canTab('wa') !== 'none' ? `<section class="c"><div class="hd"><h2>WhatsApp</h2><button class="lnk" onclick="go('wa')">Campaigns →</button></div>${waBox}</section>` : ''}
    <section class="c"><div class="hd"><h2>App users</h2></div><div class="row" style="margin:0;align-items:baseline"><b class="big2" style="font-size:26px">${G.last ? fmtN(G.last.total) : '—'}</b>${gCur.length ? `<span class="kd up" style="font-size:12px">+${fmtN(sum(gCur, x => x.n))} this period</span>` : ''}</div><div class="mu" style="font-size:12px;margin-top:6px">${st ? `Android ${st.andR || '—'} ★ (${fmtN(st.andC || 0)}) · iOS ${st.iosR || '—'} ★ (${fmtN(st.iosC || 0)})` : 'Log store ratings in App growth'}</div></section>
    ${canTab('content') !== 'none' ? `<section class="c"><div class="hd"><h2>Content pipeline</h2><button class="lnk" onclick="go('content')">Board →</button></div><div class="stt" style="margin:0"><div><b>${cp}</b><small>in production</small></div><div><b>${cs}</b><small>scheduled this week</small></div><div><b>${cl2}</b><small>live this period</small></div></div></section>` : ''}
    ${canTab('money') !== 'none' ? `<section class="c"><div class="hd"><h2>Ad wallet</h2>${M.runway !== null ? `<b style="font-size:12px;color:${M.runway < 5 ? 'var(--bad)' : 'var(--mu)'}">Runs out ~${fd(addDays(t, Math.floor(M.runway)))}</b>` : ''}</div><div class="row" style="margin:0;align-items:baseline"><b class="big2" style="font-size:26px">${inr(M.bal)}</b><span class="mu" style="font-size:12px">left · ${inr(M.burn)}/day</span></div><div class="sbar" style="margin-top:8px"><span style="width:${M.funds ? cl(M.bal / M.funds * 100, 0, 100).toFixed(0) : 0}%;background:var(--ink)"></span></div></section>` : ''}
  </div>`;
}

// ---------- AREAS ----------
let AR = { q: '', veh: 'All', per: 'all', sort: 'n', lim: 25 };
function areaRows() {
  const O = ordersAll(), t = today(), from = AR.per === 'all' ? '' : addDays(t, AR.per === '30d' ? -29 : -89);
  const L = O.filter(x => (!from || x.date >= from) && (AR.veh === 'All' || vehOf(x) === AR.veh)), g = {};
  L.forEach(x => { const a = areaOf(x); if (a === '—') return; const o = g[a] = g[a] || { a, R: [], c: new Set(), t: 0, f: 0, cx: 0, last: '', first: x.date }; o.R.push(x); if (x._ok) o.c.add(x._c); else o.cx++; vehOf(x) === '2W' ? o.t++ : vehOf(x) === '4W' ? o.f++ : 0; if (x.date > o.last) o.last = x.date; if (x.date < o.first) o.first = x.date });
  const wk = [...Array(8)].map((_, i) => addDays(t, -7 * (8 - i) + 1));
  return { O, L, rows: Object.values(g).map(o => ({ ...o, n: o.R.length, cu: o.c.size, fq: o.c.size ? (o.R.length - o.cx) / o.c.size : 0, top: (topN(o.R, x => v2n(x.items), 1)[0] || ['—'])[0], spark: wk.map(w => o.R.filter(x => x.date >= w && x.date <= addDays(w, 6)).length) })) };
}
function vAreas(embed) {
  const { O, L, rows } = areaRows(), q = AR.q.toLowerCase();
  const S2 = { n: (a, b) => b.n - a.n, cu: (a, b) => b.cu - a.cu, fq: (a, b) => b.fq - a.fq, last: (a, b) => b.last.localeCompare(a.last), a: (a, b) => a.a.localeCompare(b.a) };
  const vis = rows.filter(r => !q || r.a.toLowerCase().includes(q)).sort(S2[AR.sort] || S2.n);
  const tot = L.length || 1, top5 = rows.slice().sort(S2.n).slice(0, 5).reduce((s, r) => s + r.n, 0), loyal = rows.filter(r => r.cu >= 5).sort(S2.fq)[0];
  const m0 = today().slice(0, 7) + '-01', allA = {}; O.forEach(x => { const a = areaOf(x); if (a !== '—' && (!allA[a] || x.date < allA[a])) allA[a] = x.date }); const fresh = Object.values(allA).filter(d => d >= m0).length;
  const sp = a => { const mx = Math.max(1, ...a); return a.map((v, i) => (i * 10).toFixed(0) + ',' + (18 - v / mx * 16).toFixed(1)).join(' ') };
  const segB = (k, opts) => `<div class="pseg">${opts.map(([v, l]) => `<button class="${AR[k] === v ? 'on' : ''}" onclick="AR.${k}='${v}';AR.lim=25;renderNow()">${l}</button>`).join('')}</div>`;
  const th = (k, l) => `<th onclick="AR.sort='${k}';renderNow()" style="${AR.sort === k ? 'color:var(--tx)' : ''}">${l}${AR.sort === k ? ' ↓' : ''}</th>`;
  return `${embed ? '' : `<div class="v2h"><div><button class="lnk" onclick="go('home')">← Today</button><h1 class="h1" style="margin:4px 0 0">Areas</h1><div class="sub">Every area we've had an order from${AR.per === 'all' ? ', since the first order logged' : ''}</div></div><button class="btn g" onclick="areaCSV()">Export CSV</button></div>`}
  <div class="big4"><div><small>Areas served</small><b>${rows.length}</b><span>${fresh ? '+' + fresh + ' new this month' : 'in this view'}</span></div><div><small>Orders placed</small><b>${fmtN(L.length)}</b><span>2W ${fmtN(L.filter(x => vehOf(x) === '2W').length)} · 4W ${fmtN(L.filter(x => vehOf(x) === '4W').length)}</span></div><div><small>Top 5 areas</small><b>${Math.round(top5 / tot * 100)}%</b><span>of these orders</span></div><div><small>Most loyal area</small><b style="font-size:24px">${loyal ? esc(loyal.a) : '—'}</b><span>${loyal ? loyal.fq.toFixed(1) + ' orders per customer' : 'Needs 5+ customers'}</span></div></div>
  <div class="toolbar"><input class="srch" placeholder="Search area" value="${esc(AR.q)}" oninput="AR.q=this.value;render()" id="ar_q" style="max-width:280px">${segB('veh', [['All', 'All'], ['2W', '2-wheeler'], ['4W', '4-wheeler']])}${segB('per', [['30d', '30D'], ['90d', '90D'], ['all', 'All time']])}</div>
  <section class="c" style="padding:0;overflow:hidden"><div class="w"><table class="at"><tr>${th('n', '#')}${th('a', 'Area')}${th('n', 'Orders placed')}<th>Cancelled</th>${th('cu', 'Customers')}${th('fq', 'Orders / customer')}<th style="width:180px">2W / 4W</th><th>Top service</th><th>Last 8 weeks</th>${th('last', 'Last order')}</tr>
  ${vis.slice(0, AR.lim).map((r, i) => { const p = r.t + r.f ? Math.round(r.t / (r.t + r.f) * 100) : 0; return `<tr><td class="mono mu">${i + 1}</td><td><b style="font-weight:600">${esc(r.a)}</b></td><td class="mono"><b>${r.n}</b></td><td class="mono" style="color:${r.cx / r.n > .3 ? 'var(--bad)' : 'var(--mu)'}">${r.cx ? Math.round(r.cx / r.n * 100) + '%' : '—'}</td><td class="mono">${r.cu}</td><td class="mono">${r.fq.toFixed(1)}</td><td><div class="row" style="margin:0;flex-wrap:nowrap"><span class="sbar" style="flex:1;height:10px"><span class="c2w" style="width:${p}%"></span><span class="c4w" style="width:${r.t + r.f ? 100 - p : 0}%"></span></span><span class="mono mu" style="font-size:11px">${r.t + r.f ? p + ' / ' + (100 - p) : '—'}</span></div></td><td class="mu" style="max-width:200px;overflow:hidden;text-overflow:ellipsis">${esc(r.top)}</td><td><svg viewBox="0 0 70 20" width="70" height="20" aria-hidden="true"><polyline points="${sp(r.spark)}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg></td><td class="mu">${fd(r.last)}</td></tr>` }).join('') || '<tr><td colspan="10" class="mu" style="padding:20px">No orders with an area in this view.</td></tr>'}</table></div>
  <div class="row" style="justify-content:space-between;margin:0;padding:12px 20px;border-top:1px solid var(--line);font-size:12px"><span class="mu">Showing ${Math.min(AR.lim, vis.length)} of ${vis.length} areas</span>${vis.length > AR.lim ? `<button class="btn g sm" onclick="AR.lim=9999;renderNow()">Show all</button>` : ''}</div></section>`;
}
function areaCSV() {
  const { rows } = areaRows(), q = s => /[",\n]/.test(s) ? '"' + String(s).replace(/"/g, '""') + '"' : s;
  const data = 'Area,Orders placed,Cancelled or failed,Customers,Valid orders per customer,2W,4W,Top service,Last order\n' + rows.sort((a, b) => b.n - a.n).map(r => [q(r.a), r.n, r.cx, r.cu, r.fq.toFixed(2), r.t, r.f, q(r.top), r.last].join(',')).join('\n');
  window.SpinotoRuntime.browserDownload({ filename: 'spinoto-areas-' + today() + '.csv', data });
}

// ---------- ANALYTICS ----------
let AN = { lens: 'orders' }; try { AN.lens = localStorage.getItem('anlens') || 'orders' } catch (e) { }
function explore(ds) { const C = exCtx(ds); return `${exBar(ds)}${exKpis(ds, C)}<div class="bento" style="margin-top:14px"><div class="s8">${exTrend(ds, C)}</div><div class="s4">${exInsights(ds, C)}</div></div><div style="margin-top:14px">${exBreak(ds, C)}</div>` }
function dsVariant(k, first, extra) {
  const d = ordDS(), dims = { ...extra, ...d.dims }; const ord = [first, ...Object.keys(dims).filter(x => x !== first)]; const nd = {}; ord.forEach(x => { if (dims[x]) nd[x] = dims[x] });
  return { ...d, k, dims: nd, ins: [first, ...d.ins.filter(x => x !== first)] };
}
function vAnalytics() {
  const M = model(); SM = M; const O = ordersAll(), R = exRange(O.length ? O : M.rows), cur = inR(O, R.a, R.b);
  if (window.W && !W.loaded && !W.loading && window.waLoad && canTab('wa') !== 'none') setTimeout(waLoad, 0);
  const n2 = cur.filter(x => vehOf(x) === '2W').length, nw = cur.filter(x => x._n === 1).length, sp = spendIn(R.a, R.b, M);
  const wdTop = (() => { const c = WD.map((d, i) => [d, cur.filter(x => new Date(x.date + 'T00:00:00').getDay() === i).length]).sort((a, b) => b[1] - a[1]); return c[0] && c[0][1] ? 'Peak: ' + c[0][0] : 'No orders yet' })();
  const L = [
    ['orders', 'orders', 'Orders', fmtN(cur.length) + ' placed · ' + fmtN(cur.filter(x => !x._ok).length) + ' cancelled'], ['ads', 'ads', 'Advertising', inr(sum(M.rows.filter(x => x.date >= R.a && x.date <= R.b), x => x.dSpend)) + ' spend'],
    ['installs', 'growth', 'Installs & users', (growthDS().last ? fmtN(growthDS().last.total) + ' users' : 'Log app users')], ['vehicles', 'car', 'Vehicles & models', cur.length ? `2W ${Math.round(n2 / cur.length * 100)}% · 4W ${100 - Math.round(n2 / cur.length * 100)}%` : '—'],
    ['services', 'wrench', 'Services sold', (topN(cur, x => v2n(x.items), 1)[0] || ['—'])[0]], ['areas', 'areas', 'Areas', new Set(cur.map(areaOf).filter(a => a !== '—')).size + ' areas'],
    ['days', 'clock', 'Days & times', wdTop], ['econ', 'cac', 'CAC & unit economics', nw ? inr(sp.total / nw) + ' per customer' : '—'],
    ['wa', 'wa', 'WhatsApp', (window.W && W.loaded && W.sum) ? fmtN(W.sum.total) + ' sent' : 'Campaigns'], ['repeat', 'repeat', 'Repeat customers', cur.filter(x => x._ok).length ? Math.round((cur.filter(x => x._ok).length - nw) / cur.filter(x => x._ok).length * 100) + '% of valid orders' : '—'],
    ['spend', 'money', 'Spend', 'Ads, PR & other']
  ].filter(([k]) => !((k === 'spend') && canTab('money') === 'none') && !(k === 'wa' && canTab('wa') === 'none') && !(k === 'ads' && canTab('ads') === 'none'));
  if (!L.find(x => x[0] === AN.lens)) AN.lens = 'orders';
  const body = ({
    orders: () => { const R2 = exRange(O.length ? O : M.rows); return `<section class="c" style="margin-bottom:14px"><div class="hd"><h2>Order status · ${fd(R2.a)} – ${fd(R2.b)}</h2><span class="mu" style="font-size:12px">Cancelled &amp; failed are left out of every other number</span></div>${statusPanel(R2.a, R2.b)}</section>` + explore(ordDS()) },
    ads: () => explore(adsDS(M)),
    installs: () => explore(growthDS()),
    vehicles: () => { const ds = dsVariant('veh', 'vehicle', { vehicle: { l: 'Vehicle', v: r => vehOf(r) }, model: { l: 'Model', v: r => v2n(r.model) || '—' } }); return (O.some(x => x.model) ? '' : `<div class="c" style="margin-bottom:14px;font-size:13px">Vehicle <b>model</b> isn't on your orders yet — it fills in automatically once the Google Sheet sync sends a model column.</div>`) + explore(ds) },
    services: () => explore(dsVariant('svc', 'service', {})),
    areas: () => vAreas(true),
    days: () => vDays(M, O),
    econ: () => vEcon(M, O),
    wa: () => (window.W && W.loaded && window.waVOver) ? waVOver() : '<div class="c mu">Loading WhatsApp data…</div>',
    repeat: () => vRepeat(O),
    spend: () => explore(moneyDS(M))
  }[AN.lens] || (() => ''))();
  return `<div class="v2h"><div><h1 class="h1" style="margin:0">Analytics</h1><div class="sub">Pick what to study. Period and filters carry across.</div></div></div>
  <div class="lens" role="tablist">${L.map(([k, ic, n, s]) => `<button role="tab" class="${AN.lens === k ? 'on' : ''}" onclick="AN.lens='${k}';try{localStorage.setItem('anlens','${k}')}catch(e){};renderNow()">${v2ico(ic, 18)}<b>${n}</b><small>${esc(s)}</small></button>`).join('')}</div>${body}`;
}
function vDays(M, O) {
  const ds = dsVariant('days', 'wd', {}), C = exCtx(ds), cur = C.cur, R = C.R;
  const wk = []; for (let d = R.a; d <= R.b && wk.length < 14; d = addDays(d, 7)) wk.push(d);
  const order = [1, 2, 3, 4, 5, 6, 0], cnt = (a, b, i) => cur.filter(x => x.date >= a && x.date <= b && new Date(x.date + 'T00:00:00').getDay() === i).length;
  const mx = Math.max(1, ...order.flatMap(i => wk.map(w => cnt(w, addDays(w, 6), i))));
  const heat = `<div class="hmap" style="grid-template-columns:40px repeat(${wk.length},minmax(0,1fr))"><span></span>${wk.map(w => `<span style="text-align:center">${fd(w)}</span>`).join('')}${order.map(i => `<span style="display:flex;align-items:center">${WD[i]}</span>${wk.map(w => { const v = cnt(w, addDays(w, 6), i); return `<div style="background:rgba(232,80,26,${(0.06 + v / mx * .9).toFixed(2)});color:${v / mx > .55 ? '#fff' : 'var(--tx)'}">${v || ''}</div>` }).join('')}`).join('')}</div>`;
  const avg = order.map(i => { const days = [...Array(R.n)].map((_, k) => addDays(R.a, k)).filter(d => new Date(d + 'T00:00:00').getDay() === i).length || 1; return [WD[i], cur.filter(x => new Date(x.date + 'T00:00:00').getDay() === i).length / days] });
  const am = Math.max(.01, ...avg.map(x => x[1]));
  const ad = order.map(i => { const r = M.rows.filter(x => x.date >= R.a && x.date <= R.b && x.cat === 'Install' && new Date(x.date + 'T00:00:00').getDay() === i), s = sum(r, x => x.dSpend), n = sum(r, x => x.dRes); return [WD[i], n ? s / n : 0] });
  const hasH = cur.some(x => x.hour !== undefined && x.hour !== null && x.hour !== ''), SL = [[6, 9, '6–9 AM'], [9, 12, '9–12'], [12, 15, '12–3 PM'], [15, 18, '3–6'], [18, 21, '6–9 PM'], [21, 24, '9 PM+'], [0, 6, 'Night']];
  const hc = (i, s0) => cur.filter(x => new Date(x.date + 'T00:00:00').getDay() === i && x.hour !== undefined && x.hour !== null && x.hour !== '' && +x.hour >= s0[0] && +x.hour < s0[1]).length, hmx = hasH ? Math.max(1, ...order.flatMap(i => SL.map(s0 => hc(i, s0)))) : 1;
  const hheat = hasH ? `<section class="c" style="margin-bottom:16px"><div class="hd"><h2>When people book</h2><span class="mu" style="font-size:12px">Orders by weekday and time (IST)</span></div><div class="hmap" style="grid-template-columns:40px repeat(${SL.length},minmax(0,1fr))"><span></span>${SL.map(s0 => `<span style="text-align:center">${s0[2]}</span>`).join('')}${order.map(i => `<span style="display:flex;align-items:center">${WD[i]}</span>${SL.map(s0 => { const v = hc(i, s0); return `<div style="background:rgba(232,80,26,${(0.06 + v / hmx * .9).toFixed(2)});color:${v / hmx > .55 ? '#fff' : 'var(--tx)'}">${v || ''}</div>` }).join('')}`).join('')}</div></section>` : '';
  return `${exBar(ds)}${hheat}<div class="row2" style="margin-top:0"><section class="c f3"><div class="hd"><h2>Orders by weekday, week by week</h2><span class="mu" style="font-size:12px">Darker = more orders</span></div>${wk.length ? heat : '<div class="empty">Pick a longer period.</div>'}</section>
  <section class="c f2"><div class="hd"><h2>Average orders per weekday</h2></div>${avg.map(([d, v]) => `<div class="lr" style="grid-template-columns:40px minmax(0,1fr) 40px;min-height:32px;border:0"><span>${d}</span><span class="sbar"><span style="width:${(v / am * 100).toFixed(0)}%;background:var(--ink)"></span></span><b class="mono" style="text-align:right;font-size:12px">${v.toFixed(1)}</b></div>`).join('')}
  ${ad.some(x => x[1]) ? `<div class="hd" style="margin-top:14px"><h2>Cost per install by weekday</h2></div>${ad.map(([d, v]) => `<div class="lr" style="grid-template-columns:40px minmax(0,1fr) 54px;min-height:30px;border:0"><span>${d}</span><span class="sbar"><span style="width:${(v / Math.max(...ad.map(x => x[1])) * 100).toFixed(0)}%;background:var(--ac)"></span></span><b class="mono" style="text-align:right;font-size:12px">${v ? c1(v) : '—'}</b></div>`).join('')}` : ''}</section></div>
  <div style="margin-top:14px">${exBreak(ds, C)}</div>`;
}
function cohorts(O) {
  O = O.filter(x => x._ok);
  const first = {}; O.forEach(x => { if (!first[x._c] || x.date < first[x._c]) first[x._c] = x.date });
  const ms = []; for (let i = 5; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); ms.push(iso(d).slice(0, 7)) }
  const mAdd = (m, k) => { const d = new Date(m + '-01T00:00:00'); d.setMonth(d.getMonth() + k); return iso(d).slice(0, 7) }, now = today().slice(0, 7);
  return ms.map(m => { const cs = Object.keys(first).filter(c => first[c].slice(0, 7) === m); return { m, n: cs.length, cells: [1, 2, 3].map(k => { const mm = mAdd(m, k); if (mm > now) return null; const back = cs.filter(c => O.some(x => x._c === c && x.date.slice(0, 7) === mm)).length; return cs.length ? Math.round(back / cs.length * 100) : null }) } });
}
function cohortTable(O) {
  const C = cohorts(O);
  return `<div class="w"><table style="border-collapse:separate;border-spacing:4px;min-width:480px"><tr><th>First order</th><th>Customers</th><th style="text-align:center">Month +1</th><th style="text-align:center">Month +2</th><th style="text-align:center">Month +3</th></tr>${C.map(r => `<tr><td style="border:0;font-weight:600">${new Date(r.m + '-01T00:00:00').toLocaleString('en', { month: 'short', year: '2-digit' })}</td><td class="mono" style="border:0">${r.n}</td>${r.cells.map(v => `<td style="border:0;text-align:center;border-radius:6px;font:500 12px 'Geist Mono',monospace;padding:9px 4px;background:${v === null ? 'var(--s2)' : `rgba(21,23,28,${(0.06 + v / 40 * .8).toFixed(2)})`};color:${v > 20 ? '#fff' : 'var(--tx)'}">${v === null ? '' : v + '%'}</td>`).join('')}</tr>`).join('')}</table></div>`;
}
function vRepeat(O) {
  const ds = dsVariant('rep', 'cust', {}), C = exCtx(ds), cust = {}; O = O.filter(x => x._ok); O.forEach(x => cust[x._c] = (cust[x._c] || 0) + 1);
  const n = Object.keys(cust).length, rep = Object.values(cust).filter(v => v > 1).length, avg = n ? O.length / n : 0;
  const gaps = []; const by = {}; O.forEach(x => (by[x._c] = by[x._c] || []).push(x.date)); Object.values(by).forEach(d => { d.sort(); for (let i = 1; i < d.length; i++)gaps.push(dd(d[i - 1], d[i]) - 1) });
  const mg = gaps.length ? gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)] : null;
  return `${exBar(ds)}<div class="big4"><div><small>Customers, all time</small><b>${fmtN(n)}</b><span>unique phone numbers</span></div><div><small>Came back</small><b>${n ? Math.round(rep / n * 100) : 0}%</b><span>${fmtN(rep)} ordered 2+ times</span></div><div><small>Orders per customer</small><b>${avg.toFixed(2)}</b><span>all time</span></div><div><small>Typical gap</small><b>${mg === null ? '—' : mg + 'd'}</b><span>between two orders</span></div></div>
  <section class="c" style="margin-top:16px"><div class="hd"><h2>Do customers come back?</h2><span class="mu" style="font-size:12px">% ordering again, by month of first order</span></div>${cohortTable(O)}</section>
  <div style="margin-top:14px">${exBreak(ds, C)}</div>`;
}
function vEcon(M, O) {
  const E = ECD(), R = exRange(O.length ? O : M.rows), cur = inR(O, R.a, R.b), prev = R.all ? null : inR(O, R.pa, R.pb);
  const sp = spendIn(R.a, R.b, M), spP = prev ? spendIn(R.pa, R.pb, M) : null, nw = cur.filter(x => x._n === 1), nwP = prev ? prev.filter(x => x._n === 1) : null;
  const cac = nw.length ? sp.total / nw.length : 0, cacP = nwP && nwP.length ? spP.total / nwP.length : null;
  const withAmt = O.filter(x => x._ok && amtOf(x) > 0), aov = withAmt.length ? sum(withAmt, amtOf) / withAmt.length : 0, comm = parseFloat(E.comm) || 0, cpo = aov * comm / 100;
  const first = {}; O.forEach(x => { if (x._ok && (!first[x._c] || x.date < first[x._c])) first[x._c] = x.date });
  const t = today(), coh = Object.keys(first).filter(c => first[c] <= addDays(t, -90)), opc = coh.length ? coh.reduce((s, c) => s + O.filter(x => x._ok && x._c === c && x.date <= addDays(first[c], 89)).length, 0) / coh.length : (Object.keys(first).length ? O.filter(x => x._ok).length / Object.keys(first).length : 0);
  const ltv = cpo * opc, ratio = cac && ltv ? ltv / cac : 0, payback = cpo && cac ? cac / cpo : 0, tgt = +E.target || 0;
  // channel
  const plat = {}; S.adsets.forEach(a => plat[a.name] = (a.platform || '').toLowerCase());
  const adsBy = p => sum(M.rows.filter(x => x.date >= R.a && x.date <= R.b && (plat[x.adset] || '').includes(p)), x => x.dSpend) * (1 + GST);
  const chOf = r => { const s = String(r.source || '').toLowerCase(); return !s ? '' : /meta|facebook|insta|fb|ig/.test(s) ? 'Meta Ads' : /google|search|youtube|gads/.test(s) ? 'Google Ads' : /whats|wa\b/.test(s) ? 'WhatsApp' : /influ|pr\b/.test(s) ? 'Influencer & PR' : /hotstar|jio/.test(s) ? 'Hotstar' : /refer/.test(s) ? 'Referral' : /organic|direct|play|app store|seo/.test(s) ? 'Organic' : 'Other' };
  const hasSrc = nw.some(x => x.source);
  const chans = [['Meta Ads', adsBy('meta')], ['Google Ads', adsBy('google')], ['WhatsApp', sp.wa], ['Influencer & PR', sp.pr], ['Hotstar', adsBy('hotstar')], ['Referral', 0], ['Organic', 0]].map(([n, s]) => { const c = nw.filter(x => chOf(x) === n).length; return { n, s, c, cac: c ? s / c : null } }).filter(x => x.s || x.c);
  const cmx = Math.max(1, ...chans.map(x => x.cac || 0), tgt * 1.3);
  const ed = canTab('data') === 'edit' || isSuper();
  const tog = (k, l, v) => `<label class="row" style="margin:0;min-height:32px;font-size:13px;gap:10px"><input type="checkbox" ${E.inc[k] ? 'checked' : ''} ${ed ? `onchange="econSet({inc:{...ECD().inc,${k}:this.checked}})"` : 'disabled'} style="width:18px;height:18px;margin:0"><span style="flex:1">${l}</span><span class="mono mu" style="font-size:12px">${inr(v)}</span></label>`;
  return `${exBar({ k: 'econ', rows: O, dims: {} })}
  <div class="big4"><div><small>Cost per new customer (CAC)</small><b>${cac ? inr(cac) : '—'}</b><span>${cacP ? (cac <= cacP ? '▼ ' : '▲ ') + inr(Math.abs(cac - cacP)) + ' vs before' : fmtN(nw.length) + ' new customers'}${tgt ? ' · target ' + inr(tgt) : ''}</span></div>
    <div><small>Average order value</small><b>${aov ? inr(aov) : '—'}</b><span>${aov ? 'from ' + fmtN(withAmt.length) + ' orders with a value' : 'Comes from the Sheet’s amount column'}</span></div>
    <div><small>90-day value per customer</small><b>${ltv ? inr(ltv) : '—'}</b><span>${comm ? opc.toFixed(1) + ' orders × ' + inr(cpo) + ' commission' : 'Set your commission % below'}</span></div>
    <div><small>Value : CAC</small><b style="color:${ratio && ratio < 1 ? 'var(--bad)' : 'inherit'}">${ratio ? ratio.toFixed(2) + '×' : '—'}</b><span>${payback ? 'Pays back on order ' + Math.ceil(payback) : '3× is healthy'}</span></div></div>
  ${ratio ? `<div class="ins2"><div style="flex:2 1 420px;min-width:0"><div class="ey">The one thing to know</div><p>A new customer costs ${inr(cac)} and earns us ${inr(cpo)} per order, so they pay back on their <span style="color:#F4A27C">order ${Math.ceil(payback)}</span>. Right now they average ${opc.toFixed(1)} orders in 90 days.</p></div><div style="flex:1 1 260px;display:flex;flex-direction:column;gap:8px"><div class="lv"><span>Break-even CAC (90 days)</span><b class="mono">${inr(ltv)}</b></div><div class="lv"><span>Orders needed at today’s CAC</span><b class="mono">${payback.toFixed(1)}</b></div></div></div>` : ''}
  <div class="row2">
    <section class="c f3"><div class="hd"><h2>CAC by channel</h2>${tgt ? `<span class="mu" style="font-size:12px">Orange line = ${inr(tgt)} target</span>` : ''}</div>
      ${hasSrc ? chans.map(x => `<div class="lr" style="grid-template-columns:130px minmax(0,1fr) 70px;min-height:38px"><span>${x.n} <small class="mu">· ${x.c}</small></span><span style="position:relative;height:20px;border-radius:6px;background:var(--s2)"><span style="position:absolute;left:0;top:0;bottom:0;border-radius:6px;width:${x.cac === null ? 0 : (x.cac / cmx * 100).toFixed(1)}%;background:${tgt && x.cac > tgt ? 'var(--ac)' : 'var(--ink)'}"></span>${tgt ? `<span style="position:absolute;top:-3px;bottom:-3px;width:2px;background:var(--ac);left:${(tgt / cmx * 100).toFixed(1)}%"></span>` : ''}</span><b class="mono" style="text-align:right">${x.cac === null ? '—' : inr(x.cac)}</b></div>`).join('') : `<div class="empty">CAC per channel needs an order <b>source</b> (Meta, Google, WhatsApp, Referral…). It fills in once the Google Sheet sends a source column, or when you pick one on an order.</div>`}</section>
    <section class="c f2"><div class="hd"><h2>How CAC is counted</h2></div><div class="mono" style="padding:12px 14px;border-radius:10px;background:var(--s2);font-size:12.5px;line-height:1.5;margin-bottom:8px">CAC = ticked costs<br>÷ customers whose first-ever order is in the period</div>
      ${tog('ads', 'Ad spend (incl. 18% GST)', sp.ads)}${tog('wa', 'WhatsApp messages', sp.wa)}${tog('pr', 'Influencer & PR', sp.pr)}${tog('other', 'Other marketing costs', sp.other)}
      <div class="f" style="grid-template-columns:1fr 1fr;margin-top:10px"><div><label>Our commission %</label><input id="ec_comm" type="number" step="0.1" value="${esc(E.comm)}" ${ed ? '' : 'disabled'} onchange="econSet({comm:this.value})"></div><div><label>Target CAC ₹</label><input id="ec_tgt" type="number" value="${esc(E.target)}" ${ed ? '' : 'disabled'} onchange="econSet({target:this.value})"></div></div></section>
  </div>
  <section class="c" style="margin-top:16px"><div class="hd"><h2>Do customers come back?</h2><span class="mu" style="font-size:12px">% ordering again, by month of first order</span></div>${cohortTable(O)}</section>`;
}
async function econSet(ch) { const cur = ECD(); delete cur.id; if (await put('settings', 'econ', { ...cur, ...ch })) msg('Saved ✓') }
