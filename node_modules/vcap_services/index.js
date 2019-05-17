'use strict';

/**
 * if VCAP_SERVICES exists or the instance name exists in the
 * environment, then it returns the credentials
 * for the last service that starts with 'name' or {} otherwise
 * If plan is specified it will return the credentials for
 * the service instance that match that plan or {} otherwise
 * @param  String name, service name
 * @param  String plan, service plan
 * @param  String iname, instance name
 * @param  String tag, tag
 * @return {Object} the service credentials or {} if
 * name is not found in VCAP_SERVICES or instance name
 * is set as an environmental variable. Env let must be
 * upper case.
 */
const getCredentials = function(name, plan, iname, tag) {
  if (process.env.VCAP_SERVICES) {
    let services = JSON.parse(process.env.VCAP_SERVICES);
    for (let service_name in services) {
      if (service_name.indexOf(name) === 0) {
        for (let i = services[service_name].length - 1; i >= 0; i--) {
          let instance = services[service_name][i];
          if ((!plan || plan === instance.plan) && (!iname || iname === instance.name) && (!tag || (instance.tags || []).includes(tag)))
            return instance.credentials || {};
        }
      }
    }
  }
  return iname ? getCredentialsFromInstanceNameEnv(iname) : {};
}

/**
 * Find the last service credentials matching service and instance filter(s)
 * @example <caption>Filter on service name</caption>
 * findCredentials({ service: 'mongodb' })
 * @example <caption>Filter on service name and instance name</caption>
 * findCredentials({ service: 'mongodb', instance: { name: 'mongo-crm' })
 * @example <caption>Filter on instance tag</caption>
 * findCredentials({ instance: { tags: 'object-storage' })
 * @param {Object} filters - service/instance filters, all of which must match
 * @param {string} filters service - service name to filter on
 * @param {Object} filters instance - service instance properties to filter on
 * @return {Object} - matching credentials, or {} if none found
 */
const findCredentials = function(filters) {
  if (!filters || typeof filters != 'object') {
    return {};
  }

  let service_intances = vcapServicesToFindFrom(filters.service);
  let instance_filters = filters.instance || {};

  for (let i = service_intances.length - 1; i >= 0; i--) {
    let instance = service_intances[i];
    if (!serviceInstanceMatchesFilters(instance, instance_filters)) {
      continue;
    }
    if (instance.credentials) {
      return instance.credentials;
    }
  }

  return instance_filters.name ? getCredentialsFromInstanceNameEnv(instance_filters.name) : {};
}

/**
 * Get the VCAP services to find credentials from.
 * @example <caption>Service name by string</caption>
 * // returns service(s) named "redis", i.e. VCAP_SERVICES.redis
 * vcapServicesToFindFrom('redis')
 * @example <caption>Service name matching RegExp</caption>
 * // returns service(s) named starting with "redis-", e.g. VCAP_SERVICES.redis-db
 * vcapServicesToFindFrom(/^redis/)
 * @example <caption>All services</caption>
 * // returns all services in a flattened array
 * vcapServicesToFindFrom()
 * @param {(RegExp,string)} [service_filter=] - filter to limit by service name
 * @return {Object[]}
 */
const vcapServicesToFindFrom = function(service_filter) {
  let vcap_services = process.env.VCAP_SERVICES ? JSON.parse(process.env.VCAP_SERVICES) : {};

  if (service_filter instanceof RegExp) {
    let services = [];
    for (let service_name in vcap_services) {
      if (service_filter.test(service_name)) {
        services.push(vcap_services[service_name]);
      }
    }
    return [].concat.apply([], services);
  } else if (typeof service_filter == 'undefined') {
    return [].concat.apply([], Object.values(vcap_services));
  } else {
    return vcap_services[service_filter] || [];
  }
}

/**
 * Tests whether a service instance matches all supplied filters.
 * @example <caption>Match on single string property</caption>
 * // returns true
 * serviceInstanceMatchesFilters({ name: 'redis-instance' }, { name: 'redis-instance' }))
 * @example <caption>Match on multiple string properties</caption>
 * // returns false
 * serviceInstanceMatchesFilters({ name: 'redis-instance', plan: 'free' }, { name: 'redis-instance', plan: 'standard' }))
 * @example <caption>Match on array property</caption>
 * // returns true
 * serviceInstanceMatchesFilters({ tags: ['storage'] }, { tags: 'storage' }))
 * @param {Object} instance - the instance to test.
 * @param {Object} filters - the filters to match with, each being a string.
 * @return {boolean}
 */
const serviceInstanceMatchesFilters = function(instance, filters) {
  for (let filter_property in filters) {
    let filter_value = filters[filter_property];
    if (!instance[filter_property]) {
      return false;
    }
    if (Array.isArray(instance[filter_property])) {
      if (!instance[filter_property].includes(filter_value)) {
        return false;
      }
    }  else if (instance[filter_property] != filter_value) {
      return false;
    }
  }
  return true;
}

/**
 * Fetch credentials from env var named after instance.
 * @param {string} iname - the service instance name.
 * @return {Object} - credentials if found, else {}.
 */
const getCredentialsFromInstanceNameEnv = function(instance_name) {
  let env = process.env;
  let instance = {};

  instance_name = instance_name.toUpperCase().replace(/[\s&-]/g, '_');
  if (env[instance_name]) {
    try {
      instance = JSON.parse(env[instance_name]);
    } catch(e) {
      console.warn('Error parsing JSON from process.env.' + instance_name);
      console.warn(e);
    }
  }

  return instance;
};

/**
 * Returns the credentials that match the service label
 * pass credentials in the following format:
 * {
 *  "watson_conversation_username": "username",
 *  "watson_conversation_password": "password",
 * }
 * @param {string} serviceLabel The service label
 * @param {object} credentials The credentials from starterkit
 */
const getCredentialsFromLocalConfig = function(serviceLabel, credentials) {
  const creds = {};
  const key = `watson_${serviceLabel}_`;
  if(credentials) {
    Object.keys(credentials)
    .filter(c => c.indexOf(key) === 0)
    .forEach(k => {
      if (k.substr(key.length) === 'apikey') {
        creds[`iam_${k.substr(key.length)}`] = credentials[k]
      }
      else {
        creds[k.substr(key.length)] = credentials[k]
      }
    });
  }
  return creds;
}

/**
* Helper function used to add credentials bound to cloud functions using wsk service bind
*
* @param {Object} params - parameters sent to service
* @param {string} serviceName - name of service in bluemix used to retrieve credentials, used for IAM instances
* @param {string} serviceAltName - alternate name of service used for cloud foundry instances
* @return {Object} - returns parameters modified to include credentials from service bind
*/
const getCredentialsFromServiceBind = function(params, serviceName, serviceAltName) {
  if (Object.keys(params).length === 0) {
    return params;
  }
  let bxCreds = {};
  if (params.__bx_creds && params.__bx_creds[serviceName]) {
    // If user has IAM instance of service
    bxCreds = params.__bx_creds[serviceName];
  } else if (params.__bx_creds && params.__bx_creds[serviceAltName]) {
    // If user has no IAM instance of service, check for CF instances
    bxCreds = params.__bx_creds[serviceAltName];
  }
  const _params = Object.assign({}, bxCreds, params);
  if (_params.apikey) {
    _params.iam_apikey = _params.apikey;
    delete _params.apikey;
  }
  delete _params.__bx_creds;
  return _params;
}

/**
 * Returns all the credentials that match the service label from env variables
 *
 * @param {string} serviceLabel The service label
 * @param {object} credentialsFromFile OPTIONAL: The credentials for starterkit from local file
 */
const getCredentialsForStarter = function(serviceLabel, credsFromFile) {
  let creds = {};
  if (credsFromFile) {
    creds = getCredentialsFromLocalConfig(serviceLabel, credsFromFile);
  }
  else if (process.env.VCAP_SERVICES) {
    creds = getCredentials(serviceLabel);
  }
  else if (process.env[`service_watson_${serviceLabel}`]){
    creds = JSON.parse(process.env[`service_watson_${serviceLabel}`]);
    if (creds.apikey) {
      creds.iam_apikey = creds.apikey;
      delete creds.apikey;
    }
  }
  return creds;
}

module.exports = {
  getCredentials,
  findCredentials,
  getCredentialsFromLocalConfig,
  getCredentialsForStarter,
  getCredentialsFromServiceBind,
};
