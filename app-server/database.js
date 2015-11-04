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





/*
 * Producing Organizations
 */

class ProducingOrg {
  static getAll() {
    return new Promise((resolve, reject) => {
      var connection = getMysqlConnection();
      connection.query("select * from producing_org order by name", [], (err, results) => {
        if (err) {
          reject(err);
        } else {
          if (results.length) {
            resolve(results.map(ProducingOrg._producingOrgRecordToObject));
          } else {
            resolve(null);
          }
        }
        connection.destroy();
      });
    });
  }
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







/*
 * Productions
 *  The production model is somewhat complex for the sake of supporting
 *  a variety of use cases. Examples of use cases:
 *    1. (simplest, most common:) Strawberry Theatre Workshop produces Our Town
 *    2. Freehold Theatre produces a solo performance festival comprising 11 short pieces
 *    3. Unexpected Productions produces a long-form improvised play in the style of Clive Barker
 *    4. Spectrum Dance Theatre produces 'Love', a dance piece which meditates on the complexities of human intimacy
 *  In other words:
 *    1. A show may or may not have a script.
 *    2. A show may comprise a single staging (scripted or unscripted) or be a collection of pieces.
 *
 *  The design:
 *    - There is no "production" record in the db. The closest thing is "show".
 *    - A "show" may contain multiple pieces, called "stagings"
 *    - Each staging may have a script, or be unscripted.
 *
 *  The name of a show, as it stands, is based on fallback logic:
 *    1. If the show has multiple stagings, use the show name.
 *    2. If the show is a single staging but has no script, use the staging name.
 *    3. If the show is a single staging and has a script, user the script name.
 */

class Production {
  static getByShowId(id) {
    return new Promise((resolve, reject) => {
      var connection = getMysqlConnection();
      var query = `
        select 
            sh.id show_id,
            sh.name show_name,
            sh.show_notes,
            so.order staging_order,
            st.name staging_name,
            st.staging_notes,
            sc.name script_name,
            sc.synopsis,
            min(ss.showtime) opening,
            max(ss.showtime) closing
        from \`show\` sh
          inner join show_order so         on sh.id = so.show_id
          inner join staging st            on st.id = so.staging_id 
          left join  scheduled_showing ss  on sh.id = ss.show_id 
          left join  staging_of_script sos on st.id = sos.staging_id
          left join  script sc             on sc.id = sos.script_id
        where sh.id = ?
        group by show_id
      `;
      connection.query(query, [id], (err, results) => {
        if (err) {
          reject(err);
        } else {
          if (results.length) {
            var production = Production._productionFromQueryResult(results[0]);
            resolve(production);
          } else {
            resolve(null);
          }
        }
        connection.destroy();
      });
    });
  }
  static getListByProducingOrgId(orgId) {
    return new Promise((resolve, reject) => {
      var connection = getMysqlConnection();
      var query = `
        select 
            sh.id show_id,
            sh.name show_name,
            sh.show_notes,
            so.order staging_order,
            st.name staging_name,
            st.staging_notes,
            sc.name script_name,
            sc.synopsis,
            min(ss.showtime) opening,
            max(ss.showtime) closing
        from producing_org p
          inner join \`show\` sh             on p.id = sh.producer_id
          inner join   show_order so         on sh.id = so.show_id
          inner join   staging st            on st.id = so.staging_id 
          left join    scheduled_showing ss  on sh.id = ss.show_id 
          left join    staging_of_script sos on st.id = sos.staging_id
          left join    script sc             on sc.id = sos.script_id
        where p.id = ?
        group by show_id, show_name, show_notes, staging_order, 
                 staging_notes, script_name, synopsis
        order by closing desc
      `;

      connection.query(query, [orgId], (err, results) => {
        if (err) {
          reject(err);
        } else {
          var upcomingProductions = [], pastProductions = [], production, now = Date.now();
          for (var i = 0; i < results.length; i++) {
            production = Production._productionFromOrgInfoAndDatesResults(results[i]);
            if (production.closing > now) {
              upcomingProductions.push(production);
            } else {
              pastProductions.push(production);
            }
          }
          resolve({upcomingProductions, pastProductions});
          connection.destroy();
        }
      });
    });
  }
  static create(inputProduction) {
    return new Promise((resolve, reject) => {
      var conn = getMysqlConnection();

      var {
        orgId,
        isScripted,
        isSingleEvent,
        opening,
        closing,
        spaceId,
      } = inputProduction;

      var promises1 = [];
      promises1.push(this._createHelper_insertShow(conn, orgId));
      promises1.push(this._createHelper_insertStaging(conn, inputProduction));

      if (isScripted) {
        promises1.push(this._createHelper_insertScript(conn, inputProduction));
      }

      Promise.all(promises1).then(
        ([showId, stagingId, scriptId]) => {
          var promises2 = [];
          promises2.push(this._createHelper_createShowOrderWithStaging(conn, showId, stagingId));
          promises2.push(this._createHelper_addShowingDate(conn, showId, opening));

          if (!isSingleEvent) {
            promises2.push(this._createHelper_addShowingDate(conn, showId, closing));
          }
          if (scriptId) {
            promises2.push(this._createHelper_makeStagingScripted(conn, stagingId, scriptId));
          }
          if (spaceId) {
            promises2.push(this._createHelper_setPerformanceSpaceForShow(conn, showId, spaceId));
          }

          Promise.all(promises2).then(
            () => {
              resolve({showId});
              conn.destroy();
            }
          ).catch(
            reason => {
              reject(reason);
              conn.destroy();
            }
          );
        }
      ).catch(
        reason => {
          reject(reason);
          conn.destroy();
        }
      );

    });
  }
  static _createHelper_insertShow(conn, orgId) {
    return new Promise((resolve, reject) => {
      var query = "insert into `show` (producer_id) values (?)";
      conn.query(query, [orgId], (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result.insertId);
        }
      });
    });
  }
  static _createHelper_insertStaging(conn, inputProduction) {
    return new Promise((resolve, reject) => {
      var query, params;
      if (inputProduction.isScripted) {
        query = "insert into staging () values ()";
        params = [];
      } else {
        var {stagingTitle, description} = inputProduction;
        query = "insert into staging (name, staging_notes) values (?, ?)";
        params = [stagingTitle, description];
      }
      conn.query(query, params, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result.insertId);
        }
      });
    });
  }
  static _createHelper_insertScript(conn, inputProduction) {
    return new Promise((resolve, reject) => {
      var {scriptTitle, synopsis} = inputProduction;
      var query = "insert into script (name, synopsis) values (?, ?)";
      conn.query(query, [scriptTitle, synopsis], (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result.insertId);
        }
      });
    });
  }
  static _createHelper_createShowOrderWithStaging(conn, showId, stagingId) {
    return new Promise((resolve, reject) => {
      var query = "insert into show_order (show_id, staging_id, `order`) values (?, ?, ?)";
      conn.query(query, [showId, stagingId, 1], (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result.insertId);
        }
      });
    });
  }
  // "date" is a timestamp using milliseconds.
  static _createHelper_addShowingDate(conn, showId, date) {
    return new Promise((resolve, reject) => {
      var dateInSeconds = Math.floor(date / 1000);
      var query = "insert into scheduled_showing (show_id, showtime) VALUES (?, FROM_UNIXTIME(?))";
      conn.query(query, [showId, dateInSeconds], (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result.insertId);
        }
      });
    });
  }
  static _createHelper_makeStagingScripted(conn, stagingId, scriptId) {
    return new Promise((resolve, reject) => {
      var query = "insert into staging_of_script (staging_id, script_id) values (?, ?)";
      conn.query(query, [stagingId, scriptId], (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result.insertId);
        }
      });
    });
  }
  static _createHelper_setPerformanceSpaceForShow(conn, showId, spaceId) {
    return new Promise((resolve, reject) => {
      var query = "insert into space_for_show (show_id, space_id) values (?, ?)";
      conn.query(query, [showId, spaceId], (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result.insertId);
        }
      });
    });
  }

  /*
   * Helper functions:
   */

  static _productionFromOrgInfoAndDatesResults(input) {
    var p = new Production();
    p.id = input.show_id;
    p.title = input.show_name || input.staging_name || input.script_name;
    p.description =  input.show_notes || input.staging_notes || input.synopsis;
    p.opening = input.opening;
    p.closing = input.closing;
    return p;
  }
}










/*
 * Venues
 */

class Venue {
  static getById(id) {
    return new Promise((resolve, reject) => {
      var connection = getMysqlConnection();
      var query = `
        select * from venue v, address a 
        where v.address_id = a.id
        and v.id = ?
      `;
      connection.query(query, [id], (err, results) => {
        if (err) {
          reject(err);
        } else if (results.length) {
          resolve(Venue._venueRecordToObject(results[0]));
        } else {
          resolve(null);
        }
        connection.destroy();
      });
    });
  }
  static getBySpaceId(spaceId) {
    return new Promise((resolve, reject) => {
      var connection = getMysqlConnection();
      var query = `
        select v.*, a.* 
        from performance_space ps,
             venue v, 
             address a
        where ps.id = ? 
          and v.id = ps.venue_id
          and v.address_id = a.id
      `;
      connection.query(query, [spaceId], (err, results) => {
        if (err) {
          reject(err);
        } else if (results.length) {
          resolve(Venue._venueRecordToObject(results[0]));
        } else {
          resolve(null);
        }
        connection.destroy();
      });
    });
  }
  static getAll() {
    return new Promise((resolve, reject) => {
      var connection = getMysqlConnection();
      var query = `
        select * from venue v, address a 
        where v.address_id = a.id
        order by v.name
      `;
      connection.query(query, [], (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results.map(Venue._venueRecordToObject));
        }
        connection.destroy();
      });
    });
  }

  static _venueRecordToObject(input) {
    var venue = new Venue();
    venue.id = input.id;
    venue.name = input.name;
    venue.addressLine1 = input.line1;
    venue.addressLine2 = input.line2;
    venue.city = input.city;
    venue.state = input.state;
    venue.zip = input.zip;
    venue.lat = input.lat;
    venue.lng = input.lng;
    return venue;
  }
}

class PerformanceSpace {
  static getById(spaceId) {
    return new Promise((resolve, reject) => {
      var connection = getMysqlConnection();
      var query = `
        select * 
        from performance_space ps 
        where ps.id = ?
      `;
      connection.query(query, [spaceId], (err, results) => {
        if (err) {
          reject(err);
        } else if (results.length) {
          resolve(PerformanceSpace._performanceSpaceRecordToObject(results[0]));
        } else {
          resolve(null);
        }
        connection.destroy();
      });
    });
  }
  static getByShowId(showId) {
    return new Promise((resolve, reject) => {
      var connection = getMysqlConnection();
      var query = `
        select ps.* 
        from \`show\` sh, 
               space_for_show sfs,
               performance_space ps 
        where sh.id = ?
          and sh.id = sfs.show_id
          and ps.id = sfs.space_id 
      `;
      connection.query(query, [showId], (err, results) => {
        if (err) {
          reject(err);
        } else if (results.length) {
          resolve(PerformanceSpace._performanceSpaceRecordToObject(results[0]));
        } else {
          resolve(null);
        }
        connection.destroy();
      });
    });
  }
  static getListByVenueId(venueId) {
    return new Promise((resolve, reject) => {
      var connection = getMysqlConnection();
      var query = `
        select * 
        from venue v, performance_space ps 
        where v.id = ps.venue_id
          and v.id = ?
        order by ps.name
      `;
      connection.query(query, [venueId], (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results.map(PerformanceSpace._performanceSpaceRecordToObject));
        }
        connection.destroy();
      });
    });
  }

  static _performanceSpaceRecordToObject(input) {
    var space = new PerformanceSpace();
    space.id = input.id;
    space.name = input.name;
    space.capacity = input.seat_count;
    space.style = null;
    space.description = input.flavor_text;
    return space;
  }
}








module.exports = {
  Api,
  User,
  ProducingOrg,
  Production,
  Venue,
  PerformanceSpace,
};
