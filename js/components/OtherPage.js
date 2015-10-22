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
      <div>
        <h2>Other page</h2>
        I am another page. <br/>
        Here is my data: {this.props.api.blag} <br/><br/>

        <Link to="/">Go home</Link>
      </div>
    );
  }
}

export default Relay.createContainer(OtherPage, {
  fragments: {
    api: () => Relay.QL`
      fragment on Api {
        id,
        blag
      }
    `,
  },
});
