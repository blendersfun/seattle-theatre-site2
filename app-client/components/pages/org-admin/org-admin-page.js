"use strict";

import React from 'react';
import Relay from 'react-relay';
import {Link} from 'react-router';
import classNames from 'classnames';

import history from '../../../history';
import BasePage from '../../shared/base-page';

class OrgAdminPage extends React.Component {
  state = {
    activeTab: 'productions'
  }
  render() {
    if (!this.accessAllowed()) return null;

    return (
      <div id="orgAdminPage">
        <h2>{this.props.user.orgAdminFor.name}</h2>
        <div className="tabs">
          <a className={classNames("tabs-tab",{"active": this.state.activeTab === 'productions'})} 
            href="javascript:;"
            onClick={() => this.goToTab('productions')}>
            Productions
          </a>
          <a className={classNames("tabs-tab",{"active": this.state.activeTab === 'org-info'})}
            href="javascript:;"
            onClick={() => this.goToTab('org-info')}>
            Organization Info
          </a>
        </div>
        {this.renderProductionsTab()}
        {this.renderOrgInfoTab()}
      </div>
    );
  }
  goToTab = (tabName) => this.setState({ activeTab: tabName }) 
  renderProductionsTab = () => {
    if (this.state.activeTab !== 'productions') return null;
    return (
      <div>
        <h3>Upcoming Productions</h3>
        {this.props.user.orgAdminFor.upcomingProductions.map((production) => (
          <div key={production.id}>
            <div><strong>{production.title}</strong></div>
            <div>{production.description}</div> <br/>
          </div>
        ))}
        <button onClick={this.addProduction}>Add Production</button>
      </div>
    );
  }
  renderOrgInfoTab = () => {
    if (this.state.activeTab !== 'org-info') return null;
    return (
      <div>
        <h3>Mission Statement</h3>
        {this.props.user.orgAdminFor.missionStatement}
      </div>
    );
  }
  addProduction = () => {
    history.pushState({}, '/org-admin/add-production');
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
          upcomingProductions {
            id,
            title,
            description,
            opening,
            closing,
            performanceSpace {
              id,
              name,
              venue {
                id,
                name,
              }
            },
          },
          pastProductions {
            id,
            title,
            description,
            opening,
            closing,
          },
        }
      }
    `,
  },
});

export default BasePage(OrgAdmin);
