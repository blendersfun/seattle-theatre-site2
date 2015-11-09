"use strict";

import React from 'react';
import Relay from 'react-relay';
import classNames from 'classnames';

class SelectPersonComponent extends React.Component {
  state = {
    query: '',
    selected: null,
    menuShowing: false,
  }

  render() {
    return (
      <div className="selectPerson">
        {this.props.label}: <div className="selectPerson-controls">
          <input ref="input" className="selectPerson-input" 
            value={this.formatInputValue()} 
            readOnly={this.isInputReadOnly()} 
            onChange={this.inputOnChange}
            onFocus={this.inputOnFocus}
            onBlur={this.inputOnBlur}/>
          {this.renderSelectedControls()}
          {this.renderMenu()}
        </div>
      </div>
    );
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
  inputOnBlur = (e) => setTimeout(() => this.setState({ menuShowing: false }), 100)
  
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
    if (!this.state.menuShowing || this.props.api.personSearch.length === 0) return null;
    else return (
      <div className="selectPerson-menu">
        {this.props.api.personSearch.map(this.renderMenuItem)}
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
