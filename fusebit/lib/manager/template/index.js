const { VendorAsanaConnector } = require('./VendorAsanaConnector');
const createAsanaConnector = require('./imports').createConnectorClass;

module.exports = createAsanaConnector(new VendorAsanaConnector());
