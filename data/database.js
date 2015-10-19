"use strict";

import mysql from "mysql";
import config from "../config/config.json";

function getMysqlConnection() {
  var connection = mysql.createConnection({
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.databaseName
  });
  connection.connect();
  return connection;
}

class Api {
  static get() {
    var api = new Api();
    api.id = 1;
    return api;
  }
}

/* User System
    1. Users have a 1-1 relationship with Persons. A user is how accounts 
       and activity are managed, whereas a Person is a conceptual human being
       that may be referred to even if that particular real life person does
       not have a user account established in the system. 
    2. The system will try to create linkages where possible with existing 
       Persons when a person is attempting to establish an account and where
       they have already been referred to in other data (being cast in a role
       in a production that is known to the system, for example). In order to
       claim an account, the user must provide some form of contact information
       so that an admin is able to reach out to them in the case of invalid
       claiming of an account. All claimed Persons will be marked as such in
       order to aid in tracking down issues related to improper claiming of
       Persons.
    3. Users have three levels: Global Admin, Org Admin, and Participant.
       Technically, there is some conceptual muddiness with Participants.
       Participant includes users who participate in *creating* theatre events
       as well as audience members who merely are engaged in *attending* theatre
       events. Anyone can attend events, obviously. But the way the permissions
       are modelled, anyone could also begin to participate in creating events.
       All that would change is that the user would assign or be assigned to
       one or more collaborator roles.
 */

class User {

  /* 
   * API methods:
   */

  static getById(id) {
    return new Promise((resolve, reject) => {
      var connection = getMysqlConnection();
      connection.query("select * from user where id = ?", [id], (err, results) => {
        if (err) {
          reject(err);
        } else {
          if (results.length) {
            var user = User._userRecordToObject(results[0]);
            resolve(user);
          } else {
            resolve(null);
          }
        }
        connection.destroy();
      });
    });
  }
  static getUserAndPasswordByEmail(email) {
    return new Promise((resolve, reject) => {
      var connection = getMysqlConnection();
      connection.query("select * from user where lower(email) = ?", [email.toLowerCase()], 
        (err, results) => {
          if (err) {
            reject(err);
          } else {
            if (results.length) {
              var user = User._userRecordToObject(results[0]);
              var password = results[0].password;
              resolve({user, password});
            } else {
              resolve(null);
            }
          }
          connection.destroy();
        });
    });
  }
  static create(inputUser) {
    return new Promise((resolve, reject) => {
      var {email, password} = inputUser;

      var insertQuery = "insert into user (email, password) values (?, ?)";
      var selectQuery = "select * from user u where u.id = ?";

      var connection = getMysqlConnection();
      connection.query(insertQuery, [email, password], (insertErr, insertResult) => {
        if (insertErr) {
          reject(insertErr);
          connection.destroy();
        } else {
          var id = insertResult.insertId;
          connection.query(selectQuery, [id], (selectErr, selectResults) => {
            if (selectErr) {
              reject(selectErr);
            } else {
              var user = User._userRecordToObject(selectResults[0]);
              resolve(user);
            }
            connection.destroy();
          });
        }
      });
    });
  }

  /*
   * Helper functions:
   */

  static _userRecordToObject(user) {
    if (user === null) return null;

    var u = new User();
    u.id = user.id;
    u.email = user.email;
    return u;
  }
}

module.exports = {
  Api,
  User
};
