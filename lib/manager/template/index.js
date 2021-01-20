const { VendorAsanaConnector } = require('./VendorAsanaConnector');
const { createAsanaConnector } = require('@fusebit/asana-connector');

module.exports = createAsanaConnector(new VendorAsanaConnector());
