"use strict";

import React from 'react';
import Relay from 'react-relay';
import classNames from 'classnames';
import CreatePersonMutation from './create-person-mutation';

class SelectPersonComponent extends React.Component {
  state = {
    query: '',
    selected: null,
    selectMode: true,
    menuShowing: false,

    firstName: '',
    middleName: '',
    lastName: ''
  }

  render() {
    return (
      <div className="selectPerson">
        {this.props.label}: {this.state.selectMode ? this.renderSelectMode() : this.renderCreateMode()}
      </div>
    );
  }

  renderSelectMode = () => {
    return (
      <div className="selectPerson-controls">
        <input ref="input" className="selectPerson-input" 
          value={this.formatInputValue()} 
          readOnly={this.isInputReadOnly()} 
          onChange={this.inputOnChange}
          onFocus={this.inputOnFocus}
          onBlur={this.inputOnBlur}/>
        {this.renderSelectedControls()}
        {this.renderMenu()}
      </div>
      )
  }

  renderCreateMode = () => {
    return (
      <div className="selectPerson-controls">
        <input 
          ref="firstName" 
          className="input-small" 
          placeholder="First"
          value={this.state.firstName}
          onChange={this.onNameChange.bind(null, 'firstName')}/> {' '}
        <input 
          ref="middleName" 
          className="input-small" 
          placeholder="Middle"
          value={this.state.middleName}
          onChange={this.onNameChange.bind(null, 'middleName')}/> {' '}
        <input 
          ref="lastName" 
          className="input-small" 
          placeholder="Last"
          value={this.state.lastName}
          onChange={this.onNameChange.bind(null, 'lastName')}/> {' '}
        <button onClick={this.createPerson}>Create</button> {' '}
        <button onClick={this.cancelCreate}>Cancel</button>
      </div>
      )
  }

  onNameChange = (stateName, e) => {
    var state = {};
    state[stateName] = e.currentTarget.value;
    this.setState(state);
  }

  cancelCreate = (e) => {
    e.preventDefault();
    this.setState({ selectMode: true });
  }

  createPerson = (e) => {
    e.preventDefault();

    var person = {
      firstName: this.refs.firstName.value,
      middleName: this.refs.middleName.value || null,
      lastName: this.refs.lastName.value
    };

    var query = [];
    query.push(person.firstName);
    if (person.middleName) query.push(person.middleName);
    query.push(person.lastName);

    var mutation = new CreatePersonMutation({
      apiId: this.props.api.id, 
      createPerson: person
    });

    Relay.Store.update(mutation, {
      onSuccess: result => {
        this.props.relay.setVariables({ query: query.join(',') }, (readyState) => {
          if (readyState.ready) {

            // Without the setTimeout weirdness, this.props.api.personSearch is still empty. 
            // Makes me think that this is not something your intended to be able to do, but
            // I'm just not sure how to design it differently right now.

            setTimeout(() => {
              if (this.props.api.personSearch.length === 1) {
                this.setState({ 
                  selected: this.props.api.personSearch[0], 
                  selectMode: true,
                  menuShowing: false,
                });
              }
            }, 100);
          }
        });
      },
      onFailure: () => console.log('create person failure')
    });

  }

  formatInputValue = () => {
    var p = this.state.selected;
    if (p) {
      return this.formatPerson(p);
    }
    return this.state.query;
  }
  formatPerson = p => {
    var middleName = '';
    if (p.middleName) middleName = p.middleName + ' ';
    return `${p.firstName} ${middleName}${p.lastName}`;
  }
  isInputReadOnly = () => !!this.state.selected
  inputOnChange = (e) => {
    var query = e.currentTarget.value;
    this.setState({ query: query });
    this.props.relay.setVariables({ query: this.formatQueryForServer(query) });
  }
  inputOnFocus = (e) => this.setState({ menuShowing: true })
  inputOnBlur = (e) => setTimeout(() => this.setState({ menuShowing: false, query: '' }), 100)
  
  formatQueryForServer = q => q.replace(/^\s*(.*?)\s*$/, '$1').replace(/\s+/g, ',')

  renderSelectedControls = () => {
    if (!this.state.selected) 
      return null;
    else return (
      <span> {' '}
        <button onClick={this.clearSelection}>Clear</button>
      </span>
    );
  }

  renderMenu = () => {
    if (!this.state.menuShowing || 
        (this.props.api.personSearch.length === 0 && this.state.query === '')) return null;
    else return (
      <div className="selectPerson-menu">
        {this.props.api.personSearch.map(this.renderMenuItem)}
        <div>
          <a href="javascript:;" className="selectPerson-item"
            onMouseDown={this.initiateCreatePerson}>
            (Add New)
          </a>
        </div>
      </div>
    );
  }
  renderMenuItem = p => {
    return (
      <div key={p.id}>
        <a href="javascript:;" className="selectPerson-item"
          onMouseDown={this.selectItem.bind(this, p)}>
          {this.formatPerson(p)}
        </a>
      </div>
    );
  }

  initiateCreatePerson = () => {
    var splits = this.state.query.replace(/^\s*(.*?)\s*$/, '$1').split(/\s+/);
    this.setState({
      firstName: splits[0],
      middleName: splits.length > 2 ? splits[1] : '',
      lastName: splits.length > 2 ? splits[2] : splits[1] || '',
      selectMode: false
    });
  }

  selectItem = p => {
    this.setState({ selected: p, query: '' });
    this.props.relay.setVariables({ query: '' });
  }

  clearSelection = () => {
    this.setState({ selected: null });
    this.refs.input.focus();
  }

  value = () => this.state.selected
}

var SelectPerson = Relay.createContainer(SelectPersonComponent, {
  initialVariables: {
    query: ''
  },
  fragments: {
    api: () => Relay.QL`
      fragment on Api {
        id,
        personSearch(query: $query) {
          id,
          firstName,
          middleName,
          lastName,
        }
      }
    `
  },
});

export default SelectPerson;
