export function createKeyRelay({ poolId, region, fetcher = fetch }) {
  if (!/^[a-z]{2}-[a-z0-9-]+_[A-Za-z0-9]+$/.test(poolId) || !/^[a-z]{2}-[a-z0-9-]+-\d$/.test(region) || !poolId.startsWith(region + '_')) throw Error('invalid_identity_configuration');
  return async event => {
    const prefix = event?.issuerType === 'updated' ? 'issuer-cognito-idp' : 'cognito-idp';
    const response = await fetcher(`https://${prefix}.${region}.amazonaws.com/${poolId}/.well-known/jwks.json`, { signal: AbortSignal.timeout(4000), redirect: 'error' });
    if (!response.ok) throw Error('identity_keys_unavailable');
    const value = await response.json();
    if (!Array.isArray(value.keys) || !value.keys.length || value.keys.length > 10 || value.keys.some(key => key.kty !== 'RSA' || typeof key.kid !== 'string' || typeof key.n !== 'string' || typeof key.e !== 'string' || key.d)) throw Error('invalid_public_keys');
    return value;
  };
}
export async function handler(event) { return createKeyRelay({poolId:process.env.COGNITO_USER_POOL_ID,region:process.env.AWS_REGION})(event); }
