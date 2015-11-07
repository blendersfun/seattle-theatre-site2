
import Relay from 'react-relay';

class CreateProducingOrgMutation extends Relay.Mutation {
  getMutation() {
    return Relay.QL`mutation {createProducingOrg}`;
  }
  getVariables() {
    return {createProducingOrg: this.props.createProducingOrg};
  }
  getFatQuery() {
    return Relay.QL`
      fragment on CreateProducingOrgPayload {
        api {
          authToken,
          producingOrgError,
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

export default CreateProducingOrgMutation;
