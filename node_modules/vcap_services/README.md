# VCAP_SERVICES

[![Build Status](https://travis-ci.org/germanattanasio/vcap-services.svg?branch=master)](http://travis-ci.org/germanattanasio/vcap-services)
[![Coverage Status](https://coveralls.io/repos/germanattanasio/vcap-services/badge.svg?branch=master&service=github)](https://coveralls.io/github/germanattanasio/vcap-services?branch=master)
[![npm-version](https://img.shields.io/npm/v/vcap_services.svg)](https://www.npmjs.com/package/vcap_services)
[![npm-downloads](https://img.shields.io/npm/dm/vcap_services.svg)](https://www.npmjs.com/package/vcap_services)

Parse and return service credentials from `VCAP_SERVICES` environment variable that [Bluemix] provides.

## Installation

```sh
$ npm install vcap_services --save
```

## Usage

```javascript
var vcapServices = require('vcap_services');
var credentials = vcapServices.findCredentials({ service: 'personality_insights' });
console.log(credentials);
```

If `VCAP_SERVICES` is:
```json
{
  "personality_insights": [{
      "credentials": {
        "password": "<password>",
        "url": "<url>",
        "username": "<username>"
      },
    "label": "personality_insights",
    "name": "personality-insights-service",
    "plan": "standard"
  }]
}
```

Output:
```json
{
  "password": "<password>",
  "url": "<url>",
  "username": "<username>"
}
```

### Getting credentials for a specific plan

Get credentials that match a specific service plan (only for `VCAP_SERVICES`).
```javascript
var vcapServices = require('vcap_services');
var credentials = vcapServices.findCredentials({ service: 'personality_insights', instance: { plan: 'standard' } });
console.log(credentials);
```

### Getting credentials for a specific instance
Get credentials that match a specific service instance (replace "YOUR NLC NAME" with the name of your service instance).
```javascript
var vcapServices = require('vcap_services');
var credentials = vcapServices.findCredentials({ service: 'natural_language_classifier', { instance: { name: 'YOUR NLC NAME' } });
console.log(credentials);
```

### Getting credentials for a specific plan and instance
Get credentials that match a specific service plan and instance (replace "YOUR NLC NAME" with the name of your service instance).
```javascript
var vcapServices = require('vcap_services');
var credentials = vcapServices.findCredentials({ service: 'natural_language_classifier', instance: { plan: 'standard', name: 'YOUR NLC NAME' } });
console.log(credentials);
```

### Getting credentials for a specific tag
Get credentials that match a specific service tag, regardless of the service type.
```javascript
var vcapServices = require('vcap_services');
var credentials = vcapServices.findCredentials({ instance: { tags: 'object-storage' } });
console.log(credentials);
```

## Tests
Running all the tests:
```sh
$ npm test
```

Running a specific test:
```sh
$ mocha -g '<test name>'
```


## License

MIT.

## Contributing
See [CONTRIBUTING](https://github.com/germanattanasio/vcap-services/blob/master/CONTRIBUTING.md).

[Bluemix]: http://bluemix.net/
