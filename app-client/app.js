import 'babel/polyfill';

import React from 'react';
import ReactDOM from 'react-dom';
import Relay from 'react-relay';
import {Router, Route} from 'react-router';
import ReactRouterRelay from 'react-router-relay';
import history from './utils/history';

require("!style!raw!less!./style.less");

import Home from './components/pages/home';
import CreateAccount from './components/pages/create-account';
import Account from './components/pages/account';
import CreateOrg from './components/pages/create-org';
import OrgAdmin from './components/pages/org-admin';
import AddProduction from './components/pages/org-admin/add-production';
import ManageOrgs from './components/pages/manage-orgs';

var ApiQueries = {
  api: (Component) => Relay.QL`
    query {
      api {
        ${Component.getFragment('api')}
      }
    }
  `,
};

ReactDOM.render(
  <Router 
    history={history}
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

    <Route path="/org-admin/:orgId" 
      component={OrgAdmin} 
      queries={ApiQueries}/>

    <Route path="/org-admin/:orgId/add-production" 
      component={AddProduction} 
      queries={ApiQueries}/>

    <Route path="/orgs-admin" 
      component={ManageOrgs} 
      queries={ApiQueries}/>
  </Router>,
  document.getElementById('root')
);
