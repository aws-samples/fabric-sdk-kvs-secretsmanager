// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
const debug = require('debug')('SecretsManagerKVS');
var AWS = require('aws-sdk');

AWS.config.update({
    maxRetries: 2,
    httpOptions: {
        timeout: 30000,
        connectTimeout: 5000
    }
});

module.exports = class SecretsManagerKVS {
    constructor(options) {
        debug('Enter Constructor, options are %j', options);
        if(!options.region) {
            throw new Error('Missing Required region in options');
        }
        if(!options.url) {
            throw new Error('Missing Required url in options');
        }
        if(!options.profile) {
            throw new Error('Missing Required profile in options');
        }

        // These credentials should come from IAM role attached to the lambda function or EC2, For testing, set it from local file
        //var credentials = new AWS.SharedIniFileCredentials({profile: options.profile});
        //AWS.config.credentials = credentials;

        this.url = options.url;
        this.region = options.region;
        return new Promise((resolve, reject) => {
            this.SecretsManagerClient = new AWS.SecretsManager({
                endpoint: this.url,
                region: this.region
            });
            return resolve(this);
        });
    }

    async getValue(secretName) {
        debug('getValue with name %s', secretName);
        try {
            var promise = this.SecretsManagerClient.getSecretValue({
                SecretId: secretName
            }).promise();
            return await promise.then(
                function(data) {
                    // Depending on whether the secret was a string or binary, one of these fields will be populated
                    var secret = "";
                    if(data.SecretString !== "") {
                        secret = data.SecretString;
                        console.dir(secret);
                    } else {
                        secret = data.SecretBinary;
                        debug(secret);
                    }

                    debug('getValue found -> %j <- from AWS', secret);
                    if(!secret) {
                        return null;
                    }
                    return secret;
                },
                function(err) {
                    if(err.code === 'ResourceNotFoundException')
                        debug("The requested secret " + secretName + " was not found");
                    else if(err.code === 'InvalidRequestException')
                        debug("The request was invalid due to: " + err.message);
                    else if(err.code === 'InvalidParameterException')
                        debug("The request had invalid params: " + err.message);
                    else {
                        debug("The request failed: " + err.message);
                    }
                    return null;
                }
            );


        } catch (e) {
            debug('getValue error %s', e.message);
            throw e;
        }
    }

    async setValue(secretName, secretValue) {
        try {
            debug('setValue with name %s, value %j', secretName, secretValue);
            var client = this.SecretsManagerClient;
            var promise = this.SecretsManagerClient.getSecretValue({
                SecretId: secretName
            }).promise();

            return await promise.then(
                function(data) {
                    // Overwrite the value
                    var promise = client.putSecretValue({
                        SecretId: secretName,
                        SecretString: secretValue
                    }).promise();

                    return promise.then(
                        function(data) {
                            debug(data); // successful response
                        },
                        function(err) {
                            debug(err, err.stack); // an error occurred
                            throw err;
                        }
                    );
                },
                function(err) {
                    if(err.code === 'ResourceNotFoundException') {
                        debug("The requested secret " + secretName + " was not found");
                        // create one
                        var promise = client.createSecret({
                            Name: secretName,
                            SecretString: secretValue
                        }).promise();

                        return promise.then(
                            function(data) {
                                debug(data); // successful response
                            },
                            function(err) {
                                debug(err, err.stack); // an error occurred
                                throw err;
                            }
                        );
                    } else if(err.code === 'InvalidRequestException') {
                        debug("The request was invalid due to: " + err.message);
                        throw err;
                    } else if(err.code === 'InvalidParameterException') {
                        debug("The request had invalid params: " + err.message);
                        throw err;
                    } else {
                        debug("The request has failed: " + err.message);
                        throw err;
                    }

                }
            );

        } catch (e) {
            debug('setValue error %s', e.message);
            throw e;
        }
    }
};