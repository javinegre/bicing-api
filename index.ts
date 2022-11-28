import { Express } from 'express';
import ApiRoutes from './src/api.routes';

const express = require('express');
const path = require('path');
const cors = require('express-cors');

const app: Express = express();

app.use(
  cors({
    allowedOrigins: ['negre.co'],
  }),
);

app.use(express.static(path.join(__dirname, '/build')));

app.use('/api/v1.2', ApiRoutes);

app.get('*', (req, res) => {
  res.redirect(404, 'http://negre.co');
});

module.exports = app;
