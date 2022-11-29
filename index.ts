import { Express } from 'express';
import ApiRoutes from './src/api.routes';
import config from './config';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const express = require('express');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cors = require('express-cors');

const app: Express = express();

app.use(
  cors({
    allowedOrigins: ['negre.co'],
  }),
);

app.use(`/${config.apiVersion}`, ApiRoutes);

app.get('*', (req, res) => {
  res.redirect(404, 'http://negre.co');
});

module.exports = app;
