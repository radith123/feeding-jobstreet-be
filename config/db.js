const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME, 
    process.env.DB_USER, 
    process.env.DB_PASSWORD, {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialect: 'postgres',
    }
);

sequelize.authenticate()
    .then(() => {
        console.log('DB Connection success');
    })
    .catch((error) =>{
        console.log('Unable to connect DB : ', error);
    });

module.exports = sequelize;