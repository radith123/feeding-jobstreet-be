const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { swaggerUi, swaggerSpec } = require('./config/swagger')
const jobRoutes = require('./routes/jobRoutes');

const app = express();
const port = process.env.PORT;

const corsOptions = {
    origin: 'http://localhost:5050', // Or '*'
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  };
app.use(cors(corsOptions));

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

app.use(express.json());
app.use('/job', jobRoutes);
app.use('/api', swaggerUi.serve, swaggerUi.setup(swaggerSpec));




