const express = require('express');
var cors = require('cors');
const PORT =  process.env.PORT || 3000;

const app = express();
app.use(cors());

app.listen(port, () => {
  console.log(`Server is running on port ${port}.`);
});