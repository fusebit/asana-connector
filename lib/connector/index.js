const { AsanaConnector } = require('./AsanaConnector');
const { createOAuthConnector } = require('@fusebit/oauth-connector');

exports.AsanaConnector = AsanaConnector;
exports.createAsanaConnector = createOAuthConnector;
