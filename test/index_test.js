/*
 * Copyright (c) 2013 Timo Behrmann. All rights reserved.
 */

var assert = require('assert');
var should = require('should');
var sinon = require('sinon');
var _ = require('underscore');
var index = require('../lib/index');
var restify = require('restify');

describe('test', function () {
    it('_convertToSwagger', function (done) {
        index._convertToSwagger.should.have.type('function');
        index._convertToSwagger('hello/:firstParam/:secondParam').should.equal('hello/{firstParam}/{secondParam}');
        index._convertToSwagger('hello/:firstParam/test/:secondParam').should.equal('hello/{firstParam}/test/{secondParam}');
        index._convertToSwagger('hello/:firstParam/test/:secondParam/asdf').should.equal('hello/{firstParam}/test/{secondParam}/asdf');
        done();
    });

    it('_mapToSwaggerType', function (done) {
        index._mapToSwaggerType.should.have.type('function');
        index._mapToSwaggerType({ isJSONObject: true }).should.equal('object');
        index._mapToSwaggerType({ isJSONArray: true }).should.equal('array');
        index._mapToSwaggerType({ isDate: true }).should.equal('dateTime');
        index._mapToSwaggerType({ isFloat: true }).should.equal('float');
        index._mapToSwaggerType({ isBoolean: true }).should.equal('boolean');
        index._mapToSwaggerType({ swaggerType: 'asdf' }).should.equal('asdf');
        index._mapToSwaggerType({ isInt: true }).should.equal('integer');
        index._mapToSwaggerType({  }).should.equal('string');
        index._mapToSwaggerType('asdfasdf').should.equal('string');
        index._mapToSwaggerType(null).should.equal('string');
        done();
    });

    it('configure', function (done) {
        var server = sinon.stub(index.swagger, 'configure', function (myServer, myOptions) {
            myServer.should.equal(server);
            myOptions.discoveryUrl.should.exist;
            myOptions.abc.should.be.ok;
        });

        index.configure(server, { abc: true });
        server.called.should.be.ok;
        server.restore();
        done();
    });

    it('findOrCreateResource', function (done) {
        index.swagger.resources = [];

        var resource = '/test';
        var options = {};

        var server = sinon.stub(index.swagger, 'createResource', function (myResource, myOptions) {
            myResource.should.equal(resource);
            myOptions.should.equal(options);
            return true;
        });

        index.findOrCreateResource(resource, options).should.be.ok;
        server.called.should.be.ok;
        server.calledOnce.should.be.ok;

        var resourceObj = { path: resource };
        index.swagger.resources = [ resourceObj ];

        index.findOrCreateResource(resource, options).should.equal(resourceObj);
        server.calledTwice.should.not.be.ok;
        server.restore();
        index.swagger.resources = [];
        done();
    });

    it('pushPathParameters', function (done) {
        var item = { path: { restifyParams: []}},
            validationModel = {},
            parameters = [];

        index._pushPathParameters(item, validationModel, parameters).should.not.be.ok;

        item.path.restifyParams = [ 'test' ];
        index._pushPathParameters(item, validationModel, parameters).should.be.ok;

        validationModel = { test: {} };
        index._pushPathParameters(item, validationModel, parameters).should.not.be.ok;
        parameters.length.should.equal(1);
        parameters[0].name.should.equal('test');

        done();
    });

    it('loadRestifyRoutes', function (done) {
        var server = restify.createServer({});
        server.get({ url: '/asdf/:p1/:p2',
            swagger: {
                summary: 'summary',
                notes: 'notes',
                nickname: 'nickname'
            },
            validation: {
                q1: { isRequired: true, isIn: ['asdf'], scope: 'query', description: 'description q1'},
                b1: { isRequired: true, isIn: ['asdf'], defaultValue: 'asdf', scope: 'body', description: 'description b1'},
                p2: { isRequired: true, isIn: ['asdf'], defaultValue: 'asdf', scope: 'path', description: 'description p2'},
                p3: { isRequired: true, swaggerType: 'file', scope: 'body', description: 'description p2'},
                h1: { isRequired: true, isIn: ['asdf'], scope: 'header', description: 'description h1'}
            }
        }, function (req, res, next) {
            // not called
            false.should.be.ok;
        });

        index.configure(server, {     apiDescriptions: {
            'asdf': 'asdf'
        }});
        index.loadRestifyRoutes();

        index.swagger.resources.length.should.equal(1);
        var swaggerResource = index.swagger.resources[0];
        swaggerResource.models.AsdfP1P2.should.exist;
        swaggerResource.models.AsdfP1P2.properties.b1.should.exist;
        swaggerResource.models.AsdfP1P2.properties.b1.defaultValue.should.equal('asdf');
        swaggerResource.models.AsdfP1P2.properties.b1.allowableValues.should.exist;
        swaggerResource.models.AsdfP1P2.properties.b1.allowableValues.values[0].should.equal('asdf');
        swaggerResource.models.AsdfP1P2.properties.b1.required.should.be.ok;

        var swaggerApi = swaggerResource.apis['/asdf/{p1}/{p2}'];
        swaggerApi.operations.length.should.equal(1);

        var swaggerOperation = swaggerApi.operations[0];
        swaggerOperation.notes.should.equal('notes');
        swaggerOperation.nickname.should.equal('nickname');
        swaggerOperation.parameters.length.should.equal(6);
        _.difference(['q1', 'p1', 'p2', 'p3', 'h1', 'Body'], _.pluck(swaggerOperation.parameters, 'name')).length.should.equal(0);

        done();
    });
    it('loadRestifyRoutesWithResponseModel', function (done) {
        var server = restify.createServer();

        var Models = {
            Model : {
                properties: {
                    inputValue: {
                        type: 'string',
                        name: 'name',
                        description: 'description',
                        required: true
                    }
                }
            }
        };

        server.get({ url: '/model',
            models: Models,
            swagger: {
                summary: 'summary',
                notes: 'notes',
                nickname: 'nickname',
                responseClass: 'Model',
            },
            validation: {

            }
        }, function (req, res, next) {
            // not called
            false.should.be.ok;
        });

        index.configure(server, {});
        index.loadRestifyRoutes();

        index.swagger.resources.length.should.equal(1);
        var swaggerResource = index.swagger.resources[0];

        swaggerResource.models.Model.should.exist;
        swaggerResource.models.Model.properties.inputValue.should.exist;
        swaggerResource.models.Model.properties.inputValue.name.should.exist;


        done();
    });
    it('loadRestifyRoutesWithResponseModelSecondRoute', function (done) {
        var server = restify.createServer();

        var ModelsV1 = {
            Model : {
                properties: {
                    inputValue: {
                        type: 'string',
                        name: 'name',
                        description: 'description',
                        required: true
                    }
                }
            }
        };

        server.get({ url: '/model',
            models: ModelsV1,
            swagger: {
                summary: 'summary',
                notes: 'notes',
                nickname: 'nickname',
                responseClass: 'Model',
            },
            validation: {

            }
        }, function (req, res, next) {
            // not called
            false.should.be.ok;
        });

         var ModelsV2 = {
            DetailModel : {
                properties: {
                    inputValue: {
                        type: 'string',
                        name: 'name',
                        description: 'description',
                        required: true
                    }
                }
            }
        };

        server.get({ url: '/model/detail',
            models: ModelsV2,
            swagger: {
                summary: 'summary',
                notes: 'notes',
                nickname: 'nickname',
                responseClass: 'DetailModel',
            },
            validation: {

            }
        }, function (req, res, next) {
            // not called
            false.should.be.ok;
        });

        index.configure(server, {});
        index.loadRestifyRoutes();

        index.swagger.resources.length.should.equal(1);
        var swaggerResource = index.swagger.resources[0];

        swaggerResource.models.DetailModel.should.exist;
        swaggerResource.models.DetailModel.properties.inputValue.should.exist;
        swaggerResource.models.DetailModel.properties.inputValue.name.should.exist;

        swaggerResource.models.Model.should.exist;
        swaggerResource.models.Model.properties.inputValue.should.exist;
        swaggerResource.models.Model.properties.inputValue.name.should.exist;


        done();
    });
    it('loadRestifyRoutesWithResponseModelAsArray', function (done) {
        var server = restify.createServer();

        var Models = {
            Model : {
                properties: {
                    inputValue: {
                        type: 'string',
                        name: 'name',
                        description: 'description',
                        required: true
                    }
                }
            }
        };

        server.get({ url: '/modelarray',
            models: Models,
            swagger: {
                summary: 'summary',
                notes: 'notes',
                nickname: 'nickname'
            },
            validation: {
                models: { isRequired: true, swaggerType: 'Model', type: 'array', scope: 'body' }
            }
        }, function (req, res, next) {
            // not called
            false.should.be.ok;
        });

        index.configure(server, {});
        index.loadRestifyRoutes();

        index.swagger.resources.length.should.equal(1);
        var swaggerResource = index.swagger.resources[0];

        swaggerResource.models.Modelarray.should.exist;
        swaggerResource.models.Modelarray.properties.models.type.should.equal('array');
        swaggerResource.models.Modelarray.properties.models.dataType.should.equal('Model');

        done();
    });
});
