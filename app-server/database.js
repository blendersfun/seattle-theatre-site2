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
      var query = `select u.*, up.access_level from user u, user_permissions up
                   where u.id = ? and u.id = up.user_id`;
      connection.query(query, [id], (err, results) => {
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
              resolve({});
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
      var addPermsQuery = "insert into user_permissions (user_id, access_level) values (?, 'PARTICIPANT')";

      var connection = getMysqlConnection();
      connection.query(insertQuery, [email, password], (insertErr, insertResult) => {
        if (insertErr) {
          if (insertErr.code === 'ER_DUP_ENTRY') {
            resolve({error: insertErr});
          } else {
            reject(insertErr);
          }
          connection.destroy();
        } else {
          var id = insertResult.insertId;
          connection.query(addPermsQuery, [id], (addPermsErr, addPermsResult) => {
            if (addPermsErr) {
              reject(addPermsErr);
              connection.destroy();
            } else {
              User.getById(id).then(user => {
                resolve({user});
                connection.destroy();
              }).catch(reason => {
                reject(reason);
                connection.destroy();
              });
            }
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
    u.accessLevel = user.access_level;
    return u;
  }
}

class ProducingOrg {
  static getById(id) {
    return new Promise((resolve, reject) => {
      var connection = getMysqlConnection();
      connection.query("select * from producing_org where id = ?", [id], (err, results) => {
        if (err) {
          reject(err);
        } else {
          if (results.length) {
            var producingOrg = ProducingOrg._producingOrgRecordToObject(results[0]);
            resolve(producingOrg);
          } else {
            resolve(null);
          }
        }
        connection.destroy();
      });
    });
  }
  static getByOrgAdminUserId(userId) {
    return new Promise((resolve, reject) => {
      var query = `select po.* from producing_org po, user_admins_org uag
                   where uag.user_id = ? and po.id = uag.org_id`;
      
      var connection = getMysqlConnection();
      connection.query(query, [userId], (err, results) => {
        if (err) {
          reject(err);
        } else {
          if (results.length) {
            var producingOrg = ProducingOrg._producingOrgRecordToObject(results[0]);
            resolve(producingOrg);
          } else {
            resolve(null);
          }
        }
        connection.destroy();
      });
    });
  }
  static create(inputOrg) {
    return new Promise((resolve, reject) => {
      var {userId, name, missionStatement} = inputOrg;

      var insertQuery = "insert into producing_org (name, mission_statement) values (?, ?)";

      var connection = getMysqlConnection();
      connection.query(insertQuery, [name, missionStatement], (insertErr, insertResult) => {
        if (insertErr) {
          if (insertErr.code === 'ER_DUP_ENTRY') {
            resolve({error: insertErr});
          } else {
            reject(insertErr);
          }
          connection.destroy();
        } else {
          var id = insertResult.insertId;

          var userPromise = ProducingOrg._createHelper_makeUserOrgAdminAndGetUser(userId, id);
          var orgPromise = ProducingOrg.getById(id);

          Promise.all([userPromise, orgPromise]).then(
            ([user, org]) => resolve({ user: user, producingOrg: org })
          ).catch(
            reason => reject(reason)
          );
        }
      });
    });
  }
  static _createHelper_makeUserOrgAdminAndGetUser(userId, id) {
    return new Promise((resolve, reject) => {
      var updatePermsQuery = "update user_permissions set access_level = 'ORG_ADMIN' where user_id = ?";
      var linkUserToOrgQuery = "insert into user_admins_org (user_id, org_id) values (?, ?)";

      var connection = getMysqlConnection();

      var permsPromise = new Promise((resolve, reject) => {
        connection.query(updatePermsQuery, [userId], (err, results) => {
          if (err) {
            reject(err);
          } else {
            resolve(true);
          }
        });
      });

      var linkPromise = new Promise((resolve, reject) => {
        connection.query(linkUserToOrgQuery, [userId, id], (err, results) => {
          if (err) {
            reject(err);
          } else {
            resolve(true);
          }
        });
      });

      Promise.all([permsPromise, linkPromise]).then(
        () => {
          User.getById(userId).then(user => {
            resolve(user);
            connection.destroy();
          }).catch(reason => {
            reject(reason);
            connection.destroy();
          });
        }
      ).catch(
        reason => {
          reject(reason);
          connection.destroy();
        }
      );
    });
  }

  /*
   * Helper functions:
   */

  static _producingOrgRecordToObject(producingOrg) {
    if (producingOrg === null) return null;

    var p = new ProducingOrg();
    p.id = producingOrg.id;
    p.name = producingOrg.name;
    p.missionStatement = producingOrg.mission_statement;
    return p;
  }
}

module.exports = {
  Api,
  User,
  ProducingOrg,
};
