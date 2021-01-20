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

    const authorizeNotificationRequest = this.authorize({
      action: 'function:execute',
      resourceFactory: (req) =>
        `/account/${req.fusebit.accountId}/subscription/${req.fusebit.subscriptionId}/boundary/${req.fusebit.boundaryId}/function/${req.fusebit.functionId}/`,
    });

    const postNotification = async (req, res) => {
      if (!req.params.userContext) {
        return httpError(res, 404, 'Not found');
      } else {
        Sdk.debug(`Sending notification to user ${req.params.userContext.vendorUserId}`);
        let response;
        try {
          const client = await this.createClient(req.fusebit, req.params.userContext);
          response = (await this.sendNotification(req.fusebit, req.params.userContext, client)) || { status: 200 };
        } catch (e) {
          Sdk.debug(`Error sending notification: ${e.message}`);
          return httpError(res, 500, `Error sending notification: ${e.message}`);
        }
        res.status(response.status || 200);
        response.body ? res.json(response.body) : res.end();
      }
    };

    const respondToService = async (ctx) => {
      // Webhook handshake handling
      if (ctx.header && ctx.header['X-Hook-Secret']) {
        // Store the X-Hook-Secret with the client that's making the request so it can be used to verify
        // future webhook events.
        return { headers: { ['X-Hook-Secret']: ctx.header['X-Hook-Secret'] }, body: {} };
      }

      // Call back to itself to dispatch, wait 100ms, and confirm success to avoid any expected completion
      // time restrictions.
      try {
        Superagent.post(ctx.baseUrl + '/event?dispatch')
          .set(ctx.headers)
          .send(ctx.body)
          .end();
        Sdk.debug('Dispatch request to self completed with success');
      } catch (e) {
        // We silently ignore errors here, have to look at realtime logs
        Sdk.debug('Dispatch request to self completed with error', e);
      }

      const response = await this.getEventResponse(ctx, ctx.body);
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(response);
        }, 100);
      });
    };

    const handleEvent = async (req, res) => {
      const ctx = req.fusebit;
      try {
        verifyRequestSignature({
          signingSecret: ctx.configuration.signing_secret,
          requestSignature: ctx.headers['x-hook-signature'],
          body: JSON.stringify(ctx.body),
        });
      } catch (e) {
        Sdk.debug('New event signature verification failed', JSON.stringify(ctx.body, null, 2));
        return httpError(res, 403, 'Not authorized');
      }

      let response;
      try {
        if (ctx.query.dispatch !== undefined) {
          Sdk.debug('Received event from self for asynchronous processing');
          response = (await this.onEvent(ctx, ctx.body)) || { status: 200 };
        } else {
          Sdk.debug('Received new event');
          response = (await respondToService(ctx)) || { status: 200 };
        }
      } catch (e) {
        Sdk.debug(`Error processing event: ${e.message}`);
        return httpError(res, 500, `Error processing event: ${e.message}`);
      }
      res.status(response.status || 200);
      response.body ? res.json(response.body) : res.end();
    };

    const lookupUser = async (req, res, next) => {
      // req.params.vendorId may be undefined
      req.params.userContext = await this.getUser(req.fusebit, req.params.vendorUserId, req.params.vendorId);
      next();
    };

    // Send notification to a user identified with user ID, or with foreign vendor ID and foreign user ID
    app.post(
      ['/notification/:vendorUserId', '/notification/:vendorId/:vendorUserId'],
      authorizeNotificationRequest,
      lookupUser,
      postNotification
    );

    // Accept events
    app.post('/event', (req, res) => {
      req.fusebit.configuration.signing_secret
        ? handleEvent(req, res)
        : httpError(
            res,
            501,
            `Not implemented. The connector is not configured to receive events. Please specify the 'signing_secret' configuration property and register the Request URL.`
          );
    });
  }

  async getEventResponse(fusebitContext, event) {
    return { status: 200 };
  }

  async createClient(fusebitContext, userContext) {
    const tokenContext = await this.ensureAccessToken(fusebitContext, userContext);
    return Asana.Client.create().useOauth({ credentials: tokenContext.access_token });
  }

  async getUserProfile(tokenContext) {
    const id =
      tokenContext.authed_user && tokenContext.authed_user.id
        ? this.getUniqueUserId(tokenContext.team && tokenContext.team.id, tokenContext.authed_user.id)
        : undefined;

    return {
      id,
      user_id: tokenContext.authed_user && tokenContext.authed_user.id,
      app_id: tokenContext.app_id,
      team_id: tokenContext.team && tokenContext.team.id,
    };
  }

  getUniqueUserId(teamId, userId) {
    return `${encodeURIComponent(teamId)}/${encodeURIComponent(userId)}`;
  }
}

exports.AsanaConnector = AsanaConnector;
