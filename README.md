# YeType

## Development instructions

To develop or host this you need node and docker installed. You will also need to set up a [SendGrid](https://sendgrid.com/) account and get the API key. You can set up a free account with 100 emails / day. You will need to change `noreply@yetype.com` in the code to whatever domain you want to use and set up your dns with SendGrid.

### Local development

#### Development env files

You will first need to set up the development env files in the env folder. Create `development.env` and `development-postgres.env`. There are example env files with the required variables in the env folder. You can generate random authentication keys in node using `require('crypto').randomBytes(64).toString('hex')`.

Examples of env files:

##### development.env
```
POSTGRES_HOST=localhost
AUTHENTICATION_AES_SECRET_KEY=kfe291kmae...
AUTHENTICATION_AES_SECRET_IV=amfjeiks2l...
AUTHENTICATION_VERIFICATION_SECRET_KEY=anfie2pmnw...
SG_API_KEY=SG.adwJN2kawk...
```

##### development-postgres.env
```
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
```

#### Development database

Locally set up a development postgres database using

```bash
$ docker compose -f docker-compose-dev.yml
```

The sql set up file is located at [./init.sql](init.sql). The database is accessible at `localhost:5432`. The api server code that connects to the database is located at [./src/server/db.ts](src/server/db.ts).

#### Development server

Locally running the application has two parts: building the client static files, and building/running the server files. The former is done with `npm run dev-client` and the latter is done using `npm run dev-server`. They will watch your changes automatically with webpack watch and nodemon.

### Locally running the production environment

#### Local production env files:

You will first need to set up the production env files in the env folder. Create `production.env`, `production-postgres.env` and `server.env`. There are example env files with the required variables in the env folder. You can generate random authentication keys in node using `require('crypto').randomBytes(64).toString('hex')`.

Examples of env files:

##### production.env
```
NODE_ENV=production
POSTGRES_HOST=database
AUTHENTICATION_AES_SECRET_KEY=kfe291kmae...
AUTHENTICATION_AES_SECRET_IV=amfjeiks2l...
AUTHENTICATION_VERIFICATION_SECRET_KEY=anfie2pmnw...
SG_API_KEY=SG.adwJN2kawk...
```

##### production-postgres.env
```
POSTGRES_USER=postgres
POSTGRES_PASSWORD=len242jnwm...
```

##### server.env
```
yetype.localhost
```

The application is run using docker compose, where the compose file is at [docker-compose-prod-example.yml](./docker-compose-prod-example.yml). To run the production environment locally, you will need to first build the docker images. Do this by running the commands

```bash
$ docker build -t yetype-api -f api.dockerfile .
$ docker build -t yetype-server -f server.dockerfile .
```

This will create docker images named `yetype-api` and `yetype-server`. By default the example production compose file points to images with those names.

`yetype-api` is a docker image running the node server, which handles api requests. The `yetype-server` is a docker image running the caddy server. The caddy server serves the static frontend files, and reverse proxies to the node server for api requests.

To run the application, use the command

```bash
$ docker compose -f docker-compose-prod-example.yml up
```

### Deploying to production

The application can be run on a VPS. SSH into the server and make sure docker and docker compose are installed. DO NOT clone the git repo. Create a folder `yetype` and copy [./docker-compose-prod-example.yml](docker-compose-prod-example.yml) to `yetype/docker-compose.yml`. Change the `node` and `caddy` services to point to the docker images in a registry (e.g. `image: ghcr.io/anthonyrota/yetype-api:main`). Create an `env` folder at `yetype/env` and create `yetype/env/production.env`, `yetype/env/production-postgres.env` and `yetype/env/server.env` like in [Local production env files](#local-production-env-files), except change `server.env` to point to your actual domain name (make sure your nameservers are pointed to the VPS). Then you need to copy the [./init.sql](init.sql) file into `yetype/init.sql`. You're file structure should look like this

```
yetype/
  init.sql
  docker-compose.yml
  env/
    production.env
    production-postgres.env
    server.env
```

 Then you can run the containers in the background using `docker compose`.

```bash
docker compose up -d
```

Caddy will handle automatic HTTPS and certificate handling for you.

## TODO

- [ ] Cron job to clean up database.
- [ ] Database indexes.
- [ ] Offline/mobile.
