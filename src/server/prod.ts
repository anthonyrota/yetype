import express from 'express';
import { applyApiEndpoints, setAppConfig } from './shared.js';

const app = express();
setAppConfig(app);

app.use(express.json());
applyApiEndpoints(app);

app.listen(3000, '0.0.0.0');
