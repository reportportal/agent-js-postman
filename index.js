module.exports = require('./lib');

let RPClient = require('reportportal-client');

const client = new RPClient({});

client.checkConnect().catch(console.log);

console.log('done')