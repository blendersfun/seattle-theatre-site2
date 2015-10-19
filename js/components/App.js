"use strict";

import React from 'react';
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
        root {
          id,
          authToken,
          user
        }
      }
    `;
  }
  getConfigs() {
    return [{
      type: 'FIELDS_CHANGE',
      fieldIDs: {
        root: this.props.rootId
      },
    }];
  }
}

class App extends React.Component {
  render() {
    return (
      <div>
        <h1>Create Account</h1>
        Full name: {' '}
          <input placeholder="First" ref="first"/>{' '}
          <input placeholder="Middle (optional)" ref="middle"/>{' '}
          <input placeholder="Last" ref="last"/> <br/>
        Email: <input ref="email"/> <br/>
        Phone: <input placeholder="(optional)" ref="phone"/> <br/>
        Password: <input type="password" ref="password"/> <br/>
        <input type="submit" value="Go" onClick={this.createAccount}/>
      </div>
    );
  }
  createAccount = () => {
    var createUser = {};
    createUser.firstName = this.refs.first.value;
    createUser.middleName = this.refs.middle.value;
    createUser.lastName = this.refs.last.value;
    createUser.email = this.refs.email.value;
    createUser.phone = this.refs.phone.value;
    createUser.password = this.refs.password.value;
    if (!createUser.middleName) {
      createUser.middleName = null;
    }
    if (!createUser.phone) {
      createUser.phone = null;
    }
    Relay.Store.update(new CreateAccountMutation({
      rootId: this.props.root.id, 
      createUser: createUser
    }));
    setTimeout(() => { console.log(this.props)}, 1000);
  }
}

export default Relay.createContainer(App, {
  fragments: {
    root: () => Relay.QL`
      fragment on Root {
        id,
        authToken,
        user {
          email
          person {
            firstName
            lastName
          }
        }
      }
    `,
  },
});
