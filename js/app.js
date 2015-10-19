import 'babel/polyfill';

import App from './components/App';
import AppRoute from './routes/AppRoute';
import React from 'react';
import ReactDOM from 'react-dom';
import Relay from 'react-relay';

ReactDOM.render(
  <Relay.RootContainer
    Component={App}
    route={new AppRoute()}
  />,
  document.getElementById('root')
);
