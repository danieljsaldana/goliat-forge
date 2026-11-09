FROM node:26-alpine@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216
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
