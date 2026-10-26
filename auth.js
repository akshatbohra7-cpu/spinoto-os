// ===== Login, roles & permissions, Team page =====
// Roles live in Supabase (app_roles.perms = {tab: 'none'|'view'|'edit'}); the database enforces
// the same rules with RLS, this file only shapes the UI around them.
const PERM_TABS = [['home', 'Home'], ['ads', 'Ads'], ['orders', 'Orders'], ['growth', 'Growth'], ['wa', 'WhatsApp'], ['content', 'Content'], ['creatives', 'Creatives'], ['tasks', 'Tasks'], ['lab', 'Lab'], ['money', 'Money'], ['ask', 'Ask'], ['data', 'Setup']];
const OWNER_EMAIL = 'akshatbohra7@gmail.com';
let ME = null, ROLES = [], TEAM = [], TM = { armed: '' };

const canTab = t => {
  if (!ME) return 'edit';                       // Claude preview / open mode
  if (ME.role === 'superadmin') return 'edit';
  if (t === 'team') return 'none';
  const r = ROLES.find(x => x.role === ME.role);
  return (r && r.perms && r.perms[t]) || 'none';
};
const isSuper = () => !!ME && ME.role === 'superadmin';
const roleLabel = r => (ROLES.find(x => x.role === r) || {}).label || r;

(function () {
  const st = document.createElement('style');
  st.textContent = `#auth{position:fixed;inset:0;z-index:200;display:grid;place-items:center;padding:16px;background:var(--mesh),var(--bg);overflow:auto}
  #auth .bx2{width:100%;max-width:380px}#auth h1{font-size:26px;margin:14px 0 4px;letter-spacing:-.02em}#auth .f{grid-template-columns:1fr;margin-top:14px}
  #auth .err{color:var(--bad);font-size:13px;min-height:18px;margin-top:8px}
  body.ro #app button[onclick^="save"],body.ro #app button[onclick^="open"],body.ro #app button[onclick^="del("],body.ro #app button[onclick*="Idea"],body.ro #app button[onclick^="addObjective"],body.ro #app .x,
  body.ro #app button[onclick^="waCamp"],body.ro #app button[onclick^="waLog"],body.ro #app button[onclick^="waOptAdd"],body.ro #app button[onclick^="waSetSave"],body.ro #app button[onclick^="go('data')"],
  body.ro #drw button[onclick^="save"],body.ro #drw button[onclick^="wa"],body.ro #drw button[onclick*="del2"],body.ro #fab{display:none!important}
  body.ro #app input[type=checkbox],body.ro #app [draggable]{pointer-events:none}
  .ro-badge{font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;background:color-mix(in srgb,var(--warn) 18%,transparent);color:var(--warn)}
  .ub{border:1px solid var(--bd);background:var(--s1);color:var(--tx);border-radius:12px;padding:7px 11px;font:inherit;font-weight:600;cursor:pointer;display:flex;gap:7px;align-items:center;white-space:nowrap}
  .pm td,.pm th{text-align:center}.pm td:first-child,.pm th:first-child{text-align:left}.pm select{padding:6px 8px;min-width:88px}
  .pm select.edit{color:var(--ok);font-weight:700}.pm select.view{color:var(--in);font-weight:600}.pm select.none{color:var(--mu)}`;
  document.head.appendChild(st);
})();

function authScreen(inner) {
  let a = document.getElementById('auth'); if (!a) { a = document.createElement('div'); a.id = 'auth'; document.body.appendChild(a) }
  a.innerHTML = `<div class="bx2"><div class="logo">S</div>${inner}</div>`;
}
const aval = id => (document.getElementById(id)?.value || '').trim();
const aerr = t => { const e = document.getElementById('a_err'); if (e) e.textContent = t || '' };

async function authGate(client) {
  client.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT') location.reload() });
  const { data: { session } } = await client.auth.getSession();
  if (!session) { await showLogin(client); return false }
  const [p, r] = await Promise.all([client.from('profiles').select('*').eq('id', session.user.id).maybeSingle(), client.from('app_roles').select('*').order('sort')]);
  ROLES = r.data || [];
  if (!p.data || !p.data.active) {
    authScreen(`<h1>No access yet</h1><p class="mu">You're signed in as <b>${esc(session.user.email)}</b>, but this account isn't active in Spinoto OS. Ask your Super Admin to add or re-activate you.</p><button class="btn g" onclick="SB.auth.signOut()">Log out</button>`);
    return false;
  }
  ME = p.data; document.getElementById('auth')?.remove();
  return true;
}

async function showLogin(client) {
  let open = false; try { const { data } = await client.rpc('app_open'); open = !!data } catch (e) { }
  authScreen(open ? `
    <h1>Set up Spinoto OS</h1><p class="mu" style="margin:0">First time here — create the owner (Super Admin) account. You'll add the team after this.</p>
    <div class="f"><div><label>Your name</label><input id="a_name" placeholder="Akshat"></div>
    <div><label>Owner email</label><input id="a_email" type="email" value="${OWNER_EMAIL}"></div>
    <div><label>Choose a password (8+ characters)</label><input id="a_pw" type="password" autocomplete="new-password"></div>
    <div><label>Repeat password</label><input id="a_pw2" type="password" autocomplete="new-password" onkeydown="if(event.key==='Enter')doSetup()"></div></div>
    <div class="err" id="a_err"></div><button class="btn" style="width:100%;margin-top:6px" onclick="doSetup()">Create owner account</button>` : `
    <h1>Spinoto OS</h1><p class="mu" style="margin:0">Log in with the email and password your admin gave you.</p>
    <div class="f"><div><label>Email</label><input id="a_email" type="email" autocomplete="username"></div>
    <div><label>Password</label><input id="a_pw" type="password" autocomplete="current-password" onkeydown="if(event.key==='Enter')doLogin()"></div></div>
    <div class="err" id="a_err"></div><button class="btn" style="width:100%;margin-top:6px" onclick="doLogin()">Log in</button>
    <p class="mu" style="font-size:12px;margin-top:14px">Forgot your password? Ask your Super Admin to reset it from the Team page.</p>`);
  document.getElementById(open ? 'a_name' : 'a_email')?.focus();
}
async function doLogin() {
  const email = aval('a_email'), password = $('#a_pw').value; if (!email || !password) return aerr('Enter email and password');
  aerr('Logging in…');
  const { error } = await SB.auth.signInWithPassword({ email, password });
  if (error) return aerr(/invalid/i.test(error.message) ? 'Wrong email or password' : /banned/i.test(error.message) ? 'This account is deactivated' : error.message);
  location.reload();
}
async function doSetup() {
  const email = aval('a_email').toLowerCase(), password = $('#a_pw').value;
  if (password.length < 8) return aerr('Password must be at least 8 characters');
  if (password !== $('#a_pw2').value) return aerr("Passwords don't match");
  aerr('Creating account…');
  const { data, error } = await SB.functions.invoke('admin-users', { body: { action: 'bootstrap', email, password, name: aval('a_name') || 'Owner' } });
  const em = await fnErr(data, error); if (em) return aerr(em);
  const s = await SB.auth.signInWithPassword({ email, password }); if (s.error) return aerr(s.error.message);
  location.reload();
}
async function fnErr(data, error) {
  if (data && data.error) return data.error;
  if (!error) return '';
  try { const b = await error.context.json(); return b.error || error.message } catch (e) { return error.message || 'Something went wrong' }
}
async function adminCall(body) {
  const { data, error } = await SB.functions.invoke('admin-users', { body });
  const em = await fnErr(data, error); if (em) { msg(em); return false } return true;
}

// ---------- top-right user menu ----------
const userBtn = () => ME ? `<button class="ub" onclick="meMenu()">${av(ME.name || ME.email)}<span>${esc((ME.name || ME.email).split(' ')[0])}</span><small class="mu">${esc(roleLabel(ME.role))}</small></button>` : '';
function meMenu() {
  closeAll(); $('#drw').innerHTML = `<div class="ov r" onclick="closeAll()"><div class="bx dr" onclick="event.stopPropagation()"><div class="row" style="justify-content:space-between"><b style="font-size:19px">${esc(ME.name || '')}</b><button class="x" onclick="closeAll()" style="color:var(--mu)">✕</button></div>
  <p class="mu" style="margin:4px 0 16px">${esc(ME.email)} · ${esc(roleLabel(ME.role))}</p>
  <h3>Change password</h3><div class="f" style="grid-template-columns:1fr"><div><label>New password (8+ characters)</label><input id="me_pw" type="password" autocomplete="new-password"></div><div><label>Repeat</label><input id="me_pw2" type="password" autocomplete="new-password"></div></div>
  <div class="row" style="margin-top:12px"><button class="btn keep" onclick="changePw()">Update password</button></div>
  <div class="row" style="margin-top:28px"><button class="btn g" onclick="SB.auth.signOut()">Log out</button></div></div></div>`;
}
async function changePw() {
  const a = $('#me_pw').value; if (a.length < 8) return msg('Password must be at least 8 characters'); if (a !== $('#me_pw2').value) return msg("Passwords don't match");
  const { error } = await SB.auth.updateUser({ password: a }); if (error) return msg(error.message); closeAll(); msg('Password updated ✓');
}

// ---------- Team page (Super Admin only) ----------
async function teamLoad() {
  const [p, r] = await Promise.all([SB.from('profiles').select('*').order('created_at'), SB.from('app_roles').select('*').order('sort')]);
  if (p.error || r.error) return msg('Team: ' + (p.error || r.error).message);
  TEAM = p.data; ROLES = r.data; TM.loaded = true; render();
}
function vTeam() {
  if (!isSuper()) return `<div class="top"><h1>Team</h1></div><div class="c mu">Only a Super Admin can manage the team.</div>`;
  if (!TM.loaded) { setTimeout(teamLoad, 0); return `<div class="top"><h1>Team</h1></div><div class="c mu">Loading…</div>` }
  const ro = ROLES.map(r => `<option value="${esc(r.role)}">${esc(r.label)}</option>`).join('');
  const users = TEAM.map(u => `<tr><td>${av(u.name || u.email)} <b>${esc(u.name || '')}</b>${u.id === ME.id ? ' <span class="chip">you</span>' : ''}</td><td class="mu">${esc(u.email)}</td>
    <td><select onchange="teamUpd('${u.id}',{role:this.value})" style="min-width:130px">${ROLES.map(r => `<option value="${esc(r.role)}" ${r.role === u.role ? 'selected' : ''}>${esc(r.label)}</option>`).join('')}</select></td>
    <td><span class="chip ${u.active ? 'ok' : 'bad'}">${u.active ? 'Active' : 'Deactivated'}</span></td>
    <td><div class="row" style="margin:0;flex-wrap:nowrap"><button class="btn g sm" onclick="teamPw('${u.id}')">Reset password</button>${u.id === ME.id ? '' : `<button class="btn g sm" onclick="teamUpd('${u.id}',{active:${!u.active}})">${u.active ? 'Deactivate' : 'Activate'}</button><button class="x" onclick="teamDel('${u.id}')">${TM.armed === 'd' + u.id ? 'Sure?' : '✕'}</button>`}</div></td></tr>`);
  const editable = ROLES.filter(r => r.role !== 'superadmin');
  const cell = (r, t) => { const v = (r.perms || {})[t] || 'none'; return `<td><select class="${v}" onchange="permSet('${esc(r.role)}','${t}',this.value)"><option value="none" ${v === 'none' ? 'selected' : ''}>No access</option><option value="view" ${v === 'view' ? 'selected' : ''}>View</option><option value="edit" ${v === 'edit' ? 'selected' : ''}>Edit</option></select></td>` };
  return `<div class="top"><div><h1>Team</h1><span class="mu">${TEAM.filter(u => u.active).length} active users · ${ROLES.length} roles</span></div></div>
  <h3>Add a team member</h3><div class="c f" style="align-items:end"><div><label>Name</label><input id="t_name"></div><div><label>Email</label><input id="t_email" type="email" autocomplete="off"></div><div><label>Temporary password (8+)</label><input id="t_pw" type="text" autocomplete="off" value="${TM.pw || (TM.pw = genPw())}"></div><div><label>Role</label><select id="t_role">${ro}</select></div><button class="btn" onclick="teamAdd()">Add user</button></div>
  <p class="mu" style="font-size:12px;margin:6px 2px 0">Share the email + temporary password with them. They can change it from their name (top right) after logging in.</p>
  <h3>Users</h3>${tbl(['Name', 'Email', 'Role', 'Status', ''], users)}
  <h3>What each role can do</h3><div class="c w" style="padding:4px 6px"><table class="pm"><tr><th>Section</th><th>Super Admin</th>${editable.map(r => `<th>${esc(r.label)}${['manager', 'member', 'viewer'].includes(r.role) ? '' : ` <button class="x" title="Delete role" onclick="roleDel('${esc(r.role)}')">${TM.armed === 'r' + r.role ? 'Sure?' : '✕'}</button>`}</th>`).join('')}</tr>
    ${PERM_TABS.map(([t, n]) => `<tr><td><b>${n}</b></td><td><span class="chip ok">Edit</span></td>${editable.map(r => cell(r, t)).join('')}</tr>`).join('')}
    <tr><td><b>Team &amp; roles</b></td><td><span class="chip ok">Edit</span></td>${editable.map(() => '<td><span class="chip">No access</span></td>').join('')}</tr></table></div>
  <p class="mu" style="font-size:12px;margin:6px 2px">Changes save instantly and apply the next time that person opens the app. <b>View</b> = can see, can't add/change/delete. The database enforces this too, not just the screen.</p>
  <div class="row" style="margin-top:8px"><input id="t_newrole" placeholder="New role name, e.g. Intern" style="max-width:240px"><button class="btn g sm" onclick="roleAdd()">+ Add role</button></div>`;
}
const genPw = () => { const c = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s = ''; const a = new Uint32Array(10); crypto.getRandomValues(a); a.forEach(n => s += c[n % c.length]); return s };
async function teamAdd() {
  const body = { action: 'create', name: val('t_name'), email: val('t_email'), password: val('t_pw'), role: val('t_role') };
  if (!body.email) return msg('Email required');
  if (await adminCall(body)) { msg(`✓ Added ${body.email} — password: ${body.password}`); log('👥', `Added ${body.name || body.email} as ${roleLabel(body.role)}`); TM.pw = ''; ['t_name', 't_email'].forEach(i => $('#' + i).value = ''); await teamLoad() }
}
async function teamUpd(id, ch) { if (await adminCall({ action: 'update', id, ...ch })) { msg('Saved ✓'); await teamLoad() } else { LASTHTML = ''; teamLoad() } }
async function teamDel(id) { if (TM.armed !== 'd' + id) { TM.armed = 'd' + id; return render() } TM.armed = ''; if (await adminCall({ action: 'delete', id })) { msg('User removed'); await teamLoad() } }
async function teamPw(id) {
  const u = TEAM.find(x => x.id === id), pw = genPw();
  if (await adminCall({ action: 'update', id, password: pw })) {
    closeAll(); $('#drw').innerHTML = `<div class="ov r" onclick="closeAll()"><div class="bx dr" onclick="event.stopPropagation()"><b style="font-size:19px">New password for ${esc(u.name || u.email)}</b><p class="mu">Share this with them — it won't be shown again.</p><div class="c" style="font:700 20px ui-monospace,Menlo,monospace;letter-spacing:.05em;text-align:center">${pw}</div><div class="row" style="margin-top:14px"><button class="btn" onclick="navigator.clipboard.writeText('${pw}').then(()=>msg('Copied'))">Copy</button><button class="btn g" onclick="closeAll()">Done</button></div></div></div>`;
  }
}
async function permSet(role, tab, v) {
  const r = ROLES.find(x => x.role === role), perms = { ...(r.perms || {}), [tab]: v };
  const { error } = await SB.from('app_roles').update({ perms }).eq('role', role);
  if (error) { msg('Could not save: ' + error.message); LASTHTML = ''; return teamLoad() }
  r.perms = perms; render();
}
async function roleAdd() {
  const label = norm(val('t_newrole')); if (!label) return msg('Role name required');
  const role = slug(label).replace(/-/g, '_'); if (ROLES.some(r => r.role === role)) return msg('Role already exists');
  const perms = {}; PERM_TABS.forEach(([t]) => perms[t] = 'none'); perms.home = 'view';
  const { error } = await SB.from('app_roles').insert({ role, label, perms, sort: 40 + ROLES.length });
  if (error) return msg('Could not add: ' + error.message); $('#t_newrole').value = ''; await teamLoad();
}
async function roleDel(role) {
  if (TEAM.some(u => u.role === role)) return msg('Move the users in this role to another role first');
  if (TM.armed !== 'r' + role) { TM.armed = 'r' + role; return render() } TM.armed = '';
  const { error } = await SB.from('app_roles').delete().eq('role', role); if (error) return msg(error.message); await teamLoad();
}
