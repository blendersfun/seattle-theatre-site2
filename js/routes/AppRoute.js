"use strict";

import Relay from 'react-relay';

window.Relay = Relay;

export default class extends Relay.Route {
  static queries = {
    api: () => Relay.QL`
      query {
        api
      }
    `,
  };
  static routeName = 'AppRoute';
}
