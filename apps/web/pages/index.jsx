import Head from 'next/head';
import { useCallback, useEffect, useRef, useState } from 'react';
import { accessToken, api, callback, login, logout, save, stored } from '../lib/session';
const pendingKey = 'forge:luma:pending';
export default function Luma() {
  const [config, setConfig] = useState(null), [me, setMe] = useState(null), [notice, setNotice] = useState('');
  const [portal, setPortal] = useState(null), [requests, setRequests] = useState([]), [activities, setActivities] = useState([]);
  const [title, setTitle] = useState(''), [detail, setDetail] = useState(''), [status, setStatus] = useState(''), [busy, setBusy] = useState(false);
  const refreshing = useRef(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const response = await fetch('/config.json', {cache:'no-store',signal:AbortSignal.timeout(5000)});
        if (!response.ok) throw Error('No se pudo cargar la configuración del portal.');
        const value = await response.json();
        if (!alive) return;
        setConfig(value);
        if (location.pathname.startsWith('/callback')) await callback(value);
        const key = location.pathname.split('/')[1];
        setPortal(Object.hasOwn(value.portals, key) ? key : Object.keys(value.portals)[0]);
        if (value.auth.mode === 'demo') setNotice('Demo local · datos en memoria · sin conexión a AWS. Los dos portales usan un operador ficticio.');
        if (value.auth.mode === 'demo' || accessToken()) { const principal = await api(value, '/me'); if (alive) setMe(principal); }
      } catch (error) { if (alive) setNotice(error.message); }
    })();
    return () => { alive = false; };
  }, []);
  const refresh = useCallback(async () => {
    if (!config || !me || refreshing.current || document.visibilityState === 'hidden') return;
    refreshing.current = true;
    try {
      const result = await api(config, '/requests'); setRequests(result.requests);
      if (config.eventsEnabled) setActivities((await api(config, '/activities')).activities);
    } catch (error) { setNotice(error.message); if (error.status === 401) setMe(null); }
    finally { refreshing.current = false; }
  }, [config, me]);
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 5000);
    window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [refresh]);
  async function signIn() { try { await login(config); } catch (error) { setNotice(error.message); } }
  async function submit(event) {
    event.preventDefault(); setBusy(true); setStatus('Guardando la solicitud…');
    const input = {title:title.trim(), detail:detail.trim()};
    const prior = stored(pendingKey);
    const pending = prior?.title === input.title && prior?.detail === input.detail ? prior : {id:crypto.randomUUID(), ...input};
    try {
      save(pendingKey, pending);
      const result = await api(config, '/requests', {method:'POST',body:JSON.stringify(pending)});
      save(pendingKey, null); setTitle(''); setDetail('');
      setStatus(result.delivery === 'disabled' ? 'Solicitud guardada. Ya puedes consultarla en el listado.' : result.delivery === 'pending' ? 'Solicitud guardada. La entrega pendiente se reintentará automáticamente.' : 'Solicitud guardada. El worker la procesará en breve.');
      await refresh();
    } catch (error) { setStatus(error.message + ' Se conserva el identificador para evitar duplicados al reintentar.'); if (error.status === 401) setMe(null); }
    finally { setBusy(false); }
  }
  const operator = config?.portals[portal]?.view === 'operator';
  const forbidden = operator && me && !me.operator;
  const events = Boolean(config?.eventsEnabled);
  const dbLabel = ({postgres:'PostgreSQL', 'aurora-postgresql':'Aurora PostgreSQL', 'aurora-mysql':'Aurora MySQL', documentdb:'DocumentDB', memory:'Memoria local'})[config?.database?.kind] || 'Datos privados';
  const dbMetric = config?.database?.driver === 'documentdb' ? 'Doc' : config?.database?.driver === 'memory' ? 'RAM' : 'SQL';
  const processed = requests.filter(row => row.status === 'processed').length;
  return <>
    <Head><title>Luma · Goliat Forge</title><meta name="description" content="Aplicación de referencia Next.js y Node.js de Goliat Forge." /></Head>
    <header><a className="brand" href={config ? '/'+Object.keys(config.portals)[0]+'/' : '/'} aria-label="Luma, inicio"><span className="brand-icon">L</span><span>Luma<small>Built on Goliat Forge</small></span></a><nav aria-label="Portales">{config && Object.entries(config.portals).map(([key, item]) => <a href={'/'+key+'/'} key={key} aria-current={key === portal ? 'page' : undefined}>{item.label}</a>)}</nav><div className="session"><span className="badge">{config?.environment || 'Cargando'}</span>{config?.auth.mode === 'cognito' && <button className="button quiet" onClick={me ? () => logout(config) : signIn}>{me ? 'Salir' : 'Iniciar sesión'}</button>}</div></header>
    <main>{notice && <div className="notice" role="status">{notice}</div>}<div className="page-heading"><div><p className="eyebrow">TU EQUIPO. UN FLUJO MÁS CLARO.</p><h1>{operator ? 'Una vista para el equipo.' : <>Cada solicitud,<br />en su sitio.</>}</h1><p className="intro">Registra una solicitud y consulta su estado. Una web Next.js, un backend Node.js y una base de datos privada configurable.{events && ' Con procesamiento asíncrono opcional.'}</p></div><div className="flow-label"><span>01 · Next.js</span><i>→</i><span>02 · Node.js</span><i>→</i><span>{events ? '03 · SQS + Worker' : '03 · '+dbLabel}</span></div></div>
    {!me && config && <section className="empty panel"><span className="large-symbol" aria-hidden="true">↗</span><h2>Tu espacio empieza aquí.</h2><p>Accede con Cognito para consultar tus solicitudes. El rol Operators permite consultar las del equipo.</p><button className="button primary" onClick={signIn}>Acceder al portal</button></section>}
    {forbidden && <p className="notice">Este portal requiere el rol Operators. Puedes consultar tus solicitudes en el portal de usuarios.</p>}
    {me && !forbidden && <><section className="metrics" aria-label="Resumen de esta vista"><article><span>Solicitudes</span><strong>{requests.length}</strong><small>En esta vista · hasta 200</small></article><article><span>{events ? 'Procesadas' : 'Persistencia'}</span><strong>{events ? processed : dbMetric}</strong><small>{events ? 'Actividad confirmada' : dbLabel}</small></article><article><span>{events ? 'En proceso' : 'Acceso'}</span><strong>{events ? requests.length - processed : me.operator ? 'Equipo' : 'Propio'}</strong><small>{events ? 'Entrega asíncrona' : 'Permisos validados en la API'}</small></article></section>
    <div className={'workspace'+(operator ? ' operations' : '')}>{!operator && <section className="panel form-panel"><div className="panel-title"><span className="step">01</span><div><h2>Nueva solicitud</h2><p>El identificador se conserva si necesitas reintentar.</p></div></div><form onSubmit={submit}><label htmlFor="title">Título</label><input id="title" maxLength={140} value={title} onChange={event => setTitle(event.target.value)} placeholder="Preparar el entorno del nuevo equipo" required /><label htmlFor="detail">Detalles</label><textarea id="detail" rows={5} maxLength={1200} value={detail} onChange={event => setDetail(event.target.value)} placeholder="Describe lo que necesitas y el contexto para el equipo." /><button className="button primary" disabled={busy} type="submit">{busy ? 'Guardando…' : 'Enviar solicitud'} <span aria-hidden="true">↗</span></button><p className="form-status" role="status" aria-live="polite">{status}</p></form><div className="architecture-note"><span className="status-dot" /><div><strong>{events ? 'Primero se guarda. Después se procesa.' : 'Una petición. Un registro.'}</strong><p>{events ? 'Outbox transaccional, SQS con reintentos y worker idempotente.' : 'API autenticada, permisos de datos e identificadores idempotentes.'}</p></div></div></section>}
    <section className="panel list-panel"><div className="panel-title"><div><h2>{operator ? 'Solicitudes del equipo' : 'Mis solicitudes'}</h2><p>Cada fila muestra el estado devuelto por la API.</p></div><button className="button quiet" onClick={refresh} aria-label="Actualizar solicitudes">↻ Actualizar</button></div><div className="table-wrap"><table><thead><tr><th>Solicitud</th><th>Estado</th><th>Fecha</th></tr></thead><tbody>{requests.map(row => <tr key={row.id}><td><strong>{row.title}</strong><small>{row.id.slice(0,8)} · {row.detail.slice(0,70)}</small></td><td><span className={'status'+(!events || row.status === 'processed' ? ' done' : '')}>{!events ? 'Guardada' : row.status === 'processed' ? 'Procesada' : 'En proceso'}</span></td><td>{new Intl.DateTimeFormat('es',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(row.created_at))}</td></tr>)}</tbody></table></div>{!requests.length && <p className="empty">Todo despejado. Crea la primera solicitud.</p>}
    {events && <><div className="activity-head"><h3>Última actividad</h3><span className="badge">SQS + Worker</span></div><ol className="activities">{activities.slice(0,6).map(activity => <li key={activity.event_id}><strong>{requests.find(row => row.id === activity.request_id)?.title || activity.request_id.slice(0,8)}</strong> · Procesada por el worker.</li>)}{!activities.length && <li>La actividad aparecerá cuando el worker procese una solicitud.</li>}</ol></>}
    </section></div></>}
    </main><footer><span>Luma es una aplicación de referencia. Adapta las vistas y reglas a tu proyecto.</span><a href="https://danieljsaldana.dev/" rel="author">Daniel J. Saldaña ↗</a></footer>
  </>;
}
