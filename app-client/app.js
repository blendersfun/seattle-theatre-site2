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
import Account from './components/pages/account';
import CreateOrg from './components/pages/create-org';
import OrgAdmin from './components/pages/org-admin';

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
    
    <Route path="/" 
      component={Home} 
      queries={ApiQueries}/>

    <Route path="/create-account" 
      component={CreateAccount} 
      queries={ApiQueries}/>

    <Route path="/account" 
      component={Account} 
      queries={ApiQueries}/>

    <Route path="/create-org" 
      component={CreateOrg} 
      queries={ApiQueries}/>

    <Route path="/org-admin" 
      component={OrgAdmin} 
      queries={ApiQueries}/>
  </Router>,
  document.getElementById('root')
);
