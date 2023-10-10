FROM node:20-alpine AS base
WORKDIR /usr/src/app
COPY ./package.json .
COPY ./package-lock.json .
RUN npm ci
COPY . .
RUN npm run build-prod-static-files

FROM caddy:2.7.4-alpine
WORKDIR /usr/src/app
COPY --from=base /usr/src/app/docker-prod-output-static ./public
COPY ./Caddyfile /etc/caddy/Caddyfile
