"use strict";

import React from 'react';
import Relay from 'react-relay';
import cookie from 'cookie';
import {Link} from 'react-router';

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
          authError,
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
  state = {
    authError: null
  };

  render() {
    return (
      <div id="createAccountPage">
        <h2>Create Account</h2>
        <form ref="a_form">
          Email: <input ref="a_email"/> <br/>
          Password: <input type="password" ref="a_password"/> <br/>
          <input type="submit" value="Create" onClick={this.createAccount}/>  {' '}
          {this.state.authError ? 
            <span className="errorMessage">
              {this.state.authError === 'USER_ALREADY_EXISTS' ? 'This email address is already associated with an existing user account.' : ''}
            </span> 
            : ''}
          <br/>
        </form>

        <h2>Login</h2>
        <form ref="L_form">
          Email: <input ref="L_email"/> <br/>
          Password: <input type="password" ref="L_password"/> <br/>
          <input type="submit" value="Login" onClick={this.login}/> {' '}
          {this.state.authError ? 
            <span className="errorMessage">
              {this.state.authError === 'INVALID_CREDENTIALS' ? 'Email or password were incorrect.' : ''}
            </span> 
            : ''}
          <br/><br/>
        </form>

        {this.props.api.user ? 
          <div>
            Logged in as: {this.props.api.user.email}{' '}
            <input type="submit" value="Logout" onClick={this.logout}/>
          </div>
          : <span>Not logged in. <br/></span>
        } <br/>

        <Link to="/">Go to home page</Link>
      </div>
    );
  }

  createAccount = (e) => {
    e.preventDefault();
    this.setState({authError: null});

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
        var authError = result.createUser.api.authError;

        if (authToken) {
          this._setCookie("seathe_authToken", authToken);
          this.refs.a_form.reset();
        } else if (authError) {
          this.setState({authError});
        }
      },
      onFailure: () => console.log('account create failure')
    });
  }

  login = (e) => {
    e.preventDefault();
    this.setState({authError: null});

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
        var authError = result.login.api.authError;

        if (authToken) {
          this._setCookie("seathe_authToken", authToken);
          this.refs.L_form.reset();
        } else if (authError) {
          this.setState({authError});
        }
      },
      onFailure: () => console.log('login failure')
    });
  }

  logout = () => {
    this._deleteCookie("seathe_authToken");
    this.props.relay.forceFetch({ authToken: null });
  }

  _setCookie = (name, value) => {
    document.cookie = cookie.serialize(name, value, { maxAge: 24 * 60 * 60 });
  }
  _deleteCookie = (name) => {
    document.cookie = cookie.serialize("seathe_authToken", "", { maxAge: -1 })
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
        authError,
        user(authToken: $authToken) {
          id,
          email
        }
      }
    `,
  },
});
