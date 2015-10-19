"use strict";

import React from 'react';
import Relay from 'react-relay';
import cookie from 'cookie';

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
          user
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
          user
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

class App extends React.Component {
  render() {
    return (
      <div>
        <h2>Create Account</h2>
        <form ref="a_form">
          Email: <input ref="a_email"/> <br/>
          Password: <input type="password" ref="a_password"/> <br/>
          <input type="submit" value="Create" onClick={this.createAccount}/> <br/>
        </form>

        <h2>Login</h2>
        <form ref="L_form">
          Email: <input ref="L_email"/> <br/>
          Password: <input type="password" ref="L_password"/> <br/>
          <input type="submit" value="Login" onClick={this.login}/> <br/><br/>
        </form>

        {this.props.api.user ? 
          <div>
            Logged in as: {this.props.api.user.email}{' '}
            <input type="submit" value="Logout" onClick={this.logout}/>
          </div>
          : 'Not logged in.'
        } <br/><br/>
      </div>
    );
  }

  createAccount = (e) => {
    e.preventDefault();
    
    var createUser = {};
    createUser.email = this.refs.a_email.value;
    createUser.password = this.refs.a_password.value;

    var mutation = new CreateAccountMutation({
      apiId: this.props.api.id, 
      createUser: createUser
    });

    Relay.Store.update(mutation, {
      onSuccess: result => {
        var authToken = result.createUser.api.authToken;
        document.cookie = cookie.serialize("seathe_authToken", authToken, { maxAge: 24 * 60 * 60 });
        this.refs.a_form.reset();
      },
      onFailure: () => console.log('account create failure')
    });
  }

  login = (e) => {
    e.preventDefault();

    var login = {};
    login.email = this.refs.L_email.value;
    login.password = this.refs.L_password.value;

    var mutation = new LoginMutation({
      apiId: this.props.api.id, 
      login: login
    });

    Relay.Store.update(mutation, {
      onSuccess: result => {
        var authToken = result.login.api.authToken;
        document.cookie = cookie.serialize("seathe_authToken", authToken, { maxAge: 24 * 60 * 60 });
        this.refs.L_form.reset();
      },
      onFailure: () => console.log('login failure')
    });
  }

  logout = () => {
    document.cookie = cookie.serialize("seathe_authToken", "", { maxAge: -1 });
    this.props.relay.forceFetch({ authToken: null });
  }
}

export default Relay.createContainer(App, {
  initialVariables: {
    authToken: cookie.parse(document.cookie).seathe_authToken || null
  },
  fragments: {
    api: () => Relay.QL`
      fragment on Api {
        id,
        authToken,
        user(authToken: $authToken) {
          id,
          email
        }
      }
    `,
  },
});
