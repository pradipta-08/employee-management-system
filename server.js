const path = require('path');
const express = require('express');
const routes = require('./src/routes');
const { notFound, errorHandler } = require('./src/errors');

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));

app.use('/api', routes);
app.use('/api', notFound);

app.use(express.static(path.join(__dirname, 'public')));

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Employee Manager running on http://localhost:${PORT}`);
  });
}

module.exports = app;
