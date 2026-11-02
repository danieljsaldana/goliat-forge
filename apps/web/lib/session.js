const tokenKey = 'forge:luma:access';
const pkceKey = 'forge:luma:pkce';
export function stored(key) { try { return JSON.parse(sessionStorage.getItem(key)); } catch { return null; } }
export function save(key, value) {
  try { if (value === null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, JSON.stringify(value)); }
  catch { throw Error('El navegador necesita almacenamiento de sesión para iniciar sesión de forma segura.'); }
}
export function accessToken() { const value = stored(tokenKey); return value?.expiresAt > Date.now() ? value.token : null; }
function encode(bytes) { return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
export async function login(config) {
  const verifier = encode(crypto.getRandomValues(new Uint8Array(48)));
  const challenge = encode(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  const state = crypto.randomUUID();
  save(pkceKey, { verifier, state, at: Date.now(), returnPath: location.pathname });
  const url = new URL('/oauth2/authorize', config.auth.domain);
  url.search = new URLSearchParams({client_id:config.auth.clientId,response_type:'code',scope:'openid email profile',redirect_uri:config.auth.redirectUri,state,code_challenge:challenge,code_challenge_method:'S256'});
  location.assign(url);
}
export async function callback(config) {
  const params = new URLSearchParams(location.search), pkce = stored(pkceKey);
  const code = params.get('code');
  const valid = !params.has('error') && code && pkce && params.get('state') === pkce.state && Date.now() - pkce.at >= 0 && Date.now() - pkce.at < 600000;
  const paths = Object.keys(config.portals).map(key => '/'+key+'/');
  history.replaceState(null, '', paths.includes(pkce?.returnPath) ? pkce.returnPath : paths[0]);
  save(pkceKey, null);
  if (!valid) throw Error('No se pudo validar el acceso. Vuelve a iniciar sesión.');
  const response = await fetch(new URL('/oauth2/token', config.auth.domain), {method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:config.auth.clientId,code,code_verifier:pkce.verifier,redirect_uri:config.auth.redirectUri}),signal:AbortSignal.timeout(10000),credentials:'omit',referrerPolicy:'no-referrer'});
  if (!response.ok) throw Error('No se pudo completar el acceso. Vuelve a intentarlo.');
  const token = await response.json();
  if (typeof token.access_token !== 'string' || !Number.isFinite(token.expires_in) || token.expires_in <= 0) throw Error('Respuesta de identidad inválida.');
  // Passwords and refresh tokens are never persisted. The API verifies access tokens.
  save(tokenKey, {token:token.access_token,expiresAt:Date.now()+token.expires_in*1000});
}
export function logout(config) {
  save(tokenKey, null);
  const url = new URL('/logout', config.auth.domain);
  url.search = new URLSearchParams({client_id:config.auth.clientId,logout_uri:location.origin+'/'});
  location.assign(url);
}
export async function api(config, path, options = {}) {
  const token = accessToken();
  const response = await fetch(config.apiBase + path, {...options,headers:{...(options.body ? {'Content-Type':'application/json'} : {}),...(token ? {Authorization:`Bearer ${token}`} : {})},cache:'no-store',signal:AbortSignal.timeout(12000)});
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 401) save(tokenKey, null);
    const error = Error(({unauthorized:'Tu sesión ha caducado. Inicia sesión de nuevo.',idempotency_conflict:'El identificador ya corresponde a otra solicitud. Cambia el formulario para crear una nueva.',invalid_title:'Revisa el título.',temporarily_unavailable:'El servicio no está disponible temporalmente. Puedes reintentar.'})[result.error] || 'No se pudo completar la operación.');
    error.status = response.status;
    throw error;
  }
  return result;
}
