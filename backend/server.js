const express = require('express');
const cors = require('cors');
const optimizerRoute = require('./routes/optimizer');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Expose POST /optimize-route directly
app.use('/', optimizerRoute);

app.listen(PORT, '0.0.0.0', () => {
    console.log(`RouteMaster Backend running on port ${PORT}`);
});
