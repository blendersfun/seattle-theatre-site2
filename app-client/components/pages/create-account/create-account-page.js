"use strict";

import React from 'react';
import Relay from 'react-relay';
import {Link} from 'react-router';
import cookie from '../../shared/cookie-manager';
import history from '../../../history';

import CreateAccountMutation from './create-account-mutation';

import BasePage from '../../shared/base-page';

class App extends React.Component {
  state = {
    authError: null
  };

  render() {
    return (
      <div id="createAccountPage">
        <h2>Create Account</h2>
        <form ref="form">
          <div className="form-line">
            &nbsp;&nbsp;&nbsp;&nbsp;
            Email: <input ref="email" className="input-large"/> </div>
          <div className="form-line">
            Password: <input type="password" ref="password" className="input-large"/> </div>
          <div className="form-lineBr">
            <input type="submit" value="Create" onClick={this.createAccount}/>  {' '}
            {this.state.authError ? 
              <span className="errorMessage">
                {this.state.authError === 'USER_ALREADY_EXISTS' ? 'This email address is already associated with an existing user account.' : ''}
              </span> 
              : ''}
            </div>
        </form>
      </div>
    );
  }

  createAccount = (e) => {
    e.preventDefault();
    this.setState({authError: null});

    var createUser = {};
    createUser.email = this.refs.email.value;
    createUser.password = this.refs.password.value;

    var mutation = new CreateAccountMutation({
      apiId: this.props.api.id, 
      createUser: createUser
    });

    Relay.Store.update(mutation, {
      onSuccess: result => {
        var authToken = result.createUser.api.authToken;
        var authError = result.createUser.api.authError;

        if (authToken) {
          cookie.set("seathe_authToken", authToken);
          this.refs.form.reset();
          history.pushState({}, '/');
        } else if (authError) {
          this.setState({authError});
        }
      },
      onFailure: () => console.log('account create failure')
    });
  }
}

var CreateAccount = Relay.createContainer(App, {
  initialVariables: {
    authToken: cookie.get('seathe_authToken'),
  },
  fragments: {
    api: () => Relay.QL`
      fragment on Api {
        id,
        authToken,
        authError,
      }
    `,
    user: () => Relay.QL`
      fragment on User {
        id,
      }
    `,
  },
});

export default BasePage(CreateAccount);
