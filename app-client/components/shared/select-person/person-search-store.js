"use strict";

import {Store} from 'flux/utils';
import dispatcher from '../../../utils/dispatcher';

class PersonSearchStore extends Store {
	state = {
		personSearch: [],
		query: ''
	}

	__onDispatch = (payload) => {
		if (payload && payload.results && payload.results.data && payload.results.data.api && payload.results.data.api.personSearch) {
			var data = payload.results.data.api.personSearch;
			this.state.personSearch = data;
			this.state.query = payload.query;
			this.__emitChange();
		}
	}

	getResults = () => {
		return JSON.parse(JSON.stringify(this.state.personSearch)); // Deep clone so as to prevent mutation of original.
	}
	getQuery = () => {
		return this.state.query;
	}

	/*
	 * Actions:
	 */

	formatQueryForServer = q => q.replace(/^\s*(.*?)\s*$/, '$1').replace(/\s+/g, ',')

	search(query) {
		return new Promise((resolve, reject) => {
			var req = {};
			req.query = `
				query PersonSearch { api {
					personSearch(query: "${this.formatQueryForServer(query)}") {
						id,
						firstName,
						lastName,
						middleName
					}
				} }
			`;
			req.variables = {};

			var xhr = new XMLHttpRequest();
			xhr.open('POST', '/graphql', true);
			xhr.setRequestHeader('content-type', 'application/json');
			xhr.send(JSON.stringify(req));
			xhr.addEventListener('load', e => {
				var results = JSON.parse(xhr.responseText);
				if (results.errors) {
					console.error('Errors encountered: ', results.errors);
					reject();
				} else {
					dispatcher.dispatch({ query: query, results: results });
					resolve();
				}
			});
		});
	}

	clientMutationId = 0;

	create(input) {
		return new Promise((resolve, reject) => {
			var req = {};
			req.query = `
				mutation CreatePerson($input: CreatePersonInput!) {
					createPerson(input: $input) {
						clientMutationId,
						person {
							id,
							firstName,
							middleName,
							lastName
						}
					}
				}
			`;
			req.variables = {
				input: {
					clientMutationId: (this.clientMutationId++) + '',
					createPerson: input
				}
			};

			var xhr = new XMLHttpRequest();
			xhr.open('POST', '/graphql', true);
			xhr.setRequestHeader('content-type', 'application/json');
			xhr.send(JSON.stringify(req));
			xhr.addEventListener('load', e => {
				var results = JSON.parse(xhr.responseText);
				if (results.errors) {
					console.error('Errors encountered: ', results.errors);
					reject();
				} else {
					var person = results.data.createPerson.person;
					resolve(person);
				}
			});
		});
	}
}

export default new PersonSearchStore(dispatcher);
