import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { SimpleJwksCache } from 'aws-jwt-verify/jwk';
import { createPrivateKeyFetcher } from './keys.mjs';
import { AppError } from '../shared/domain.mjs';
export function createAuthenticator({ userPoolId, clientId, region, keyFunctionArn, keyClient, verify } = {}) {
  const verifier = verify ? { verify } : CognitoJwtVerifier.create({ userPoolId, tokenUse: 'access', clientId }, keyFunctionArn ? { jwksCache: new SimpleJwksCache({ fetcher: createPrivateKeyFetcher({userPoolId,region,functionArn:keyFunctionArn,client:keyClient}) }) } : undefined);
  return async authorization => {
    if (typeof authorization !== 'string' || authorization.length > 10000) throw new AppError(401, 'unauthorized');
    const token = authorization.match(/^Bearer (\S+)$/i)?.[1];
    if (!token) throw new AppError(401, 'unauthorized');
    try {
      const claims = await verifier.verify(token);
      if (typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 128) throw Error('invalid_subject');
      return { sub: claims.sub, operator: Array.isArray(claims['cognito:groups']) && claims['cognito:groups'].includes('Operators') };
    } catch (error) { if(error instanceof AppError && error.status===503)throw error; throw new AppError(401, 'unauthorized'); }
  };
}
export function assertDemoAllowed(environment, host) {
  if (host !== '127.0.0.1' || environment.AWS_EXECUTION_ENV || environment.ECS_CONTAINER_METADATA_URI || environment.ECS_CONTAINER_METADATA_URI_V4 || environment.NODE_ENV === 'production') throw Error('demo_mode_is_local_only');
}
