/*
 * Copyright (c) 2013 Timo Behrmann. All rights reserved.
 */

var _ = require('underscore');
var swagger = module.exports.swagger = require('swagger-doc');
var assert = require('assert');
var lingo = require('lingo');
var path = require('path');
var restifyValidation = require('node-restify-validation');
var validationUtils = restifyValidation.utils;


var defaultOptions = {
    discoveryUrl: '/swagger/resources.json',
    version: '1.0'
};

var convertToSwagger = module.exports._convertToSwagger = function (path) {
    return path.replace(/:([^/]+)/g, '{$1}');
};

var mapToSwaggerType = module.exports._mapToSwaggerType = function (value) {
    var type = 'string';

    if (!value) {
      // don't care
    } else if (_.has(value, 'swaggerType')) {
        type = value.swaggerType;
    } else if (value.isDate) {
        type = 'dateTime'
    } else if (value.isBoolean) {
        type = 'boolean'
    } else if (value.isInt || value.isNumeric) {
        type = 'integer'
    } else if (value.isFloat || value.isDecimal) {
        type = 'float'
    } else if (value && value.isJSONObject) {
        type = 'JSONObject';
    } else if (value && value.isJSONArray) {
        type = 'array';
    }

    return type;
};

module.exports.configure = function (server, options) {
    this.options = _.extend(defaultOptions, options);
    this.server = server;
    swagger.configure(this.server, this.options);
};

module.exports.findOrCreateResource = function (resource, options) {
    assert.ok(swagger.resources, 'Swagger not initialized! Execution of configure required!');

    var found = _.find(swagger.resources, function (myResource) {
        return _.isEqual(resource, myResource.path);
    });

    var docs = found || swagger.createResource(resource, options || { models: {} });
    return docs;
};

var pushPathParameters = module.exports._pushPathParameters = function (item, validationModel, parameters) {
    var hasPathParameters = false;

    _.each(item.path.restifyParams, function (param) {
        if (!_.has(validationModel, param)) {
            parameters.push({name: param, description: null, required: true, dataType: 'String', paramType: 'path'});
            hasPathParameters = true;
        }
    });

    return hasPathParameters;
};

var extractSubtypes = module.exports._extractSubtypes = function (model, swaggerDoc) {
    _.each(model.properties, function (element, key) {
        var isSubtype = !(element.type && element.dataType);
        var submodelName = lingo.capitalize(lingo.camelcase(key));

        if (isSubtype) {
            if (!_.has(swaggerDoc, submodelName)) {
                swaggerDoc.models[submodelName] = { properties: element };
                extractSubtypes(swaggerDoc.models[submodelName], swaggerDoc);
            }
            model.properties[key] = { type: submodelName };
        }
    });
};


module.exports.loadRestifyRoutes = function () {
    var self = this;

    _.each(this.server.router.mounts, function (item) {
        var spec = item.spec;
        var validationModel = spec.validation;

        if (validationModel) {
            var url = spec.url || item.path;
            var name = lingo.camelcase(url.replace(/[\/_]/g, ' '));
            var method = spec.method;
            var swagger = spec.swagger || {};
            var mySwaggerPathParts = swagger.docPath || url.split(path.sep)[1];
            var mySwaggerPath = '/swagger/' + mySwaggerPathParts;

            if (!_.contains(self.options.blacklist, mySwaggerPathParts)) {
                var swaggerDoc = self.findOrCreateResource(mySwaggerPath);
                var parameters = [];
                var modelName = name;
                var model = { properties: { } };

                var hasPathParameters = false;
                var hasBodyParameters = false;
                var hasQueryParameters = false;

                // Add missing but required path variables - even if they are not specified
                var restifyPathParameters = ( item.path.restifyParams && item.path.restifyParams.length > 0 ) ? item.path.restifyParams : [];
                hasPathParameters = pushPathParameters(item, validationModel, parameters);

                _.each(validationModel, function (valueArray, key) {
                    var value = _.reduce(_.isArray(valueArray) ? valueArray : [valueArray],
                        function (memo, entry) {
                            return _.extend(memo, entry);
                        }, {});

                    var swaggerType = mapToSwaggerType(value);
                    var myProperty = {
                        type: swaggerType,
                        dataType: value.swaggerType || swaggerType,
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

                    if (_.isEqual(value.scope, 'path')) {
                        myProperty.paramType = 'path';
                        hasPathParameters = true;
                        parameters.push(myProperty);

                    } else if (_.isEqual(value.scope, 'body')) {
                        model.properties[key] = myProperty;
                        hasBodyParameters = true;

                    } else {
                        myProperty.paramType = 'query';
                        hasQueryParameters = true;
                        parameters.push(myProperty);
                    }
                });

                if (hasBodyParameters) {
                    model.properties = validationUtils.deflat(model.properties);
                    extractSubtypes(model, swaggerDoc);
                    swaggerDoc.models[modelName] = model;
                    parameters.push({
                        name: 'Body',
                        description: swagger.summary,
                        required: true,
                        dataType: modelName,
                        paramType: 'body'
                    });
                }


                swaggerDoc[method.toLowerCase()](convertToSwagger(url), swagger.summary, {
                    notes: swagger.notes || null,
                    nickname: swagger.nickname || name,
                    responseClass: swagger.responseClass || undefined,
                    produces: swagger.produces || [
                        'application/json'
                    ],
                    responseMessages: swagger.responseMessages || [
                        {
                            code: 500,
                            message: 'Internal Server Error'
                        }
                    ],
                    parameters: parameters
                });
            }
        }
    });
};

