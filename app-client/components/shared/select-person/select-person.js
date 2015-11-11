"use strict";

import React from 'react';
import {Container} from 'flux/utils';
import PersonSearchStore from './person-search-store';

class SelectPerson extends React.Component {
  state = {
    myQuery: '',
    selected: null,
    menuShowing: false,
    selectMode: true,

    firstName: '',
    middleName: '',
    lastName: ''
  }

  /*
   * Render functions.
   */

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
        (this.props.personSearch.length === 0 && this.props.query === '')) return null;
    else return (
      <div className="selectPerson-menu">
        {this.props.personSearch.map(this.renderMenuItem)}
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

/*
 * Formatting functions.
 */

  formatInputValue = () => {
    var p = this.state.selected;
    if (p) {
      return this.formatPerson(p);
    }
    return this.state.myQuery;
  }

  formatPerson = p => {
    var middleName = '';
    if (p.middleName) middleName = p.middleName + ' ';
    return `${p.firstName} ${middleName}${p.lastName}`;
  }

  isInputReadOnly = () => !!this.state.selected

/*
 * Event handlers.
 */

  inputOnFocus = (e) => {
    this.search('').then(() => {
      this.setState({ menuShowing: true });
    });
  }

  inputOnBlur = (e) => setTimeout(() => {
    this.setState({ menuShowing: false });
    if (!this.state.selected) {
      this.search('');
    }
  }, 100)

  inputOnChange = (e) => {
    e.preventDefault();
    var query = this.refs.input.value;
    this.search(query);
  }

  selectItem = p => {
    this.setState({ selected: p });
  }

  clearSelection = (e) => {
    e.preventDefault();
    this.search('').then(() => {
      this.setState({ selected: null, myQuery: '' });
      this.refs.input.focus();
    });
  }

  onNameChange = (stateName, e) => {
    var state = {};
    state[stateName] = e.currentTarget.value;
    this.setState(state);
  }

  initiateCreatePerson = () => {
    var splits = this.props.query.replace(/^\s*(.*?)\s*$/, '$1').split(/\s+/);
    this.setState({
      firstName: splits[0],
      middleName: splits.length > 2 ? splits[1] : '',
      lastName: splits.length > 2 ? splits[2] : splits[1] || '',
      selectMode: false
    });
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
    PersonSearchStore.create(person).then(person => {
      this.setState({ selected: person, selectMode: true, menuShowing: false });
    });
  }

  search = query => {
    if (this.props.query === query) return Promise.resolve();

    this.setState({ myQuery: query });
    return PersonSearchStore.search(query);
  }

  /*
   * External api.
   */

  value = () => this.state.selected
}

class SelectPersonContainer extends React.Component {
  static getStores() {
    return [PersonSearchStore];
  }

  static calculateState(prevState) {
    return {
      personSearch: PersonSearchStore.getResults(),
      query: PersonSearchStore.getQuery(),
    };
  }

  render() {
    return (
      <SelectPerson 
        label={this.props.label}
        query={this.state.query}
        personSearch={this.state.personSearch}
        ref="component"/>
    );
  }
}

export default Container.create(SelectPersonContainer);
