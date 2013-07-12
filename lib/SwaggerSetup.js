'use strict';

var Router = require('restify/lib/router');
var swagger = require('swagger-doc');
var path = require('path');
var lingo = require('lingo');
var _ = require('underscore');

module.exports = function (server) {
    var blacklisted = ['swagger','updatedAt',''];

    function makeSwaggerDoc(key) {
        var found = _.find(swagger.resources, function(resource){
            return _.isEqual(key, resource.path); });

        return found || swagger.createResource(key, {
            models: {}
        });
    }

    function makeSwaggerPath(convert) {
        return convert.replace(/:([^/]+)/g, '{$1}');
    }

    function mapType(value) {
        var type = 'String';

        if (value.validJSON) {
            type = 'JSONObject';
        } else if (value.pattern) {
            type = lingo.capitalize(value.pattern);
        }

        return type;
    }

    _.each(server.router.mounts, function(item) {
        var url = item.spec.url || item.spec.path;
        var validationModel = item.spec.validationModel || null;

        if (_.isString(url) && validationModel) {
            var camelMe = url.replace(/[\/_]/g,' ');
            var name = lingo.camelcase(camelMe);//item.name;
            var method = item.spec.method;
            var swagger = item.spec.swagger || {};
            var mySwaggerPathParts = swagger.docPath || url.split(path.sep)[1];
            var mySwaggerPath = '/swagger/' + mySwaggerPathParts;

            if (!_.contains(blacklisted, mySwaggerPathParts)) {
                var swaggerDoc = makeSwaggerDoc(mySwaggerPath);
                var parameters = [];

                // push path variables if available
                if (item.path.restifyParams && item.path.restifyParams.length > 0) {
                    _.each(item.path.restifyParams, function(param) {
                        if (!_.has(validationModel, param)) {
                            parameters.push({name: param, description: null, required: true, dataType: 'String', paramType: 'path'});
                        }
                    });
                }

                if (validationModel) {
                    var modelName = (name + 'Model');
                    var model = { properties: { } };
                    var addBody = false;

                    _.each(validationModel, function(valueArray, key) {
                        var value = _.extend({}, valueArray[0], valueArray[1], valueArray[2]);

                        var type = mapType(value);
                        var myProperty = {
                            type: type,
                            dataType: type,
                            name: key,
                            description: value.description || undefined
                        };

                        if (_.isArray(value.oneOf)) {
                            myProperty.allowableValues = {
                                'valueType': 'LIST',
                                'values': value.oneOf
                            };
                        }

                        if (_.isBoolean(value.required) && value.required) {
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
                }

                swaggerDoc[method.toLowerCase()](makeSwaggerPath(url), swagger.desc || null, {
                    notes: swagger.notes || null,
                    nickname: swagger.nickname || name,
                    parameters: parameters
                });
            }
        }
    });
};