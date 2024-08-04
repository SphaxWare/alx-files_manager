const express = require('express');

const app = express();
const port = process.env.PORT || 5000;
const routes = require('./routes/index');

app.use(express.json()); // Middleware to parse JSON request bodies
app.use(routes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
