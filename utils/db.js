// db.js
const { MongoClient } = require('mongodb');

const uri = "mongodb://192.168.68.79:27017"; // 替換為你的 MongoDB URI
const client = new MongoClient(uri);


module.exports = client;