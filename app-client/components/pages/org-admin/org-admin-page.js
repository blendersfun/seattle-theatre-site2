"use strict";

import React from 'react';
import Relay from 'react-relay';
import {Link} from 'react-router';

import BasePage from '../../shared/base-page';

class OrgAdminPage extends React.Component {
  render() {
    return (
      <div id="orgAdminPage">
        <h2>{this.props.user.orgAdminFor.name}</h2>
        <h3>Mission Statement</h3>
        {this.props.user.orgAdminFor.missionStatement}
      </div>
    );
  }
}

var OrgAdmin = Relay.createContainer(OrgAdminPage, {
  fragments: {
    api: () => Relay.QL`
      fragment on Api {
        id,
      }
    `,
    user: () => Relay.QL`
      fragment on User {
        orgAdminFor {
          name,
          missionStatement,
        }
      }
    `,
  },
});

export default BasePage(OrgAdmin);
