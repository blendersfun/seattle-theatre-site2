"use strict";

import React from 'react';
import Relay from 'react-relay';
import {Link} from 'react-router';
import cookie from '../../utils/cookie-manager';
import {
  LoginPopup,
  showLoginPopup,
} from '../shared/login-popup';
import UserMenu from '../shared/user-menu';

export default function (SpecificPage) {
  class BasePage extends React.Component {
    render() {
      return (
        <div id="app">
          <div id="global-nav">
            <div id="main-nav-menu">
              <Link to="/">Home</Link>
            </div>
            <div id="auth-menu">
              {this.props.api.user ? this.renderLoggedIn() : this.renderNotLoggedIn()}
              <LoginPopup api={this.props.api}/>
            </div>
          </div>
          <div id="page">
            <SpecificPage {...this.props} user={this.props.api.user}/>
          </div>
        </div>
      );
    }
    renderNotLoggedIn = () => (
        <div>
          <a href="javascript:;" onClick={showLoginPopup}>Login</a>
          {' | '}
          <Link to="/create-account">Sign Up</Link>
        </div>
      )
    renderLoggedIn = () => (
      <div>
        {this.isParticipant(
          <span className="org-signup">
            Run a theatre? <Link to="/create-org">Get started</Link>
          </span>
        )}
        
        {this.props.api.user.email}
        {' | '}
        <UserMenu user={this.props.api.user}/>
      </div>
      )


    componentDidMount = () => {
      this._onCookieUpdated = this.onCookieUpdated.bind(this);
      cookie.registerHandler("seathe_authToken", this._onCookieUpdated);
    }
    componentWillUnmount = () => {
      if (this._onCookieUpdated) cookie.removeHandler("seathe_authToken", this._onCookieUpdated);
    }
    onCookieUpdated = function (newValue) {
      this.props.relay.forceFetch({ authToken: newValue });
    }

    isParticipant = (component) => this.props.api.user.accessLevel === 'PARTICIPANT' ? component : ''
  }

  var Base = Relay.createContainer(BasePage, {
    initialVariables: {
      authToken: null,
    },
    prepareVariables: (prevVars) => {
      return {
        authToken: cookie.get('seathe_authToken')
      };
    },
    fragments: {
      api: () => Relay.QL`
        fragment on Api {
          ${SpecificPage.getFragment('api')},
          ${LoginPopup.getFragment('api')},

          user(authToken: $authToken) {
            email,
            accessLevel,

            ${SpecificPage.getFragment('user')},
            ${UserMenu.getFragment('user')},
          },
        }
      `,
    },
  });

  return Base;
}
