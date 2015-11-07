"use strict";

import React from 'react';
import Relay from 'react-relay';
import {Link} from 'react-router';

import BasePage from '../../shared/base-page';
import history from '../../../history';

class AccountPage extends React.Component {
  state = {
    authError: null
  };

  render() {
    if (!this.accessAllowed()) return null;

    return (
      <div id="accountPage">
        <h2>Account page</h2>
        I am the account page. <br/><br/>
      </div>
    );
  }
  accessAllowed = (props) => {
    props = props || this.props;
    return props.user;
  }
  redirectIfImproperAccess = (props) => {
    if (!this.accessAllowed(props)) {
      setTimeout(() => history.pushState({}, '/'), 10);
    }
  }
  componentWillMount = () => this.redirectIfImproperAccess()
  componentWillUpdate = (props) => this.redirectIfImproperAccess(props)
}

var Account = Relay.createContainer(AccountPage, {
  fragments: {
    api: () => Relay.QL`
      fragment on Api {
        id
      }
    `,
    user: () => Relay.QL`
      fragment on User {
        id
      }
    `,
  },
});

export default BasePage(Account);
