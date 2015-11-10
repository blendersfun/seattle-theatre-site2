"use strict";

import React from 'react';
import Relay from 'react-relay';
import {Link} from 'react-router';
import classNames from 'classnames';
import {EventEmitter} from 'events';
import cookie from '../../../utils/cookie-manager';

import LoginMutation from './login-mutation';

var emitter = new EventEmitter();

class LoginPopupComponent extends React.Component {
  state = {
    showing: false,
    authError: null,
  };

  render() {
    return (
      <div id="loginPopup" className={classNames('popup', {hidden: !this.state.showing})}>
        <div className="popup-bg"></div>
        <div className="popup-panel">
          <a href="javascript:;" className="popup-close" onClick={this.hide}>x</a>

          <h3 className="popup-heading">Login</h3>
          <form ref="loginForm">
            <div className="form-line">
              &nbsp;&nbsp;&nbsp;&nbsp;
              Email: <input ref="email" className="input-large"/></div>
            <div className="form-line">
              Password: <input ref="password" type="password" className="input-large"/></div>
            <div className="form-lineBr">
              <input type="submit" value="Login" onClick={this.login}/> {' '}
              {this.state.authError ? 
                <span className="errorMessage">
                  {this.state.authError === 'INVALID_CREDENTIALS' ? 'Email or password were incorrect.' : ''}
                </span> 
                : ''} </div>
          </form>
        </div>
      </div>
    );
  }
  show = () => this.setState({ showing: true })
  hide = () => this.setState({ showing: false })
  componentDidMount = () => {
    this._show = this.show.bind(this);
    emitter.on("show-login-popup", this._show);
  }
  componentWillUnmount = () => {
    emitter.removeListener("show-login-popup", this._show);
  }

  login = (e) => {
    e.preventDefault();
    this.setState({authError: null});

    var login = {};
    login.email = this.refs.email.value;
    login.password = this.refs.password.value;

    var mutation = new LoginMutation({
      apiId: this.props.api.id, 
      login: login
    });

    Relay.Store.update(mutation, {
      onSuccess: result => {
        var authToken = result.login.api.authToken;
        var authError = result.login.api.authError;

        if (authToken) {
          cookie.set("seathe_authToken", authToken);
          this.refs.loginForm.reset();
          this.hide();
        } else if (authError) {
          this.setState({authError});
        }
      },
      onFailure: () => console.log('login failure')
    });
  }
}

var LoginPopup = Relay.createContainer(LoginPopupComponent, {
  fragments: {
    api: () => Relay.QL`
      fragment on Api {
        id,
        authError,
        authToken,
      }
    `
  },
});

function showLoginPopup () {
  emitter.emit("show-login-popup");
}

module.exports = {
  LoginPopup,
  showLoginPopup
};
