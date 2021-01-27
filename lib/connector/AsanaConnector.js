const Superagent = require('superagent');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const Asana = require('asana');

const Sdk = require('@fusebit/add-on-sdk');
const { OAuthConnector } = require('@fusebit/oauth-connector');

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

  /**
   * Utility handler to get the current user based on the vendorUserId and, optionally, vendorId encoded in
   * the request parameters.
   */
  lookupUser() {
    const lookup = async (req, res, next) => {
      req.params.userContext = await this.getUser(req.fusebit, req.params.vendorUserId, req.params.vendorId);
      next();
    };
    return lookup;
  }

  /**
   * Create the user profile used for this tokenContext.
   * @param {*} tokenContext An object representing the result of the getAccessToken call. It contains refresh_token.
   */
  async getUserProfile(tokenContext) {
    return {
      id: tokenContext.data.id,
      webhooks: {},
    };
  }

  /**
   * Initialize the AsanaConnector.  The default implementation prepares for webhooks.
   * @param {*} Express router
   */
  onCreate(app) {
    super.onCreate(app);

    // Register the handler for webhooks.
    app.post('/webhook/:vendorUserId/:webhookId', this.lookupUser(), this.httpWebhook());
  }

  /**
   * Create an authenticated Asana client object.
   * @param {FusebitContext} fusebitContext The Fusebit context of the request
   * @param {*} userContext The user context representing the vendor's user. Contains vendorToken and vendorUserProfile, representing responses
   * from getAccessToken and getUserProfile, respectively.
   */
  async createClient(fusebitContext, userContext) {
    const tokenContext = await this.ensureAccessToken(fusebitContext, userContext);
    return Asana.Client.create().useOauth({ credentials: tokenContext.access_token });
  }

  /**
   * Simple basic health check for a particular user, validating the OAuth credentials and reporting on the
   * number of created webhooks.
   * @param {FusebitContext} fusebitContext The Fusebit context of the request
   * @param {*} userContext The user context representing the vendor's user. Contains vendorToken and vendorUserProfile, representing responses
   * from getAccessToken and getUserProfile, respectively.
   */
  async getHealth(fusebitContext, userContext) {
    try {
      const asana = await this.createClient(fusebitContext, userContext);

      return {
        status: 200,
        body: { me: await asana.users.me(), webhooks: Object.keys(userContext.vendorUserProfile.webhooks).length },
      };
    } catch (e) {
      // Only pass through the error code and HTTP status
      const status = e.statusCode || 500;
      return {
        status,
        body: { errorCode: e.code, status, statusCode: status, message: e.message },
      };
    }
  }

  /**
   * Create a new webhook.  Accepts the asana client, a resourceId as a string, and a set of options
   * containing the desired filter for the webhook.  Returns a modified userContext object that must be saved
   * via this.saveUser(fusebitContext, userContext) when the setup phase is completed, otherwise it can be
   * passed in to subsequent createNewWebhook calls as needed.
   * @param {FusebitContext} fusebitContext The Fusebit context.
   * @param {*} userContext The user context representing the vendor's user. Contains vendorToken and vendorUserProfile, representing responses
   * from getAccessToken and getUserProfile, respectively.
   * @param {*} asana An Asana client created through createClient.
   * @param {string} resourceId The numerical resource ID, as a string, that scopes the webhook request.
   * @param {*} options Options for the webhook creation, including whatever filters are desired.
   * @returns {Object} Returns the modified userContext that must be saved via saveUser for the webhook to be
   * usable.
   */
  async createNewWebhook(fusebitContext, userContext, asana, resourceId, options) {
    const webhookId = uuidv4();
    const target = `${fusebitContext.baseUrl}/webhook/${userContext.vendorUserId}/${webhookId}`;

    const result = await asana.webhooks.create(resourceId, target, options);

    // Reload userContext to check if the secret landed
    userContext = await this.getUser(fusebitContext, userContext.vendorUserId);
    const userProfile = userContext.vendorUserProfile;

    // Did the secret get recorded for this webhookId?
    if (!userProfile.webhooks[webhookId] || !userProfile.webhooks[webhookId].secret) {
      // Failed, delete and throw an error.
      userProfile.webhooks[webhookId] = { resourceId: result.gid };
      await this.deleteWebhook(fusebitContext, userContext, client, webhookId);

      throw new Error(`Failed to acquire secret for webhook ${req.params.vendorUserId}/${webhookId}`);
    }

    // Store the resourceId
    userProfile.webhooks[webhookId].resourceId = result.gid;

    await this.saveUser(fusebitContext, userContext);

    // Expect the caller to save the userContext
    return { webhookId, userContext };
  }

  /**
   * Delete the specified webhook. Requires the caller to call saveUser on the userContext in order to
   * complete the operation.
   * @param {FusebitContext} fusebitContext The Fusebit context.
   * @param {*} userContext The user context representing the vendor's user. Contains vendorToken and vendorUserProfile, representing responses
   * from getAccessToken and getUserProfile, respectively.
   * @param {*} asana An Asana client created through createClient.
   * @param string webhookId The id of this webhook.
   * @param boolean saveContext Save the context on completion of the operation (default: true).
   */
  async deleteWebhook(fusebitContext, userContext, asana, webhookId, saveContext = true) {
    const userProfile = userContext.vendorUserProfile;

    if (!userProfile.webhooks[webhookId]) {
      return;
    }

    const result = await asana.webhooks.deleteById(userProfile.webhooks[webhookId].resourceId);
    delete userProfile.webhooks[webhookId];

    if (saveContext) {
      await this.saveUser(fusebitContext, userContext);
    }

    return userContext;
  }

  /**
   * Deletes all of the registered webhooks for a given user in parallel.
   * @param {FusebitContext} fusebitContext The Fusebit context.
   * @param {*} userContext The user context representing the vendor's user. Contains vendorToken and vendorUserProfile, representing responses
   * from getAccessToken and getUserProfile, respectively. Requires the caller to call saveUser on the
   * modified userContext object.
   * @param {*} asana An Asana client created through createClient.
   */
  async deleteAllWebhooks(fusebitContext, userContext, asana) {
    await Promise.all(
      Object.keys(userContext.vendorUserProfile.webhooks).map(async (webhookId) => {
        const msg = `${userContext.vendorUserId}/${webhookId}@${userContext.vendorUserProfile.webhooks[webhookId].resourceId}`;
        try {
          await this.deleteWebhook(fusebitContext, userContext, asana, webhookId, false);
          Sdk.debug(`Removed webhook: ${msg}`);
        } catch (e) {
          Sdk.debug(`Failed to remove webhook: ${msg}: ${e}`);
        }
      })
    );

    // Clear the webhooks
    userContext.vendorUserProfile.webhooks = {};
    await this.saveUser(fusebitContext, userContext);

    return userContext;
  }

  /**
   * Handle webhook registration, when x-hook-secret is present, during the new webhook initialization
   * process.
   */
  async onHttpWebhookRegister(req, res) {
    const secret = req.headers['x-hook-secret'];
    const webhookId = req.params.webhookId;
    const userProfile = req.params.userContext.vendorUserProfile;

    // Save the secret for this webhookId
    if (userProfile.webhooks[webhookId]) {
      userProfile.webhooks[webhookId].secret = secret;
    } else {
      userProfile.webhooks[webhookId] = { secret };
    }

    // Save the secret in the userContext object
    await this.saveUser(req.fusebit, req.params.userContext);

    // Respond with an acknowledgement
    return res.set('X-Hook-Secret', secret).send();
  }

  /**
   * Utility wrapper around the http function to bind it to this object.  In Node v10, arrow functions are not
   * allowed in class definitions, which is how future versions resolve this.
   */
  httpWebhook() {
    return this.onHttpWebhook.bind(this);
  }

  /**
   * Validate the signature supplied on a webhook event POST.
   */
  async validateWebhookEvents(userProfile, webhookId, signature, body) {
    // Cryptographically validate the signature
    const secret = userProfile.webhooks[webhookId] && userProfile.webhooks[webhookId].secret;
    if (!secret) {
      // Not a webhook that's known; turn it off.
      return false;
    }

    const calculatedSignature = crypto.createHmac('sha256', secret).update(JSON.stringify(body)).digest('hex');

    if (signature !== calculatedSignature) {
      return false;
    }

    return true;
  }

  /**
   * Handle webhook creating messages from Asana as well as incoming events, to be dispatched to
   * onWebhookEvent.
   */
  async onHttpWebhook(req, res) {
    if (!req.params.userContext) {
      return res.status(410).end();
    }

    if (req.headers['x-hook-secret']) {
      // Registration/validation of a new webhook.
      return this.onHttpWebhookRegister(req, res);
    }

    const webhookId = req.params.webhookId;
    const userProfile = req.params.userContext.vendorUserProfile;

    if (!(await this.validateWebhookEvents(userProfile, webhookId, req.headers['x-hook-signature'], req.body))) {
      // Use 410 for anything that fails the signature check as a way of turning off the failing webhook
      // overtly on the remote end if the cryptography is broken.
      return res.status(410).end();
    }

    // Dispatch to handler
    try {
      await this.onWebhookEvent(req.fusebit, req.params.userContext, webhookId, req.body.events);
    } catch (e) {
      Sdk.debug(`Failed onWebHookEvent: ${e}`);
    }

    // return 200
    return res.status(200).end();
  }

  /**
   * Handle the events for the registered webhook.
   * @param {FusebitContext} fusebitContext The Fusebit context of the request
   * @param {*} userContext The user context representing the vendor's user. Contains vendorToken and vendorUserProfile, representing responses
   * from getAccessToken and getUserProfile, respectively.
   * @param string webhookId The id of this webhook.
   * @param {*} events An array of events for this webhook.
   */
  async onWebhookEvent(fusebitContext, userContext, webhookId, events) {
    Sdk.debug(`Executing default webhook handler`);
  }
}

exports.AsanaConnector = AsanaConnector;
