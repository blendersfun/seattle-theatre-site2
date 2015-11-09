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
import ProducingOrg from './producing-org-db';
import {Production, Script} from './production-db';
import Person from './person-db';

class Api {
  static get() {
    var api = new Api();
    api.id = 1;
    return api;
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
  Person,
  ProducingOrg,
  Production,
  Script,
  Venue,
  PerformanceSpace,
};
