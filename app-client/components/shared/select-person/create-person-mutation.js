"use strict";

import Relay from 'react-relay';

class CreatePersonMutation extends Relay.Mutation {
  getMutation() {
    return Relay.QL`mutation {createPerson}`;
  }
  getVariables() {
    return {createPerson: this.props.createPerson};
  }
  getFatQuery() {
    return Relay.QL`
      fragment on CreatePersonPayload {
        api {
          personSearch
        }
      }
    `;
  }
  getConfigs() {
    return [{
      type: 'FIELDS_CHANGE',
      fieldIDs: {
        api: this.props.apiId
      },
    }];
  }
}

export default CreatePersonMutation;
