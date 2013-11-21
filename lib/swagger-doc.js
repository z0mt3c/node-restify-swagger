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

var SWAGGER_METHODS = ['get', 'post', 'put', 'delete'],
    SWAGGER_VERSION = '1.0';

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
    this.apiVersion = options.version || this.server.version || '0.1';
    this.basePath = options.basePath;
    this.info = options.info;

    this.server.get(discoveryUrl, function(req, res) {
        var result = self._createResponse(req);
        result.apis = self.resources.map(function(r) { return {path: r.path, description: r.description || '' }; });
        res.send(result);
    });
};

/**
 * Registers a Resource with the specified path and options.
 * @param  {!String} path     The path of the resource.
 * @param  {{models}} options Optional options that can contain models.
 * @return {Resource}         The new resource.
 */
swagger.createResource = function(path, options) {
    var resource = new Resource(path, options),
        self = this;
    this.resources.push(resource);

    this.server.get(path, function(req, res) {
        var result = self._createResponse(req);
        result.resourcePath = path;
        result.apis = Object.keys(resource.apis).map(function(k) { return resource.apis[k]; });
        result.models = resource.models;

        res.send(result);
    });

    return resource;
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
