FROM node:24-alpine@sha256:8a32c8cf649a49915a66e81e7a609223c708d0adabf288ee3f4077d765542f85
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
