"use strict";

import React from 'react';
import Relay from 'react-relay';
import {Link} from 'react-router';

import history from '../../../history';
import BasePage from '../../shared/base-page';

class OrgAdminPage extends React.Component {
  render() {
    if (!this.accessAllowed()) return null;

    return (
      <div id="orgAdminPage">
        <h2>{this.props.user.orgAdminFor.name}</h2>
        <h3>Mission Statement</h3>
        {this.props.user.orgAdminFor.missionStatement}
      </div>
    );
  }
  accessAllowed = (props) => {
    props = props || this.props;
    return props.user && props.user.orgAdminFor
  }
  redirectIfImproperAccess = (props) => {
    if (!this.accessAllowed(props)) {
      setTimeout(() => history.pushState({}, '/'), 10);
    }
  }
  componentWillMount = () => this.redirectIfImproperAccess()
  componentWillUpdate = (props) => this.redirectIfImproperAccess(props)
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
