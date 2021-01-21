const Sdk = require('@fusebit/add-on-sdk');
const { OAuthConnector } = require('@fusebit/oauth-connector');
const Superagent = require('superagent');

const Asana = require('asana');

const httpError = (res, status, message) => {
  res.status(status);
  res.send({
    status,
    statusCode: status,
    message,
  });
};

class AsanaConnector extends OAuthConnector {
  constructor() {
    super();
  }

  onCreate(app) {
    super.onCreate(app);
  }

  async getEventResponse(fusebitContext, event) {
    return { status: 200 };
  }

  async createClient(fusebitContext, userContext) {
    const tokenContext = await this.ensureAccessToken(fusebitContext, userContext);
    return Asana.Client.create().useOauth({ credentials: tokenContext.access_token });
  }

  async getUserProfile(tokenContext) {
    return {
      id: tokenContext.data.id,
    };
  }
}

exports.AsanaConnector = AsanaConnector;
