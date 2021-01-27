/*
This is the uninstallation logic of the Lifecycle Manager. 
*/

const Sdk = require('@fusebit/add-on-sdk');
const Superagent = require('superagent');

module.exports = async (ctx) => {
  // Let the Connector clean up its internal state
  const url = await Sdk.getFunctionUrl(ctx, ctx.fusebit.functionAccessToken);
  !process.env.FUSE_PROFILE && // Skip calling the DELETE on the connector during testing - it does not have access to oauth-connector module on npm
    (await Superagent.delete(url).set('Authorization', `Bearer ${ctx.fusebit.functionAccessToken}`));

  // Destroy the Connector itself
  await Sdk.deleteFunction(ctx, ctx.fusebit.functionAccessToken);

  return { status: 204 };
};
