var environments = {};

environments.production = {
  port: 3000,
  name: 'production',
  secret: 'IL$R&C0V'
};

environments.staging = {
  port:3000,
  name: 'staging',
  secret: '1#AL&C!B'
};

environments.development = {
  port: 3000,
  name: 'development',
  secret: '#AU&C!'
}

module.exports = environments[process.env.NODE_ENV] || environments.development;
