import 'babel/polyfill';

import React from 'react';
import ReactDOM from 'react-dom';
import Relay from 'react-relay';
import {Router, Route} from 'react-router';
import ReactRouterRelay from 'react-router-relay';
import {createHistory} from 'history';

require("!style!raw!less!./style.less");

import Home from './components/pages/home';
import CreateAccount from './components/pages/create-account';

var ApiQueries = {
  api: (Component) => Relay.QL`
    query {
      api {
        ${Component.getFragment('api')},
      },
    }
  `,
};

ReactDOM.render(
  <Router 
    history={createHistory()}
    createElement={ReactRouterRelay.createElement}>
    
    <Route path="/" component={Home} queries={ApiQueries}/>
    <Route path="/create-account" component={CreateAccount} queries={ApiQueries}/>
  </Router>,
  document.getElementById('root')
);
