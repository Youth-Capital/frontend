# syntax=docker/dockerfile:1@sha256:4edf897a3ffa55b89f906fc8cc78afdb3f1834cc9c7083565e611a8a7d5fe99e
FROM node:24.21.0-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 AS build

WORKDIR /app
ENV CI=true

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

COPY tsconfig*.json vite.config.ts index.html ./
COPY scripts ./scripts
COPY src ./src
COPY public ./public
# The same-origin /api/v1 default is compiled in; no secrets or host-specific
# configuration belong in a browser bundle.
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.30.0-alpine@sha256:808f7846d21a9c94cf53833e8807a00a33fd0b65cc47fb05b79efe366c2d201f AS runtime

# The upstream image can lag Alpine security patches. Patch installed runtime
# packages before dropping privileges; CI rebuilds this stage without caching.
USER root
RUN apk upgrade --no-cache

COPY deploy/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html

USER 101:101
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1

# Bypass image setup scripts: configuration is already complete and the
# container can run with a read-only filesystem and a writable /tmp tmpfs.
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
