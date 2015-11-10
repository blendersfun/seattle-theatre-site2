"use strict";

import {Store} from 'flux/utils';
import dispatcher from '../../../utils/dispatcher';

class PersonSearchStore extends Store {
	state = {
		personSearch: []
	}

	__onDispatch = (payload) => {
		if (payload && payload.data && payload.data.api && payload.data.api.personSearch) {
			var data = payload.data.api.personSearch;
			this.state.personSearch = data;
		}
	}

	getState = () => {
		return JSON.parse(JSON.stringify(this.state.personSearch)); // Deep clone so as to prevent mutation of original.
	}

	/*
	 * Actions:
	 */

	formatQueryForServer = q => q.replace(/^\s*(.*?)\s*$/, '$1').replace(/\s+/g, ',')

	search(query) {
		var req = {};
		req.query = `
			query App {
				api {
					personSearch(query: "${this.formatQueryForServer(query)}") {
						id,
						firstName,
						lastName,
						middleName
					}
				}
			}
		`;
		req.variables = {};

		var xhr = new XMLHttpRequest();
		xhr.open('POST', '/graphql', true);
		xhr.setRequestHeader('content-type', 'application/json');
		xhr.send(JSON.stringify(req));
		xhr.addEventListener('load', e => {
			var result = JSON.parse(xhr.responseText);
			if (result.errors) {
				console.error('Errors encountered: ', result.errors);
			} else {
				dispatcher.dispatch(result);
			}
		});
	}
}

export default new PersonSearchStore(dispatcher);
