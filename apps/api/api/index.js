const { getServer } = require('../dist/serverless');

module.exports = async function handler(request, response) {
  const server = await getServer();

  return server(request, response);
};
