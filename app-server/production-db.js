"use strict";

import {
  getMysqlConnection,
  sendQuery,
  toSingleEntity,
  toListOfEntities,
  toAffectedRows,
  toInsertId,
} from './db-utils';

import Person from './person-db';

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

export class Production {
  static getByShowId(id, connection) {
    var query = `
      select 
        sh.id show_id,
        sh.name show_name,
        sh.show_notes,
        so.order staging_order,
        st.name staging_name,
        st.staging_notes,
        sc.id script_id,
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
    `;

    return sendQuery(query, [id], connection)
      .then(toSingleEntity.bind(null, Production._fromRecord));
  }

  static getListByProducingOrgId(orgId, connection) {
    var query = `
        select 
          sh.id show_id,
          sh.name show_name,
          sh.show_notes,
          so.order staging_order,
          st.name staging_name,
          st.staging_notes,
          sc.id script_id,
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
                 staging_notes, script_id, script_name, synopsis
        order by closing desc
      `;
    return sendQuery(query, [orgId], connection)
      .then(Production._getListHelper_formatResults);
  }

  static _getListHelper_formatResults(results) {
    var upcomingProductions = [], 
        pastProductions = [], 
        production, 
        now = Date.now();

    for (var i = 0; i < results.length; i++) {
      production = Production._fromRecord(results[i]);

      if (production.closing > now) upcomingProductions.push(production);
      else pastProductions.push(production);
    }

    return {upcomingProductions, pastProductions};
  }

  static create(input, connection) {
    return Promise.all([
      Production._createHelper_insertShow(input.orgId, connection),
      Production._createHelper_insertStaging(input, connection),
      !input.isScripted ? null : Production._createHelper_insertScript(input, connection)
    ]).then(
      ([showId, stagingId, scriptId]) =>
        Promise.all([
          showId,
          Production._createHelper_createShowOrderWithStaging(showId, stagingId, connection),
          Production._createHelper_addShowingDate(showId, input.opening, connection),
          input.isSingleEvent   ? null : Production._createHelper_addShowingDate(showId, input.closing, connection),
          !scriptId             ? null : Production._createHelper_makeStagingScripted(stagingId, scriptId, connection),
          !input.spaceId        ? null : Production._createHelper_setPerformanceSpaceForShow(showId, input.spaceId, connection),
          !input.directorId     ? null : Production._createHelper_setDirector(input.directorId, stagingId, connection),
          !input.stageManagerId ? null : Production._createHelper_setStageManager(input.stageManagerId, stagingId, connection)
        ]).then(([showId]) => showId)
    );
  }

  static _createHelper_insertShow(orgId, connection) {
    var query = "insert into \`show\` (producer_id) values (?)";
    return sendQuery(query, [orgId], connection)
      .then(toInsertId);
  }

  static _createHelper_insertStaging(input, connection) {
    var query = "insert into staging (name, staging_notes) values (?, ?)";
    var name = input.isScripted ? null : input.stagingTitle;
    var description = input.isScripted ? null : input.description;
    return sendQuery(query, [name, description], connection)
      .then(toInsertId);
  }

  static _createHelper_insertScript(input, connection) {
    var query = "insert into script (name, synopsis) values (?, ?)";
    return sendQuery(query, [input.scriptTitle, input.synopsis], connection)
      .then(toInsertId);
  }

  static _createHelper_createShowOrderWithStaging(showId, stagingId, connection) {
    var query = "insert into show_order (show_id, staging_id, `order`) values (?, ?, ?)";
    return sendQuery(query, [showId, stagingId, 1], connection)
      .then(toInsertId);
  }

  // "date" is a timestamp using milliseconds.
  static _createHelper_addShowingDate(showId, date, connection) {
    var query = "insert into scheduled_showing (show_id, showtime) values (?, from_unixtime(?))";
    var dateInSeconds = Math.floor(date / 1000);
    return sendQuery(query, [showId, dateInSeconds], connection)
      .then(toInsertId);
  }

  static _createHelper_makeStagingScripted(stagingId, scriptId, connection) {
    var query = "insert into staging_of_script (staging_id, script_id) values (?, ?)";
    return sendQuery(query, [stagingId, scriptId], connection)
      .then(toInsertId);
  }

  static _createHelper_setPerformanceSpaceForShow(showId, spaceId, connection) {
    var query = "insert into space_for_show (show_id, space_id) values (?, ?)";
    return sendQuery(query, [showId, spaceId], connection)
      .then(toInsertId);
  }

  static _createHelper_setDirector(personId, stagingId, connection) {
    return Person.addAsCollaborator(personId, stagingId, 3, connection);
  }

  static _createHelper_setStageManager(personId, stagingId, connection) {
    return Person.addAsCollaborator(personId, stagingId, 1, connection);
  }

  /*
   * Helper functions:
   */

  static _fromRecord(input) {
    var p = new Production();
    p.id = input.show_id;
    p.title = input.show_name || input.staging_name || input.script_name;
    p.description =  input.show_notes || input.staging_notes || input.synopsis;
    p.opening = input.opening;
    p.closing = input.closing;
    p.scriptId = input.script_id || null;
    p.directorId = input.director_id || null;
    p.stageManagerId = input.stage_manager_id || null;
    return p;
  }
}

/*
 * Scripts
 */

export class Script {
  static deleteById(id, connection) {
    var query = `
      delete from script
      where id = ?
    `;
    return sendQuery(query, [id], connection)
      .then(toAffectedRows);
  }
}
