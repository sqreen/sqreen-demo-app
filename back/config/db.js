const Path = require("path");
const sqlite3 = require("sqlite3");

const fs = require("fs");

const dbPath = Path.join(__dirname, "./sqreen-shop-db");

if (!fs.existsSync(dbPath)) {
  require("./init-db");
}

const db = new sqlite3.Database(dbPath);

module.exports = db;
