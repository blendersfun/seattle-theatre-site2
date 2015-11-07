"use strict";

import React from 'react';
import Relay from 'react-relay';
import {Link} from 'react-router';

import BasePage from '../../shared/base-page';

class HomePage extends React.Component {
  state = {
    authError: null
  };

  render() {
    return (
      <div id="homePage">
        <h2>Home page</h2>
        I am the home page. <br/><br/>
      </div>
    );
  }
}

var Home = Relay.createContainer(HomePage, {
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

export default BasePage(Home);
