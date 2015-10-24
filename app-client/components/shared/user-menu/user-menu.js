"use strict";

import React from 'react';
import Relay from 'react-relay';
import {Link} from 'react-router';
import classNames from 'classnames';
import cookie from '../cookie-manager';

class UserMenuComponent extends React.Component {
  state = {
    showing: false,
  };

  render() {
    return (
      <span id="userMenu"
        onMouseEnter={this.show}
        onMouseLeave={this.hide}>
        <a href="javascript:;">User Menu</a>
        <div className={classNames("userMenu-menu", {hidden: !this.state.showing})}>
          <div className="userMenu-item">
            <Link to="/account">Account</Link></div>
          {this.isOrgAdmin(
            <div className="userMenu-item">
              <Link to="/org-admin">My Organization</Link></div>
          )}
          <div className="userMenu-item">
            <a href="javascript:;" onClick={this.logout}>Logout</a></div>
        </div>
      </span>
    );
  }
  show = () => this.setState({ showing: true })
  hide = () => this.setState({ showing: false })

  logout = () => {
    cookie.remove("seathe_authToken");
  }
  isSysAdmin = (component) => this.props.user.accessLevel === 'SYS_ADMIN' ? component : ''
  isOrgAdmin = (component) => this.props.user.accessLevel === 'ORG_ADMIN' ? component : ''
}

var UserMenu = Relay.createContainer(UserMenuComponent, {
  fragments: {
    user: () => Relay.QL`
      fragment on User {
        accessLevel,
      }
    `,
  },
});

export default UserMenu;
