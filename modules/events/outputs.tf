output "queue_url" {
  description = "Source queue URL for IAM-authenticated publishing."
  value       = aws_sqs_queue.requests.id
}

output "queue_arn" {
  description = "Source queue ARN for scoped IAM and Lambda polling."
  value       = aws_sqs_queue.requests.arn
}

output "dlq_url" {
  description = "Dead-letter queue URL for reviewed operations."
  value       = aws_sqs_queue.dlq.id
}

output "worker_role_arn" {
  description = "Worker role ARN used for DocumentDB IAM mapping."
  value       = aws_iam_role.worker.arn
}
