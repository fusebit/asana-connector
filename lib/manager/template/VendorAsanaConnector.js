const AsanaConnector = require('./imports').ConnectorClass;
const Superagent = require('superagent');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class VendorAsanaConnector extends AsanaConnector {
  async getHealth(fusebitContext, userContext) {
    try {
      const client = await this.createClient(fusebitContext, userContext);
      return {
        status: 200,
        body: { me: await client.users.me(), webhooks: Object.keys(userContext.vendorUserProfile.webhooks).length },
      };
    } catch (e) {
      // Only pass through the error code and HTTP status
      const status = e.statusCode || 500;
      return {
        status,
        body: { errorCode: e.code, status, statusCode: status },
      };
    }
  }

  onCreate(app) {
    super.onCreate(app);

    // MOVE
    const lookupUser = async (req, res, next) => {
      req.params.userContext = await this.getUser(req.fusebit, req.params.vendorUserId, req.params.vendorId);
      next();
    };

    app.get('/:vendorUserId/me', lookupUser, async (req, res) => {
      const response = await this.getHealth(req.fusebit, req.params.userContext);
      res.status(response.status || 200);
      response.body ? res.json(response.body) : res.end();
    });

    app.get('/:vendorUserId/start', lookupUser, async (req, res) => {
      try {
        const client = await this.createClient(req.fusebit, req.params.userContext);

        // Some arbitrary webhook configuration details.
        const resourceId = '1199170056173519'; // Resource of a task
        const webhookFilter = { filters: [{ resource_type: 'task', action: 'changed', fields: ['custom_fields'] }] };

        // Add the new webhook to receive events
        await this.createNewWebhook(req, client, resourceId, webhookFilter);

        // Save the resulting configuration of userContext
        await this.saveUser(req.fusebit, req.params.userContext);
      } catch (e) {
        console.log(`createNewWebhookError: ${e}`);
        return res.status(500).end();
      }

      return res.status(200).end();
    });

    app.get('/:vendorUserId/stop', lookupUser, async (req, res) => {
      return res.status(200).end();
    });

    app.post('/:vendorUserId/webhook/:webhookId', lookupUser, async (req, res) => {
      if (!req.params.userContext) {
        return res.status(410).end();
      }

      let secret = req.headers['x-hook-secret'];
      const signature = req.headers['x-hook-signature'];
      const webhookId = req.params.webhookId;
      const userProfile = req.params.userContext.vendorUserProfile;

      if (secret) {
        // XXX Save the secret for this webhookId
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

      // XXX Cryptographically validate the signature
      secret = userProfile.webhooks[webhookId] && userProfile.webhooks[webhookId].secret;
      if (!secret) {
        // Not a webhook that's known; turn it off.
        return res.status(410).end();
      }

      const calculatedSignature = crypto.createHmac('sha256', secret).update(JSON.stringify(req.body)).digest('hex');

      if (signature !== calculatedSignature) {
        // If the signatures aren't matching, turn it off if it's real, and if it's not who cares?
        console.log(`Signature: ${signature} Secret: ${secret} Calculated: ${calculatedSignature}`);
        console.log(`Failing body: ${JSON.stringify(req.body)}`);
        return res.status(410).end();
      }

      // Dispatch to handler
      try {
        if (this.onWebHookEvent) {
          await this.onWebhookEvent(req);
        }
      } catch (e) {
        console.log(`Failed onWebHookEvent: ${e}`);
      }

      // return 200
      return res.status(200).end();
    });
  }

  // MOVE
  async createNewWebhook(req, client, resourceId, options) {
    const webhookId = uuidv4();
    const target = `${req.fusebit.baseUrl}/${req.params.vendorUserId}/webhook/${webhookId}`;
    const result = await client.webhooks.create(resourceId, target, options);

    // Reload userContext to check if the secret landed
    req.params.userContext = await this.getUser(req.fusebit, req.params.vendorUserId, req.params.vendorId);
    const userProfile = req.params.userContext.vendorUserProfile;

    // Did the secret get recorded for this webhookId?
    if (!userProfile.webhooks[webhookId] || !userProfile.webhooks[webhookId].secret) {
      // Failed, delete and throw an error.
      userProfile.webhooks[webhookId] = { resourceId: result.gid };
      await this.deleteWebhook(req, client, webhookId);
      await this.saveUser(req.fusebit, req.params.userContext);

      throw new Error(`Failed to acquire secret for webhook ${req.params.vendorUserId}/${webhookId}`);
    }

    // Store the resourceId
    userProfile.webhooks[webhookId].resourceId = result.gid;
  }

  async deleteWebhook(req, client, webhookId) {
    const result = await client.webhooks.deleteById(
      req.params.userContext.vendorUserProfile.webhooks[webhookId].resourceId
    );
    delete req.params.userContext.vendorUserProfile.webhook[webhookId];
    return result;
  }

  async deleteAllWebhooks(req, client) {
    await Promise.all(
      Object.keys(req.params.userContext.vendorUserProfile.webhooks).map(async (webhookId) => {
        try {
          await this.deleteWebhook(req, client, webhookId);
        } catch (e) {
          console.log(`Failed to remove webhook: ${req.params.vendorUserId}/${webhookId}: ${e}`);
        }
      })
    );

    // Clear the webhooks
    this.initWebhooks(req);

    // Save the resulting configuration of userContext
    await this.saveUser(req.fusebit, req.params.userContext);
  }
}

module.exports.VendorAsanaConnector = VendorAsanaConnector;
