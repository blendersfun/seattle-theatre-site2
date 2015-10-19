"use strict";

import Relay from 'react-relay';

window.Relay = Relay;

export default class extends Relay.Route {
  static queries = {
    root: () => Relay.QL`
      query {
        root
      }
    `,
  };
  static routeName = 'AppHomeRoute';
}
