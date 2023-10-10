// @ts-check

const path = require('path');
const fs = require('fs');
const { createGzip } = require('zlib');
const { pipeline } = require('stream');
const { createReadStream, createWriteStream } = require('fs');
const { promisify } = require('util');
const pipe = promisify(pipeline);

async function doGzip(input, output) {
  const gzip = createGzip({
    level: 9,
  });
  const source = createReadStream(input);
  const destination = createWriteStream(output);
  await pipe(source, gzip, destination);
}

function doCompress(input) {
  return doGzip(input, `${input}.gz`);
}

const publicFolderPath = path.join(__dirname, 'docker-prod-output-static');
const files = fs.readdirSync(publicFolderPath);
const jsFileName = files.find((file) => file.endsWith('.js'));
if (jsFileName === undefined) {
  throw new Error('No js file found.');
}
const jsFilePath = path.join(publicFolderPath, jsFileName);
const indexHtmlFilePath = path.join(publicFolderPath, 'index.html');
const indexCssFilePath = path.join(publicFolderPath, 'index.css');

Promise.all([jsFilePath, indexHtmlFilePath, indexCssFilePath].map(doCompress)).catch(() => {
  process.exit(1);
});
