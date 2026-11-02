import { AppError } from '../shared/domain.mjs';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
export function createPrivateKeyFetcher({ userPoolId, region, functionArn, client = new LambdaClient({}) }) {
  const issuers = new Map([
    [`https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`, 'regional'],
    [`https://issuer-cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`, 'updated'],
  ]);
  return { async fetch(uri) {
    if (!issuers.has(uri)) throw Error('unexpected_identity_issuer');
    const response = await client.send(new InvokeCommand({FunctionName:functionArn,InvocationType:'RequestResponse',Payload:Buffer.from(JSON.stringify({issuerType:issuers.get(uri)}))}), {abortSignal:AbortSignal.timeout(7000)}).catch(()=>{throw new AppError(503,'identity_unavailable');});
    if (response.FunctionError || !response.Payload) throw new AppError(503,'identity_unavailable');
    return Uint8Array.from(response.Payload).buffer;
  } };
}
