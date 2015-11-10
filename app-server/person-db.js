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
	static create(input, connection) {
	    var query = "insert into person (first_name, middle_name, last_name) values (?, ?, ?)";
	    
	    return sendQuery(query, [input.firstName, input.middleName || null, input.lastName], connection)
	      .then(toInsertId);
	}
	static addAsCollaborator(personId, stagingId, collaboratorRoleId, connection) {
		var query = "insert into collaborator_role_in_staging (collaborator_id, staging_id, role_id) values (?, ?, ?)";
		return sendQuery(query, [personId, stagingId, collaboratorRoleId], connection)
			.then(toInsertId);
	}
	static getCollaboratorWithShowAndRole(showId, collaboratorRoleId, connection) {
		var query = `
			select p.*
			from \`show\` sh
			  inner join show_order so                     on sh.id = so.show_id
			  inner join staging st                        on st.id = so.staging_id
			  inner join collaborator_role_in_staging cris on st.id = cris.staging_id
			                                                 and cris.role_id = ?
			  inner join person p                          on p.id = cris.collaborator_id
			where sh.id = ?
		`;
		return sendQuery(query, [collaboratorRoleId, showId], connection)
			.then(toSingleEntity.bind(null, Person._fromRecord));
	}
	static deleteById(id, connection) {
	    var query = `
	      delete from person
	      where id = ?
	    `;
	    return sendQuery(query, [id], connection)
	      .then(toAffectedRows);
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
