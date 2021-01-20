/*
This is the installation logic of the Lifecycle Manager. 
*/

const Fs = require('fs');
const Sdk = require('@fusebit/add-on-sdk');
const Path = require('path');

const getAllFiles = (dirPath, arrayOfFiles) => {
  const files = Fs.readdirSync(dirPath)

  arrayOfFiles = arrayOfFiles || []

  files.forEach(function(file) {
    if (Fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles)
    } else {
      arrayOfFiles.push(Path.join(dirPath, "/", file))
    }
  })

  return arrayOfFiles
}

const getPackageFiles = (dir, rootDir) => {
	const fileNames = getAllFiles(dir);
	const packageNames = fileNames.map((f) => f.slice(rootDir.length));

  return packageNames.map((f, i) => [f, fileNames[i]]).reduce((a, c) => {
    a[c[0]] = Fs.readFileSync(c[1], { encoding: 'utf8' });
    return a;
  }, {});
}

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
          'imports.js': Fs.readFileSync(Path.normalize(__dirname + '/../../imports.js'), { encoding: 'utf8' }),
          ...getPackageFiles(Path.normalize(__dirname + '/../../lib'), Path.normalize(__dirname + '/../../')),
          'package.json': {
            engines: {
              node: '10',
            },
            dependencies: {
              // Use the same version of @fusebit/oauth-connector as in this package.
              // However, skip the dependency entirely if this is a test run, since the npm
              // module may not yet have been published.
              ...(!process.env.FUSE_PROFILE && { '@fusebit/oauth-connector': require('../../package.json').version }),
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
