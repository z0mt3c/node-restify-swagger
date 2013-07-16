/*
 * Copyright (c) 2013 Timo Behrmann. All rights reserved.
 */

var assert = require('assert');
var should = require('should');
var sinon = require('sinon');
var index = require('../lib/index');

describe('test', function () {
    it('_convertToSwagger', function (done) {
        index._convertToSwagger.should.be.a('function');
        index._convertToSwagger('hello/:firstParam/:secondParam').should.equal('hello/{firstParam}/{secondParam}');
        index._convertToSwagger('hello/:firstParam/test/:secondParam').should.equal('hello/{firstParam}/test/{secondParam}');
        index._convertToSwagger('hello/:firstParam/test/:secondParam/asdf').should.equal('hello/{firstParam}/test/{secondParam}/asdf');
        done();
    });

    it('_mapToSwaggerType', function (done) {
        index._mapToSwaggerType.should.be.a('function');
        index._mapToSwaggerType({ isJSONObject: true }).should.equal('JSONObject');
        index._mapToSwaggerType({ isJSONArray: true }).should.equal('JSONArray');
        index._mapToSwaggerType('asdfasdf').should.equal('String');
        index._mapToSwaggerType(null).should.equal('String');
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
        var router = index.server.router = { mounts: [] };

        // throws no error without routes:
        index.loadRestifyRoutes();

        /*
        router.mounts.push({
            path: '/asdf',
            spec: {
                method: 'GET',
                url: '/asdf',
                validation: { }
            }
        });

        var server = sinon.stub(index.swagger, 'createResource', function (myResource, myOptions) {
            return {};
        });

        var serverGet = sinon.stub(index.swagger.server, 'get', function () { return {}; });

        index.loadRestifyRoutes();

        server.restore();
        serverGet.restore();
        */
        done();
    });
});
