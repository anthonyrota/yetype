import fs from 'fs';
import path from 'path';
import url from 'url';
import express from 'express';
import { Route } from '../routes.js';
import { applyApiEndpoints, setAppConfig } from './shared.js';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
setAppConfig(app);

const publicFolderPath = path.join(__dirname, '..', '..', 'public');
const files = fs.readdirSync(publicFolderPath);
const jsFileName = files.find((file) => file.endsWith('.js'));
if (jsFileName === undefined) {
  throw new Error('No js file found.');
}
const jsFilePath = path.join(publicFolderPath, jsFileName);
const indexHtmlFilePath = path.join(publicFolderPath, 'index.html');

Object.values(Route).forEach((path) => {
  app.get(path, (_req, res) => {
    res.sendFile(indexHtmlFilePath);
  });
});
app.get(`/${jsFileName}`, (_req, res) => {
  res.sendFile(jsFilePath);
});
app.get('*', (_req, res) => {
  res.status(404).sendFile(indexHtmlFilePath);
});

app.use(express.json());
applyApiEndpoints(app);

app.listen(3000);
