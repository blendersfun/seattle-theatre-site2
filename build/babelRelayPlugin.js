var getbabelRelayPlugin = require('babel-relay-plugin');
var schema = require('../app-server/schema.json');

module.exports = getbabelRelayPlugin(schema.data);