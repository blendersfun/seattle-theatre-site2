
import Relay from 'react-relay';

class AddProductionMutation extends Relay.Mutation {
  getMutation() {
    return Relay.QL`mutation {createProduction}`;
  }
  getVariables() {
    return {createProduction: this.props.createProduction};
  }
  getFatQuery() {
    return Relay.QL`
      fragment on CreateProductionPayload {
        producingOrg {
          upcomingProductions,
        }
      }
    `;
  }
  getConfigs() {
    return [{
      type: 'FIELDS_CHANGE',
      fieldIDs: {
        producingOrg: this.props.orgId
      },
    }];
  }
}

export default AddProductionMutation;
