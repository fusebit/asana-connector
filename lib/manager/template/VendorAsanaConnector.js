const AsanaConnector = require('./imports').ConnectorClass;
const Superagent = require('superagent');

class VendorAsanaConnector extends AsanaConnector {
  constructor() {
    super();
  }

  async getHealth(fusebitContext, userContext) {
    const client = await this.createClient(fusebitContext, userContext);
    try {
      await client.users.me();
    } catch (e) {
      // Only pass through the error code and HTTP status
      const status = e.statusCode || 500;
      return {
        status,
        body: { errorCode: e.code, status, statusCode: status },
      };
    }

    return { status: 200 };
  }
}

module.exports.VendorAsanaConnector = VendorAsanaConnector;
