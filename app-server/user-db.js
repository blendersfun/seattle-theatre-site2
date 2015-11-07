"use strict";

import {
  getMysqlConnection,
  sendQuery,
  toSingleEntity,
  toListOfEntities,
  toAffectedRows,
  toInsertId,
} from './db-utils';

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

export default class User {

  static getById(id, connection) {
    var query = `
      select u.*, 
             up.access_level 
      from user u
        inner join user_permissions up on u.id = up.user_id
      where u.id = ?
    `;
    return sendQuery(query, [id], connection)
      .then(toSingleEntity.bind(null, User._fromRecord));
  }

  static getIdAndPasswordByEmail(email, connection) {
    var query = `
      select u.id, 
             u.password
      from user u
      where lower(email) = ?
    `;
    return sendQuery(query, [email], connection)
      .then(toSingleEntity.bind(null, record => ({password: record.password, id: record.id})));
  }

  static create(input, connection) {
    var query = "insert into user (email, password) values (?, ?)";
    return sendQuery(query, [input.email, input.password], connection)
      .then(toInsertId)
      .then(userId => User._createHelper_addInitialPermissions(userId, connection))
      .then(userId => User.getById(userId, connection));
  }

  static _createHelper_addInitialPermissions(userId, connection) {
    var query = "insert into user_permissions (user_id, access_level) values (?, 'PARTICIPANT')";
    return sendQuery(query, [userId], connection)
      .then(() => userId);
  }

  static setPermissionLevel(userId, level, connection) {
    var query = `
      update user_permissions 
         set access_level = ?
      where user_id = ?
    `;
    return sendQuery(query, [level, userId], connection)
      .then(toAffectedRows);
  }

  static deleteById(id, connection) {
    var query = "delete from user where id = ?";
    return sendQuery(query, [id], connection)
      .then(toAffectedRows);
  }

  static _fromRecord(user) {
    if (user === null) return null;

    var u = new User();
    u.id = user.id;
    u.email = user.email;
    u.accessLevel = user.access_level;
    return u;
  }
}
