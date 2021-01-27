const AsanaConnector = require('./imports').ConnectorClass;
const Sdk = require('@fusebit/add-on-sdk');

class VendorAsanaConnector extends AsanaConnector {
  onCreate(app) {
    super.onCreate(app);

    // Unsecured: Convinenence function to respond with the user details from the Asana user.
    app.get('/:vendorUserId/me', this.lookupUser(), async (req, res) => {
      const fusebitContext = req.fusebit;
      const userContext = req.params.userContext;

      const response = await this.getHealth(fusebitContext, userContext);

      res.status(response.status || 200);
      response.body ? res.json(response.body) : res.end();
    });

    // Unsecured: Example function illustrating how to create a webhook for a user.
    app.get('/:vendorUserId/start', this.lookupUser(), async (req, res) => {
      const fusebitContext = req.fusebit;
      const userContext = req.params.userContext;

      try {
        const client = await this.createClient(fusebitContext, userContext);

        // Some arbitrary webhook configuration details.
        const resourceId = '1199170056173519'; // Example resource of a task
        const webhookFilter = { filters: [{ resource_type: 'task', action: 'changed', fields: ['custom_fields'] }] };

        // Add the new webhook to receive events
        const webhook = await this.createNewWebhook(fusebitContext, userContext, client, resourceId, webhookFilter);

        // Use the updated userContext object from createNewWebhook, otherwise the webhook information may be
        // lost.
        userContext = webhook.userContext;

        console.log(`Webhook ${webhook.webhookId} created`);
      } catch (e) {
        Sdk.debug(`createNewWebhookError: ${e}`);
        return res.status(500).end();
      }

      return res.status(200).end();
    });

    // Unsecured: Removes all of the webhooks for the user specified by vendorUserId.
    app.get('/:vendorUserId/stop', this.lookupUser(), async (req, res) => {
      // Remove the webhooks
      await this.deleteAllWebhooks(
        req.fusebit,
        req.params.userContext,
        await this.createClient(req.fusebit, req.params.userContext)
      );

      return res.status(200).end();
    });
  }

  // Handle webhook events when they come in.  Store context and type using webhookId as the key within the
  // userContext.vendorUserProfile object.
  async onWebhookEvent(fusebitContext, userContext, webhookId, events) {
    Sdk.debug(`Webhook Events ${webhookId}: ${JSON.stringify(events)}`);
  }
}

module.exports.VendorAsanaConnector = VendorAsanaConnector;
