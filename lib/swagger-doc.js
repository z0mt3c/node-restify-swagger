/**
 * Copyright (c) 2012 Eirikur Nilsson
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */

'use strict';

var SWAGGER_METHODS = ['get', 'patch', 'post', 'put', 'delete'],
    SWAGGER_VERSION = '1.2';

function Resource(path, options) {
    options = options || {};

    this.path = path;
    this.models = options.models || {};
    this.apis = {};
    this.description = options.description;
}

Resource.prototype.getApi = function(path) {
    if (!(path in this.apis)) {
        this.apis[path] = {
            path: path,
            description: '',
            operations: []
        };
    }
    return this.apis[path];
};

var operationType = function(method) {
    method = method.toUpperCase();

    return function(path, summary, operation) {
        if (!operation) {
            operation = summary;
            summary = '';
        } else {
            operation.summary = summary;
        }
        operation.httpMethod = method;
        operation.method = method;

        var api = this.getApi(path);
        api.operations.push(operation);
    };
};

for (var i = 0; i < SWAGGER_METHODS.length; i++) {
    var m = SWAGGER_METHODS[i];
    Resource.prototype[m] = operationType(m);
}


var swagger = module.exports = {};

swagger.Resource = Resource;

swagger.resources = [];

/**
 * Configures swagger-doc for a express or restify server.
 * @param  {Server} server  A server object from express or restify.
 * @param  {{discoveryUrl: string, version: string, basePath: string}} options Options
 */
swagger.configure = function(server, options) {
    options = options || {};

    var discoveryUrl = options.discoveryUrl || '/resources.json',
        self = this;

    this.server = server;
    this.apiVersion = options.version || this.server.versions || '1.0.0';
    this.basePath = options.basePath;
    this.info = options.info;
    this.responseMessages = options.responseMessages;

    this.server.get(discoveryUrl, function(req, res) {
        var result = self._createResponse(req);
        result.apis = self.resources.map(function(r) { return {path: r.path, description: r.description || '' }; });
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, PATCH, POST, DELETE, PUT');
        res.header('Access-Control-Allow-Headers', 'Content-Type');
        res.send(result);
    });
};

/**
 * Registers a Resource with the specified path and options.
 * @param  {!String} path     The path of the resource.
 * @param  {{models}} options Optional options that can contain models.
 * @param  {Function} accessControl User defined access control function for verifying api method access
 * @return {Resource}         The new resource.
 */
swagger.createResource = function(path, options, accessControl) {

  // createResource is called when the loadRestifyRoutes is executed during the app load

  var resource = new Resource(path, options), self = this;

  this.resources.push(resource);

  // this function is called when the user loads the swagger ui
  this.server.get(path, function(req, res) {

    // GET route is called when Swagger UI access one of the resource routes

    // create the userAuthorizations array
    var userAuthorizations = self.getUserAuthorizations(req, res, accessControl);

    // createResponse will generate information about the swagger version, api version, and licensing
    var result = self._createResponse(req);
    result.resourcePath = path;

    // the following arrays will contains the apis (path) and methods (name) that are authorized
    var apisAllowed = [];
    var modelsAllowed = [];

    // loop through the api methods and determine what api methods and methods are allowed
    for (var obj in resource.apis) {
      // api has operations property
      if (resource.apis.hasOwnProperty(obj)) {

        // get the path
        var path = '';
        if (typeof resource.apis[obj].path == 'string') {
          path = resource.apis[obj].path;
        }

        // check the new 'authorizations' route property
        var routeAuthorizations = self.getRouteAuthorizations(resource.apis[obj]['operations'][0].authorizations.type);

        // if the authorization type defined in the route
        var apiAllowed = self.checkAuthorized(userAuthorizations, routeAuthorizations);
        if (apiAllowed) {
          apisAllowed.push(path);
        }

        // check api has parameters object
        if (typeof resource.apis[obj].operations[0]['parameters'] == 'object') {

          // loop through the parameters
          for (var i = 0; i < Object.keys(resource.apis[obj].operations[0]['parameters']).length; i++) {
            // parameters has valid object
            if (typeof resource.apis[obj].operations[0]['parameters'][i] == 'object') {

              // check to see if we found an api that should have a model
              if ((resource.apis[obj].operations[0]['parameters'][i]['paramType'] == 'body') &&
                  (typeof resource.apis[obj].operations[0]['parameters'][i]['dataType'] != 'undefined')) {

                // if the api is allowed then include the model
                if (apiAllowed) {
                  modelsAllowed.push(resource.apis[obj].operations[0]['parameters'][i]['dataType']);
                }
              }
            }
          }
        }

      }
    }

    // populate result.apis with only the authenticated or public api methods
    var apis = Object.keys(resource.apis).map(function(k) { return resource.apis[k]; });
    result.apis = [];
    for (var api in apis) {
      if (apis.hasOwnProperty(api)) {
        if (apisAllowed.indexOf(apis[api].path) !== -1) {
          result.apis.push(apis[api]);
        }
      }
    }

    // populate the models with only those models that are related to authenticated apis
    result.models = {};
    for (var model in resource.models) {
      if (resource.models.hasOwnProperty(model)) {
        if (modelsAllowed.indexOf(model) !== -1) {
          result.models[model] = resource.models[model];
        }
      }
    }

    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, PATCH, POST, DELETE, PUT');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.send(result);
  });

  return resource;
};

swagger.cleanAuthorizations = function(str) {

  var clean = str;

  // replace commas in the authorizations as spaces
  clean = clean.replace(',', ' ');
  // replace spaces in the authorizations with single spaces
  clean = clean.replace(/ +/g, ' ');
  // make the string lowercase for future comparisons
  clean = clean.toLowerCase();

  return clean;

};

swagger.getUserAuthorizations = function(req, res, accessControl) {

  // create the userAuthorizations array with the public default
  var userAuthorizations = ['public'];

  // verify that the api_key is provided and the accessControl method was passed to the
  if ((typeof req.params.api_key !== 'undefined') && (typeof accessControl === 'function')) {

    // call the user defined access control function and get back the userAuthorizations
    var userAuths = accessControl(req, res);
    if (userAuths.length) {
      // clean the authorizations string
      userAuths = swagger.cleanAuthorizations(userAuths);
      // split the space delimited array of authorizations into an array
      userAuthorizations = userAuths.split(' ');
    }

  }

  return userAuthorizations;

};

swagger.getRouteAuthorizations = function(authorization_type) {

  // check the new 'authorizations' route property
  var routeAuthorizations = [];

  if (typeof authorization_type === 'string') {
    var routeAuths = swagger.cleanAuthorizations(authorization_type);
    routeAuthorizations = routeAuths.split(' ');
  }
  else {
    // make api methods without 'authorizations' work be assigning default of public
    routeAuthorizations = ['public'];
  }

  return routeAuthorizations;

};

swagger.checkAuthorized = function(userAuthorizations, routeAuthorizations) {

  var result = false;

  // loop through all of the route authorizations
  for (var routeAuthorization in routeAuthorizations) {
    if (routeAuthorizations.hasOwnProperty(routeAuthorization)) {
      // check to see if the user is authorized
      if (userAuthorizations.indexOf(routeAuthorizations[routeAuthorization]) !== -1) {
        // the api is allowed
        result = true;
        // exist the for loop
        break;
      }
    }
  }

  return result;
};

swagger._createResponse = function(req) {
    var basePath = this.basePath || 'http://' + req.headers.host;
    return {
        swaggerVersion: SWAGGER_VERSION,
        apiVersion: this.apiVersion,
        basePath: basePath,
        info: this.info
    };
};
