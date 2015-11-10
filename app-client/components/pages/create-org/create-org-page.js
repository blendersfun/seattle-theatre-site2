"use strict";

import React from 'react';
import Relay from 'react-relay';
import {Link} from 'react-router';

import CreateProducingOrgMutation from './create-org-mutation';

import BasePage from '../../shared/base-page';
import cookie from '../../../utils/cookie-manager';
import history from '../../../utils/history';

class CreateOrgPage extends React.Component {
  state = {
    producingOrgError: null
  };
  render() {
    if (!this.accessAllowed()) return null;

    return (
      <div id="createOrgPage">
        <h2>Create org page</h2>

        <form ref="form">
          <div className="form-line">
            Name: <input ref="name" className="input-large"/> </div>
          <div className="form-line">
            Mission Statement: <br/>
            <textarea ref="missionStatement" className="input-large"></textarea> </div>
          <div className="form-lineBr">
            <button onClick={this.create}>Create</button>  {' '}
            {this.state.producingOrgError ? 
              <span className="errorMessage">
                {this.state.producingOrgError === 'PRODUCING_ORG_ALREADY_EXISTS' ? 'A producing organization with this name already exists in the system.' : ''}
              </span> 
              : <br/>}
            </div>
        </form>
      </div>
    );
  }
  create = (e) => {
    e.preventDefault();

    var createProducingOrg = {};
    createProducingOrg.name = this.refs.name.value;
    createProducingOrg.missionStatement = this.refs.missionStatement.value;
    createProducingOrg.userId = this.props.user.id;

    var mutation = new CreateProducingOrgMutation({
      apiId: this.props.api.id, 
      createProducingOrg: createProducingOrg
    });

    Relay.Store.update(mutation, {
      onSuccess: result => {
        var authToken = result.createProducingOrg.api.authToken;
        var producingOrgError = result.createProducingOrg.api.producingOrgError;

        if (authToken) {
          cookie.set("seathe_authToken", authToken);
          this.refs.form.reset();
        } 
        else if (producingOrgError) {
          this.setState({producingOrgError});
        }
      },
      onFailure: () => console.log('org create failure')
    });
  }
  accessAllowed = (props) => {
    props = props || this.props;
    return props.user && ['PARTICIPANT','SYS_ADMIN'].includes(props.user.accessLevel)
  }
  redirectIfImproperAccess = (props) => {
    if (!this.accessAllowed(props)) {
      setTimeout(() => history.pushState({}, '/'), 10);
    }
  }
  componentWillMount = () => this.redirectIfImproperAccess()
  componentWillUpdate = (props) => this.redirectIfImproperAccess(props)
}

var CreateOrg = Relay.createContainer(CreateOrgPage, {
  fragments: {
    api: () => Relay.QL`
      fragment on Api {
        id,
        producingOrgError,
      }
    `,
    user: () => Relay.QL`
      fragment on User {
        id,
        accessLevel,
      }
    `,
  },
});

export default BasePage(CreateOrg);
