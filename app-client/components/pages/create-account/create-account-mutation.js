
import Relay from 'react-relay';

class CreateAccountMutation extends Relay.Mutation {
  getMutation() {
    return Relay.QL`mutation {createUser}`;
  }
  getVariables() {
    return {createUser: this.props.createUser};
  }
  getFatQuery() {
    return Relay.QL`
      fragment on CreateUserPayload {
        api {
          authToken,
          authError,
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

export default CreateAccountMutation;
