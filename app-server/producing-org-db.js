"use strict";

import {
  getMysqlConnection,
  sendQuery,
  toSingleEntity,
  toListOfEntities,
  toAffectedRows,
  toInsertId,
} from './db-utils';

import User from './user-db';

/*
 * Producing Organizations
 */

export default class ProducingOrg {

  static getAll(connection) {
    var query = `
      select * 
      from producing_org 
      order by name
    `;
    return sendQuery(query, [], connection)
      .then(toListOfEntities.bind(null, ProducingOrg._fromRecord));
  }

  static getById(id, connection) {
    var query = `
      select * 
      from producing_org 
      where id = ?
    `;
    return sendQuery(query, [id], connection)
      .then(toSingleEntity.bind(null, ProducingOrg._fromRecord));
  }

  static getByOrgAdminUserId(userId, connection) {
    var query = `
      select po.* 
      from producing_org po
        inner join user_admins_org uag on po.id = uag.org_id
      where uag.user_id = ?
    `;
    return sendQuery(query, [userId], connection)
      .then(toSingleEntity.bind(null, ProducingOrg._fromRecord));
  }

  static create(input, connection) {
    var query = "insert into producing_org (name, mission_statement) values (?, ?)";
    
    return sendQuery(query, [input.name, input.missionStatement], connection)
      .then(toInsertId)
      .then(orgId => 
        Promise.all([
          User.setPermissionLevel(input.userId, 'ORG_ADMIN', connection),
          ProducingOrg._createHelper_linkAdminToOrg(input.userId, orgId, connection),
          orgId
        ])
      ).then(([rowCount, insertId, orgId]) => {
        return Promise.all([
          ProducingOrg.getById(orgId, connection),
          User.getById(input.userId, connection)
        ]);
      }).then(([producingOrg, user]) => ({producingOrg, user}));
  }

  static _createHelper_linkAdminToOrg(userId, orgId, connection) {
    var query = "insert into user_admins_org (user_id, org_id) values (?, ?)";
    return sendQuery(query, [userId, orgId], connection)
      .then(toInsertId);
  }

  static deleteById(id, connection) {
    var query = `
      delete from producing_org
      where id = ?
    `;
    return sendQuery(query, [id], connection)
      .then(toAffectedRows);
  }

  static _fromRecord(producingOrg) {
    if (producingOrg === null) return null;

    var p = new ProducingOrg();
    p.id = producingOrg.id;
    p.name = producingOrg.name;
    p.missionStatement = producingOrg.mission_statement;
    return p;
  }
}
