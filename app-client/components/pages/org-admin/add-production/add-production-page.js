"use strict";

import React from 'react';
import Relay from 'react-relay';
import {Link} from 'react-router';
import classNames from 'classnames';

import history from '../../../../history';
import BasePage from '../../../shared/base-page';
import AddProductionMutation from './add-production-mutation';
import SelectVenue from './select-venue';

class AddProductionPage extends React.Component {
  state = {
    isScripted: true,
  }

  render() {
    return (
      <div id="addProductionPage">
        <h2>Add Production</h2>
        <form>
          <div className="form-line">
            <input type="checkbox" ref="isScripted" onChange={this.scriptedChange} defaultChecked="checked"/> Is Scripted</div>
          { this.state.isScripted ? this.renderScriptedInputs() : this.renderNonScriptedInputs() }
          <div className="form-line">
            Opening Night <input type="date" ref="opening"/></div>
          <div className="form-line">
            Closing Night <input type="date" ref="closing"/></div>
          <div className="form-line">
            <SelectVenue api={this.props.api} ref="venue"/></div>
          <div className="form-lineBr">
            <button onClick={this.addProduction}>Add</button>
            {' '}
            <button onClick={this.cancel}>Cancel</button></div>
        </form>
      </div>
    );
  }

  renderScriptedInputs = () => (
    <div>
      <div className="form-line">
        Script Title <input ref="scriptTitle" className="input-large"/></div>
      <div className="form-line">
        Synopsis <br/> <textarea ref="synopsis"></textarea></div>
    </div>
  )
  renderNonScriptedInputs = () => (
    <div>
      <div className="form-line">
        Title <input ref="title" className="input-large"/></div>
      <div className="form-line">
        Description <br/> <textarea ref="description"></textarea></div>
    </div>
  )
  scriptedChange = () => {
    this.setState({ isScripted: this.refs.isScripted.checked });
  }

  cancel = (e) => {
    e.preventDefault();
    history.pushState({}, '/org-admin/' + this.props.api.producingOrganization.id);
  }
  addProduction = (e) => {
    e.preventDefault();

    var space = this.refs.venue.refs.component.value().space;
    
    var createProduction = {
      orgId: this.props.api.producingOrganization.id,
      isScripted: this.refs.isScripted.checked,
      isSingleEvent: false,
      opening: new Date(this.refs.opening.value).getTime(),
      closing: new Date(this.refs.closing.value).getTime(),
      spaceId: space && space.id,
    };
    if (createProduction.isScripted) {
      createProduction.scriptTitle = this.refs.scriptTitle.value;
      createProduction.synopsis = this.refs.synopsis.value;
    } else {
      createProduction.stagingTitle = this.refs.title.value;
      createProduction.description = this.refs.description.value;
    }

    var mutation = new AddProductionMutation({
      orgId: this.props.api.producingOrganization.id, 
      createProduction: createProduction
    });

    Relay.Store.update(mutation, {
      onSuccess: result => {
        history.pushState({}, '/org-admin/' + this.props.api.producingOrganization.id);
      },
      onFailure: () => console.log('org create failure')
    });
  }
}

var AddProduction = Relay.createContainer(AddProductionPage, {
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
        },
        ${SelectVenue.getFragment('api')}
      }
    `,
    user: () => Relay.QL`
      fragment on User {
        id,
      }
    `,
  },
});

export default BasePage(AddProduction);
