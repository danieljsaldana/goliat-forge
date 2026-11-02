FROM node:26-alpine@sha256:c6ad9e9c1d80f6eb607c26b4b0a132ff7a2344fad1c78ea3baa2a7d4c8de6d94
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund && addgroup -g 10001 forge && adduser -D -u 10001 -G forge forge
COPY LICENSE NOTICE ./
COPY apps/api ./apps/api
COPY apps/shared ./apps/shared
USER 10001:10001
EXPOSE 8080
CMD ["node", "apps/api/server.mjs"]
