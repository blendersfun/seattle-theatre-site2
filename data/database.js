"use strict";

import mysql from "mysql";
import config from "../config/config.json";

// Model types
class Root {}
class ProducingOrg {}
class Person {}
class User {}
class UserInProgress {}
class Foo {}

function getFoo() {
    var foo = new Foo();
    foo.id = 1;
    foo.name = "Yar";
    return foo;
}

// Database interaction methods
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
function getRoot() {
  var root = new Root();
  root.id = 1;
  return root;
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
          reject('Error occurred executing mysql query: ' + err);
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

/* User System
    1. Users have a 1-1 relationship with Persons. A user is how accounts 
       and activity are managed, whereas a Person is a conceptual human being
       that may be referred to even if that particual real life person does
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
    3. Users have three levels: Global Admin, Org Admin, and Participant
       Technically, there is some conceptual muddiness with Participants.
       Participant includes users who participate in *creating* theatre events
       as well as audience members who merely are engaged in *attending* theatre
       events. Anyone can attend events, obviously. But the way the permissions
       are modelled, anyone could also begin to participate in creating events.
       All that would change is that the user would assign or be assigned to
       one or more collaborator roles.
 */

/* 
   Creates a user. 
   Looks for an existing Person for this user. 
    If found, returns the potentially matching person id.
    If not found, creates a Person and links to this user.
   Input params:
    - user: a CreatUserInput type
 */
function createUser(inputUser) {
  return new Promise((resolve, reject) => {
    var connection = getMysqlConnection();
    var userPromise = _insertUserIntoDB(inputUser, connection);
    var personPromise = _selectMatchingPersonFromDB(inputUser, connection);

    Promise.all([userPromise, personPromise]).then(allResolve => {
      var [user, person] = allResolve;
      var u = userRecordToObject(user);

      if (person === null) {
        _insertPersonIntoDB(inputUser, connection).then(
          person => {
            _linkUserToPerson(user.id, person.id, connection).then(
              result => {
                var p = personRecordToObject(person);
                u.person = p;
                p.user = u;
                resolve(u);
                connection.end();
              }
            ).catch(
              rejectReason => {
                reject('A problem was encountered creating the user: ' + rejectReason);
                connection.end();
              }
            );
          }
        ).catch(
          rejectReason => {
            reject('A problem was encountered creating the user: ' + rejectReason);
            connection.end();
          }
        );
      } else {
        var p = personRecordToObject(person);
        var obj = new UserInProgress();
        obj.user = u;
        obj.personMatch = p;
        resolve(obj);
        connection.end();
      }
    }).catch(someReject => {
      reject('A problem was encountered creating the user: ' + someReject);
      connection.end();
    });
  });
}

// Helper functions to "createUser()". 
// Not intended to be consumed elsewhere.

function _insertUserIntoDB(user, connection) {
  return new Promise((resolve, reject) => {
    var {email, password, phone} = user;
    if (!phone) {
      phone = null;
    }
    var insertQuery = "insert into user (email, password, phone) values (?, ?, ?)";
    var selectQuery = "select * from user u where u.id = ?";

    connection.query(insertQuery, [email, password, phone], (insertErr, insertResult) => {
      if (insertErr) {
        reject(insertErr);
      } else {
        var id = insertResult.insertId;
        connection.query(selectQuery, [id], (selectErr, selectResults) => {
          if (selectErr) {
            reject(selectErr);
          } else {
            resolve(selectResults[0]);
          }
        });
      }
    });
  });
}
function _selectMatchingPersonFromDB(user, connection) {
  return new Promise((resolve, reject) => {
    var {firstName, middleName, lastName} = user;
    firstName = firstName.toLowerCase();
    lastName = lastName.toLowerCase();
    middleName = middleName ? middleName.toLowerCase() : null;

    var query = 
      "select * from person p " +
      "where lower(p.first_name) = ? "
      "and lower(p.middle_name) = ? "
      "and lower(p.last_name) = ?";
    connection.query(query, [firstName, middleName, lastName], (err, results) => {
      if (err) {
        reject(err);
      } else {
        if (results.length === 0) {
          resolve(null);
        } else {
          resolve(results[0]);
        }
      }
    });
  });
}
function _insertPersonIntoDB(user, connection) {
  return new Promise((resolve, reject) => {
    var {firstName, middleName, lastName} = user;
    if (!middleName) {
      middleName = null;
    }
    var insertQuery = "insert into person (first_name, middle_name, last_name) values (?, ?, ?)";
    var selectQuery = "select * from person p where p.id = ?";

    connection.query(insertQuery, [firstName, middleName, lastName], (insertErr, insertResult) => {
      if (insertErr) {
        reject(insertErr);
      } else {
        var id = insertResult.insertId;
        connection.query(selectQuery, [id], (selectErr, selectResults) => {
          if (selectErr) {
            reject(selectErr);
          } else {
            resolve(selectResults[0]);
          }
        });
      }
    });
  });
}
function _linkUserToPerson(userId, personId, connection) {
  return new Promise((resolve, reject) => {
    var query = "insert into user_to_person (user_id, person_id) values (?, ?)";

    connection.query(query, [userId, personId], (err, result) => {
      if (err) {
        reject(err);
      } else {
        var id = result.insertId;
        resolve(id);
      }
    });
  });
}

function personRecordToObject(person) {
  if (person === null) return null;
  var p = new Person();
  p.id = person.id;
  p.firstName = person.first_name;
  p.lastName = person.last_name;
  if (person.middle_name) {
    p.middleName = person.middleName;
  }
  if (person.gender) {
    p.gender = person.gender;
  }
  if (person.in_actors_equity) {
    p.inActorsEquity;
  }
  return p;
}
function userRecordToObject(user) {
  if (user === null) return null;
  var u = new User();
  u.id = user.id;
  u.email = user.email;
  if (user.phone) {
    u.phone = user.phone
  }
  return u;
}

function getPerson(id) {
  return new Promise((resolve, reject) => {
    var connection = getMysqlConnection();
    connection.query("select * from person where id = ?", [id], 
      (err, results) => {
        if (err) {
          reject(err);
        } else {
          if (results.length) {
            var person = personRecordToObject(results[0]);
            _getUserForPerson(person.id).then(
              user => {
                person.user = user;
                resolve(person);
                connection.end();
              }
            ).catch(
              reason => {
                reject(reason);
                connection.end();
              }
            );
          } else {
            resolve(null);
            connection.end();
          }
        }
      });
  });
}
function _getUserForPerson(personId) {
  return new Promise((resolve, reject) => {
    var connection = getMysqlConnection();
    var query = "select u.* from user_to_person utp, user u " + 
                "where utp.person_id = ? " + 
                "and utp.user_id = u.id";
    connection.query(query, [personId], (err, results) => {
      if (err) {
        reject(err);
      } else {
        if (results.length) {
          var user = userRecordToObject(results[0]);
          resolve(user);
        } else {
          resolve(null);
        }
      }
    });
    connection.end();
  });
}
function getUser(id) {
  return new Promise((resolve, reject) => {
    var connection = getMysqlConnection();
    connection.query("select * from user where id = ?", [id], (err, results) => {
      if (err) {
        reject(err);
      } else {
        if (results.length) {
          var user = userRecordToObject(results[0]);
          _getPersonForUser(user.id).then(
            person => {
              user.person = person;
              resolve(user);
              connection.end();
            }
          ).catch(
            reason => {
              reject(reason);
              connection.end();
            }
          );
        } else {
          resolve(null); // User does not exist for this id.
          connection.end();
        }
      }
    });
  });
}
function _getPersonForUser(userId) {
  return new Promise((resolve, reject) => {
    var connection = getMysqlConnection();
    var query = "select p.* from user_to_person utp, person p " + 
                "where utp.user_id = ? " + 
                "and utp.person_id = p.id";
    connection.query(query, [userId], (err, results) => {
      if (err) {
        reject(err);
      } else {
        if (results.length) {
          var person = personRecordToObject(results[0]);
          resolve(person);
        } else {
          resolve(null);
        }
      }
    });
    connection.end();
  });
} 

module.exports = {
  Root,
  getRoot,

  ProducingOrg,
  getProducingOrgs,
  getProducingOrg,

  User,
  UserInProgress,
  Person,
  createUser,
  getPerson,
  getUser,

  Foo,
  getFoo
};
