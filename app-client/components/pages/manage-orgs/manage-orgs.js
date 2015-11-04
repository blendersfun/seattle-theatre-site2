"use strict";

import React from 'react';
import Relay from 'react-relay';
import {Link} from 'react-router';

import BasePage from '../../shared/base-page';

class ManageOrgsPage extends React.Component {
  render() {
    return (
      <div id="manageOrgs">
        <h2>Manage Organizations</h2>
        {this.props.api.producingOrganizations.map(this.renderOrg)}
      </div>
    );
  }
  renderOrg = org => (
    <div key={org.id}>
      <Link to={"/org-admin/" + org.id}>
        {org.name}
      </Link>
    </div>
  )
}

var ManageOrgs = Relay.createContainer(ManageOrgsPage, {
  fragments: {
    api: () => Relay.QL`
      fragment on Api {
        id,
        producingOrganizations {
          id,
          name,
        }
      }
    `,
    user: () => Relay.QL`
      fragment on User {
        id
      }
    `,
  },
});

export default BasePage(ManageOrgs);
