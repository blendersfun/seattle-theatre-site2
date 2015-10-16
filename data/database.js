"use strict";

import mysql from "mysql";

// Model types
class Root {}
class ProducingOrg {
  constructor(name, missionStatement) {
    this.name = name;
    this.missionStatement = missionStatement;
  }
}

// Database interaction methods
function getMysqlConnection() {
  var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'seattle_theatre'
  });
  connection.connect();
  return connection;
}
function getRoot() {
  return new Promise((resolve, reject) => {
    var root = new Root();
    root.id = 1;
    getProducingOrgs().then(
      result => {
        root.producingOrgs = result;
        resolve(root);
      }, 
      rejectReason => reject('Failed to get producing orgs because: ' + rejectReason)
    );
  });
}
function getProducingOrgs() {
  return new Promise((resolve, reject) => {
    var connection = getMysqlConnection();
    var orgs = [];
    connection.query("select * from producing_org", (err, results) => {
      if (err) {
        reject('Error occurred executing mysql query: ' + err);
      } else {
        for (var i = 0; i < results.length; i++) {
          var org = new ProducingOrg();
          org.id = results[i].id;
          org.name = results[i].name;
          org.missionStatement = results[i].mission_statement;
          orgs.push(org);
        }
        resolve(orgs);
      }
    });
    connection.end();
  });
}
function getProducingOrg(id) {
  return new Promise((resolve, reject) => {
    var connection = getMysqlConnection();
    connection.query("select * from producing_org where id = ?", [id], 
      (err, results) => {
        if (err) {
          reject('Error occurred executing mysql query: ' + err)
        } else {
          var org = new ProducingOrg();
          org.id = results[0].id;
          org.name = results[0].name;
          org.missionStatement = results[0].mission_statement;
          resolve(org);
        }
      });
    connection.end();
  });
}

module.exports = {
  getRoot,
  getProducingOrgs,
  getProducingOrg,
  Root,
  ProducingOrg,
};
