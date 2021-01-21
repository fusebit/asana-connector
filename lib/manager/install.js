/*
This is the installation logic of the Lifecycle Manager. 
*/

const Fs = require('fs');
const Path = require('path');

const Sdk = require('@fusebit/add-on-sdk');

const ExtraTemplateFiles = require('../../imports').ExtraTemplateFiles;

const getTemplateFiles = (fileNames) =>
  fileNames.reduce((a, c) => {
    a[c] = Fs.readFileSync(__dirname + `/template/${c}`, { encoding: 'utf8' });
    return a;
  }, {});

module.exports = async (ctx) => {
  const configuration = {
    debug: '1',
    ...ctx.body.configuration,
  };

  // Create the Connector
  await Sdk.createFunction(
    ctx,
    {
      configurationSerialized: `# Connector configuration settings
${Object.keys(configuration)
  .sort()
  .map((k) => `${k}=${configuration[k]}`)
  .join('\n')}
`,
      nodejs: {
        files: {
          ...getTemplateFiles(['index.js', 'VendorAsanaConnector.js']),
          ...ExtraTemplateFiles,
          'package.json': {
            engines: {
              node: '10',
            },
            dependencies: {
              // Use the same version of @fusebit/oauth-connector as in this package.
              // However, skip the dependency entirely if this is a test run, since the npm
              // module may not yet have been published.
              ...require('../../imports').Dependencies,
              // The following are declared as peerDependencies of @fusebit/oauth-connector
              // and the versions must match those in top level package.json
              superagent: '6.1.0',
            },
          },
        },
      },
      metadata: {
        fusebit: {
          editor: {
            navigationPanel: {
              hideFiles: [],
            },
          },
        },
        ...ctx.body.metadata,
      },
      security: {
        functionPermissions: {
          allow: [
            {
              action: 'storage:*',
              resource: `/account/${ctx.accountId}/subscription/${ctx.subscriptionId}/storage/boundary/${ctx.body.boundaryId}/function/${ctx.body.functionId}/`,
            },
            {
              action: 'function:*',
              resource: `/account/${ctx.accountId}/subscription/${ctx.subscriptionId}/`,
            },
          ],
        },
        authentication: 'optional',
      },
    },
    ctx.fusebit.functionAccessToken
  );

  return { status: 200, body: { status: 200 } };
};
