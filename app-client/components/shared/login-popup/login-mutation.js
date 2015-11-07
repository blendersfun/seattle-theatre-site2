
import Relay from 'react-relay';

class LoginMutation extends Relay.Mutation {
  getMutation() {
    return Relay.QL`mutation {login}`;
  }
  getVariables() {
    return {login: this.props.login};
  }
  getFatQuery() {
    return Relay.QL`
      fragment on LoginPayload {
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

export default LoginMutation;
