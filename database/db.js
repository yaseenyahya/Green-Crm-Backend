var fs = require('fs');
var path = require('path');
var Sequelize = require('sequelize');
var databaseConfig = require('../config/database.json');

const env = process.env.NODE_ENV || "development";

const config = databaseConfig[env];

const sequelize = new Sequelize(config.database, config.username, config.password, config);

const db = {};

fs
	.readdirSync(path.join(__dirname, 'models'))
//	.filter(function(file) {
	//	return (file.indexOf(".") !== 0) && (file !== "index.js");
//	})
	.forEach(function(file) {
		//let model = sequelize.import(path.join(__dirname, 'models', file));
		var model = require(path.join(__dirname, 'models', file))(sequelize, Sequelize)
		db[model.name] = model;
	});

Object.keys(db).forEach(function(modelName) {
	if ("associate" in db[modelName]) db[modelName].associate(db);
	
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db; 