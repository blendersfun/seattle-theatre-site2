"use strict";

import React from 'react';
import Relay from 'react-relay';
import {Link} from 'react-router';

class OtherPage extends React.Component {
  state = {
    authError: null
  };

  render() {
    return (
      <div id="homePage">
        <h2>Home page</h2>
        I the home page. <br/><br/>

        <Link to="/create-account">Go to create account</Link>
      </div>
    );
  }
}

export default Relay.createContainer(OtherPage, {
  fragments: {
    api: () => Relay.QL`
      fragment on Api {
        id
      }
    `,
  },
});
