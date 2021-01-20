const Fs = require('fs');
const Path = require('path');

const getAllFiles = (dirPath, arrayOfFiles) => {
  files = Fs.readdirSync(dirPath)

  arrayOfFiles = arrayOfFiles || []

  files.forEach(function(file) {
    if (Fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles)
    } else {
      arrayOfFiles.push(Path.join(__dirname, dirPath, "/", file))
    }
  })

  return arrayOfFiles
}

const getPackageFiles = (dir, rootDir) => {
  const sliceLen = rootDir.length;
	const fileNames = getAllFiles(dir);
	const packageNames = fileNames.map((f) => f.slice(sliceLen));

  console.log(JSON.stringify(fileNames.map((f, i) => [f, packageNames[i]])));
}

getPackageFiles('../lib', Path.normalize(__dirname + '/../'));
