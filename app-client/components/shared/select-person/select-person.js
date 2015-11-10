"use strict";

import React from 'react';
import {Container} from 'flux/utils';
import PersonSearchStore from './person-search-store';

class SelectPerson extends React.Component {
  render() {
    return (
      <span className="selectPerson">
        <input ref="input" onChange={this.search}/>
      </span>
    );
  }
  search = (e) => {
    e.preventDefault();
    var query = this.refs.input.value;
    if (query !== '') {
      PersonSearchStore.search(query);
    }
  }
}

class SelectPersonContainer extends React.Component {
  static getStores() {
    return [PersonSearchStore];
  }

  static calculateState(prevState) {
    return {
      personSearch: PersonSearchStore.getState(),
    };
  }

  render() {
    return <SelectPerson personSearch={this.state.personSearch}/>;
  }
}

export default Container.create(SelectPersonContainer);
