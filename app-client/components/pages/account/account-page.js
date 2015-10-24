"use strict";

import React from 'react';
import Relay from 'react-relay';
import {Link} from 'react-router';

import BasePage from '../../shared/base-page';

class AccountPage extends React.Component {
  state = {
    authError: null
  };

  render() {
    return (
      <div id="accountPage">
        <h2>Account page</h2>
        I am the account page. <br/><br/>
      </div>
    );
  }
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
