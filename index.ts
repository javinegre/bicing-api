import { Express } from 'express';
import ApiRoutesV1_3 from './src/v1_3/api.routes';
import ApiRoutesV2 from './src/v2/api.routes';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const express = require('express');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cors = require('express-cors');

const app: Express = express();

app.use(
  cors({
    allowedOrigins: ['negre.co', '127.0.0.1:5173', 'localhost:5173'],
  }),
);

app.use('/v1.3', ApiRoutesV1_3);
app.use('/v2', ApiRoutesV2);

app.get('*', (req, res) => {
  res.redirect(404, 'http://negre.co');
});

module.exports = app;
