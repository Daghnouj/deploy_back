const NodeGeocoder = require('node-geocoder');

const options = {
  provider: 'openstreetmap',
  httpAdapter: 'https',
  userAgent: 'SolidarityApp/1.0',
  timeout: 5000
};

module.exports = NodeGeocoder(options);