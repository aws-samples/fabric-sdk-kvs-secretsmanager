const SecretsManagerKVS = require('../index');
const assert = require('assert');

let kvs;
describe('Test SecretsManagerKVS', () => {
  it('Test constructor', async () => {
    kvs_promise = new SecretsManagerKVS({
      url: 'https://secretsmanager.us-east-1.amazonaws.com',
      region: 'us-east-1',
      profile: 'test'
    });

    kvs = await kvs_promise
  });

  it('Test getValue', async () => {
    const res = await kvs.getValue('test');
    assert.equal(res, 'case');
  });

  it('Test setValue', async () => {
    await kvs.setValue('test', 'case');
    const res = await kvs.getValue('test');
    assert.equal(res, 'case');
  });
});
