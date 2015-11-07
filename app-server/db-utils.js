"use strict";

import mysql from "mysql";
import config from "../config/config.json";

export function getMysqlConnection() {
  var connection = mysql.createConnection({
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.databaseName
  });
  connection.connect();
  return connection;
}

export function sendQuery(query, args, connection) {
  var conn = connection || getMysqlConnection();

  return new Promise((resolve, reject) => {
    conn.query(query, args, (err, results) => {
      if (err) {
        reject(err);
        if (!connection) conn.destroy();
      } else {
        resolve(results);
        if (!connection) conn.destroy();
      }
    });
  });
}

export function toSingleEntity(transform, results) {
  if (results.length) {
    return transform(results[0]);
  } else {
    return null;
  }
}

export function toListOfEntities(transform, results) {
  return results.map(transform);
}

export function toAffectedRows(results) {
  return results.affectedRows;
}

export function toInsertId(results) {
  return results.insertId;
}
