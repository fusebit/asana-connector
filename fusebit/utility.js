const fs = require('fs');
const path = require('path');

const getAllFiles = (dirPath, arrayOfFiles) => {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function (file) {
    if (fs.statSync(dirPath + '/' + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + '/' + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, '/', file));
    }
  });

  return arrayOfFiles;
};

const getPackageFiles = (dir, rootDir) => {
  const fileNames = getAllFiles(dir);
  const packageNames = fileNames.map((f) => f.slice(rootDir.length));

  return packageNames
    .map((f, i) => [f, fileNames[i]])
    .reduce((a, c) => {
      a[c[0]] = fs.readFileSync(c[1], { encoding: 'utf8' });
      return a;
    }, {});
};

exports.getPackageFiles = getPackageFiles;
