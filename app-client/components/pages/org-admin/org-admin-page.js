"use strict";

import React from 'react';
import Relay from 'react-relay';
import {Link} from 'react-router';
import classNames from 'classnames';
import moment from 'moment';

import history from '../../../utils/history';
import BasePage from '../../shared/base-page';

class OrgAdminPage extends React.Component {
  state = {
    activeTab: 'productions'
  }
  render() {
    return (
      <div id="orgAdminPage">
        <h2>{this.props.api.producingOrganization.name}</h2>
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
        {this.props.api.producingOrganization.upcomingProductions.map((production) => (
          <div key={production.id}>
            <div className="orgAdminPage-productionDetails">
              <div>{this.renderDateRange(production.opening, production.closing)}</div>
              <div>{this.renderVenue(production)}</div>
            </div>
            <div><strong>{production.title}</strong></div>
            <div style={{whiteSpace: 'pre-line'}}>{production.description}</div> <br/>
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
        <div style={{whiteSpace: 'pre-line'}}>{this.props.api.producingOrganization.missionStatement}</div>
      </div>
    );
  }
  renderDateRange = (start, end) => {
    start = moment(start);
    end = moment(end);
    if (start.year() === end.year()) {
      if (start.month() === end.month()) {
        if (start.date() === end.date()) {
          return moment(start).format('MMM Do, YYYY');
        } else {
          return moment(start).format('MMM Do') +' - '+ moment(end).format('Do, YYYY');
        }
      } else {
        return moment(start).format('MMM Do') +' - '+ moment(end).format('MMM Do, YYYY');
      }
    } else {
      return moment(start).format('MMM Do, YYYY') +' - '+ moment(end).format('MMM Do, YYYY');
    }
  }
  renderVenue = production => {
    if (!production.performanceSpace || !production.performanceSpace.venue) return null;
    var venueName = production.performanceSpace.venue.name;
    var spaceName = production.performanceSpace.name;
    if (venueName === spaceName) {
      return venueName;
    } else {
      return venueName + ': ' + spaceName;
    }
  }
  addProduction = () => {
    history.pushState({}, '/org-admin/' +this.props.api.producingOrganization.id+ '/add-production');
  }
}

var OrgAdmin = Relay.createContainer(OrgAdminPage, {
  initialVariables: {
    orgId: null
  },
  prepareVariables: (prevVars) => {
    var orgId = location.pathname.match(/\/org-admin\/([^\/]+)/)[1];
    prevVars.orgId = orgId;
    return prevVars;
  },
  fragments: {
    api: () => Relay.QL`
      fragment on Api {
        id,
        producingOrganization(id: $orgId) {
          id,
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
            director {
              id,
              firstName,
              middleName,
              lastName,
            },
            stageManager {
              id,
              firstName,
              middleName,
              lastName,
            }
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
    user: () => Relay.QL`
      fragment on User {
        orgAdminFor {
          id,
        }
      }
    `,
  },
});

export default BasePage(OrgAdmin);
