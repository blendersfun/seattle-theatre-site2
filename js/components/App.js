"use strict";

/* 
   This is me playing around trying to understand how to use relay
   and specifically the graphql-relay connection module to implement
   pagination. I had trouble figuring out how to paginate both forward
   and backward and therefore ended up using relay variables to progressively
   increase the bounds of the data I was fetching and do the slicing down
   of the dataset in the react component. I'm not sure if this is proper
   usage, but I could not otherwise figure out how to move my selection
   forwards and backwards as I pleased via only graphql queries and variables.

   Perhaps the "connection" types are only a sort of basic demonstration of
   what one might do to implement pagination and are not intended for this
   more complex (but thoroughly commonplace) usecase?
 */

import React from 'react';
import Relay from 'react-relay';

var PAGE_SIZE = 8;

class App extends React.Component {
  render() {
    var pageInfo = this.props.root.producingOrgs.pageInfo;
    var offset = this.state.offset;
    return (
      <div>
        <h1>Producing Organizations</h1>
        
        <ul>
          {this.props.root.producingOrgs.edges.slice(offset, offset + PAGE_SIZE).map(edge =>
            <li key={edge.node.id}>{edge.node.name}</li>
          )}
        </ul>
        {this.hasPrev() ? <a onClick={this.previousPage} href="javascript:;"> ← Previous</a> : "← Previous"}
        {' '}
        {this.hasNext() ? <a onClick={this.nextPage} href="javascript:;"> Next → </a> : "Next →"}
      </div>
    );
  }
  state = {
    offset: 0
  }
  hasNext = () => this.state.offset + PAGE_SIZE <= this.props.root.producingOrgs.edges.length
  hasPrev = () => this.state.offset > 0
  nextPage = () => {
    var pageInfo = this.props.root.producingOrgs.pageInfo;
    if (pageInfo.hasNextPage) {
      this.props.relay.setVariables({
        first: this.props.relay.variables.first + PAGE_SIZE
      });
      setTimeout(() => {
        this.setState({
          offset: this.state.offset + PAGE_SIZE
        });
      }, 100);
    } else if (this.hasNext()) {
      this.setState({
        offset: this.state.offset + PAGE_SIZE
      });
    }
  }
  previousPage = () => {
    if (this.state.offset > 0) {
      this.setState({
        offset: this.state.offset - PAGE_SIZE
      });
    }
  }
}

export default Relay.createContainer(App, {
  initialVariables: {
    first: PAGE_SIZE
  },
  fragments: {
    root: () => Relay.QL`
      fragment on Root {
        producingOrgs(first: $first) {
          edges {
            cursor,
            node {
              id,
              name,
              missionStatement
            } 
          },
          pageInfo {
            hasNextPage,
            hasPreviousPage
          }
        }
      }
    `,
  },
});
