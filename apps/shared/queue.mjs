import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
export function createSender(queueURL, client = new SQSClient({})) {
  return async event => {
    if (!queueURL) throw Error('event_processing_disabled');
    await client.send(new SendMessageCommand({ QueueUrl: queueURL, MessageBody: JSON.stringify(event) }));
  };
}
