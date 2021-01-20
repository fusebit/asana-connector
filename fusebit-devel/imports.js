exports.ConnectorClass = require('./lib/connector/AsanaConnector')
exports.createConnectorClass = require('./lib/connector').createAsanaConnector
exports.Dependencies = require('./package.json').dependencies;

//...(!process.env.FUSE_PROFILE && { '@fusebit/oauth-connector': require('../../package.json').version }),


