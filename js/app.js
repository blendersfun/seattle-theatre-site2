import 'babel/polyfill';

import React from 'react';
import ReactDOM from 'react-dom';
import Relay from 'react-relay';
import {Router, Route} from 'react-router';
import ReactRouterRelay from 'react-router-relay';
import {createHistory} from 'history';

import App from './components/App';
import OtherPage from './components/OtherPage';

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
    
    <Route path="/" component={App} queries={ApiQueries}/>
    <Route path="/other" component={OtherPage} queries={ApiQueries}/>
  </Router>,
  document.getElementById('root')
);
