var _ = require('underscore');
var utils = require('./utils');
var swagger = require('swagger-doc');
var assert = require('assert');
var lingo = require('lingo');
var path = require('path');

var defaultOptions = {
    discoveryUrl: '/swagger/resources.json',
    version: '1.0'
};

var convertToSwagger = function(path) {
    return path.replace(/:([^/]+)/g, '{$1}');
};

var mapToSwaggerType = function(value) {
    var type = 'String';

    if (value.validJSON) {
        type = 'JSONObject';
    } else if (value.pattern) {
        type = lingo.capitalize(value.pattern);
    }

    return type;
}

module.exports.configure = function (server, options) {
    this.options = _.extend(defaultOptions, options);
    this.server = server;
    swagger.configure(this.server, this.options);
};

module.exports.findOrCreateResource = function (resource, options) {
    assert.ok(swagger.resources, 'Swagger not initialized! Execution of configure required!');

    var found = _.find(swagger.resources, function (resource) {
        return _.isEqual(resource, resource.path);
    });

    var docs = found || swagger.createResource(resource, options || { models: {} });
    return docs;
};

module.exports.loadRestifyRoutes = function () {
    var self = this;
    _.each(this.server.router.mounts, function (item) {
        var spec = item.spec;
        var validationModel = spec.validation;

        if (validationModel) {
            var url = spec.url || spec.path;
            var name = lingo.camelcase(url.replace(/[\/_]/g,' '));
            var method = spec.method;
            var swagger = spec.swagger || {};
            var mySwaggerPathParts = swagger.docPath || url.split(path.sep)[1];
            var mySwaggerPath = '/swagger/' + mySwaggerPathParts;

            if (!_.contains(self.options.blacklist, mySwaggerPathParts)) {
                var swaggerDoc = self.findOrCreateResource(mySwaggerPath);
                var parameters = [];

                // push path variables if available
                if (item.path.restifyParams && item.path.restifyParams.length > 0) {
                    _.each(item.path.restifyParams, function(param) {
                        if (!_.has(validationModel, param)) {
                            parameters.push({name: param, description: null, required: true, dataType: 'String', paramType: 'path'});
                        }
                    });
                }

                var modelName = (name + 'Model');
                var model = { properties: { } };
                var addBody = false;

                _.each(validationModel, function(valueArray, key) {
                    if (!_.isArray(valueArray)) {
                        valueArray = [valueArray];
                    }

                    var value = _.extend({}, valueArray[0], valueArray[1], valueArray[2]);

                    var type = mapToSwaggerType(value);
                    var myProperty = {
                        type: type,
                        dataType: type,
                        name: key,
                        description: value.description || undefined
                    };

                    if (_.isArray(value.isIn)) {
                        myProperty.allowableValues = {
                            'valueType': 'LIST',
                            'values': value.isIn
                        };
                    }

                    if (_.isBoolean(value.isRequired) && value.isRequired) {
                        myProperty.required = true;
                    }

                    if (_.isEqual(value.scope, 'query')) {
                        myProperty.paramType = 'query';
                        parameters.push(myProperty);
                    } else if (_.isEqual(value.scope, 'path')) {
                        myProperty.paramType = 'path';
                        parameters.push(myProperty);
                    } else {
                        model.properties[key] = myProperty;
                        addBody = true;
                    }
                });

                if (addBody) {
                    swaggerDoc.models[modelName] = model;
                    parameters.push({name: 'Body', description: swagger.bodyDesc || '-', required: true, dataType: modelName, paramType: 'body' });
                }

                swaggerDoc[method.toLowerCase()](convertToSwagger(url), swagger.desc || null, {
                    notes: swagger.notes || null,
                    nickname: swagger.nickname || name,
                    parameters: parameters
                });
            }
        }
    });
};