const { getPackageFiles } = require('./utility');

let basePath;
let extraTemplateFiles = {
  'imports.js': fs.readFileSync('./imports.js', { encoding: 'utf8' }),
  'utility.js': fs.readFileSync('./utility.js', { encoding: 'utf8' }),
};

const libPath = __dirname + '/lib';

if (fs.existsSync(libPath) && fs.lstatSync(libPath).isDirectory()) {
  basePath = '.';
  extraTemplateFiles = {
    ...extraTemplateFiles,
    ...getPackageFiles(path.normalize(libPath), path.normalize(__dirname + '/')),
  };
} else {
  basePath = '@fusebit/asana-connector';
}

exports.ConnectorClass = require(`${basePath}/lib/connector/AsanaConnector`).AsanaConnector;
exports.createConnectorClass = require(`${basePath}/lib/connector`).createAsanaConnector;
exports.Dependencies = require('./package.json').dependencies;
exports.Manager = require(`${basePath}/lib/manager`);
exports.ExtraTemplateFiles = extraTemplateFiles;
