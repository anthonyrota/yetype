FROM node:20-alpine AS base
WORKDIR /usr/src/app
COPY ./package.json .
COPY ./package-lock.json .
RUN npm ci
COPY . .
RUN npm run build-prod-api-server

FROM node:20-alpine
WORKDIR /usr/src/app
COPY --from=base /usr/src/app/docker-prod-output-server .
USER node
CMD ["node", "index.js"]
