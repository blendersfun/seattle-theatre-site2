"use strict";

import {
  getMysqlConnection,
  sendQuery,
  toSingleEntity,
  toListOfEntities,
  toAffectedRows,
  toInsertId,
} from './db-utils';

export default class Person {
	static getById(id, connection) {
		var query = `
		  select *
		  from person
		  where id = ? 
		`;
		return sendQuery(query, [id], connection)
			.then(toSingleEntity.bind(null, Person._fromRecord));
	}
	static search(terms, connection) {
		var sqlTerms = [];
		for (var i = 0; i < terms.length; i++) {
			var term = terms[i].toLowerCase();
			sqlTerms.push(`
			    (lower(first_name)  like '${term}%' or 
			     lower(middle_name) like '${term}%' or
			     lower(last_name)   like '${term}%')
			`);
		}
		var conditions = sqlTerms.join(' and ');
		var query = `
			select *
			from person
			where ${conditions}
			order by first_name, last_name, middle_name
		`;
		return sendQuery(query, [], connection)
			.then(toListOfEntities.bind(null, Person._fromRecord));
	}
	static _fromRecord(input) {
		return {
			id: input.id,
			firstName: input.first_name,
			middleName: input.middle_name,
			lastName: input.last_name
		};
	}
}
