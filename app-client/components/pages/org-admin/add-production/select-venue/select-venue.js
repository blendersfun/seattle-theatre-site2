
"use strict";

import React from 'react';
import Relay from 'react-relay';
import classNames from 'classnames';

class SelectVenueComponent extends React.Component {
  state = {
    filterQuery: null,
    selectedVenue: null,
    selectedSpace: null,
    menuShowing: false,
  }

  render() {
    return (
      <div className="selectVenue">
        Venue: <div className="selectVenue-controls">
          <input ref="input" className="selectVenue-input" 
            value={this.formatInputValue()} 
            readOnly={this.isInputReadOnly()} 
            onChange={this.inputOnChange}
            onFocus={this.inputOnFocus}
            onBlur={this.inputOnBlur}/>
          {this.renderSelectedVenueControls()}
          {this.renderMenu()}
        </div>
      </div>
    );
  }

  formatInputValue = () => {
    var v = this.state.selectedVenue;
    if (v) {
      if (v.performanceSpaces.length > 1) {
        var s = this.state.selectedSpace;
        return v.name +': '+ s.name;
      }
      return v.name;
    }
    return this.state.filterQuery;
  }
  isInputReadOnly = () => !!this.state.selectedVenue
  inputOnChange = (e) => this.setState({ filterQuery: e.currentTarget.value })
  inputOnFocus = (e) => this.setState({ menuShowing: true })
  inputOnBlur = (e) => setTimeout(() => this.setState({ menuShowing: false }), 100)

  renderSelectedVenueControls = () => {
    if (!this.state.selectedVenue) 
      return null;
    else return (
      <span> {' '}
        <button onClick={this.clearSelection}>Clear</button>
      </span>
    );
  }

  renderMenu = () => {
    if (!this.state.menuShowing)
      return null;
    else return (
      <div className="selectVenue-menu">
        {this.props.api.venues.map(this.renderVenueMenuItem)}
      </div>
    );
  }
  renderVenueMenuItem = v => {
    if (v.performanceSpaces.length > 1) {
      return (
        <div key={v.id}>
          <div>{v.name}</div>
          <div className="selectVenue-spaceItems">
            {v.performanceSpaces.map(this.renderSpaceMenuItem.bind(this, v))}
          </div>
        </div>
      );
    } else {
      return (
        <div key={v.id}>
          <a href="javascript:;" className="selectVenue-item"
            onMouseDown={this.selectVenue.bind(this, v)}>
            {v.name}
          </a>
        </div>
      );
    }
  }
  renderSpaceMenuItem = (v, s) => (
    <div key={s.id}>
      <a href="javascript:;" className="selectVenue-item"
        onMouseDown={this.selectSpace.bind(this, v, s)}>
        {s.name}
      </a>
    </div>
  );

  selectVenue = v => {
    this.setState({ selectedVenue: v, selectedSpace: v.performanceSpaces[0], filterQuery: null });
  }
  selectSpace = (v, s) => {
    this.setState({ selectedVenue: v, selectedSpace: s, filterQuery: null });
  }

  clearSelection = () => {
    this.setState({ selectedVenue: null, selectedSpace: null });
    this.refs.input.focus();
  }
}

var SelectVenue = Relay.createContainer(SelectVenueComponent, {
  fragments: {
    api: () => Relay.QL`
      fragment on Api {
        id,
        venues {
          id,
          name,
          addressLine1,
          addressLine2,
          city,
          state,
          zip,
          performanceSpaces {
            id,
            name,
            capacity,
            style,
            description,
          }
        }
      }
    `
  },
});

export default SelectVenue;
