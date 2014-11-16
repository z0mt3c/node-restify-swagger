/*globals describe, it, beforeEach*/
var assert = require('assert');
var swagger = require('../lib/swagger-doc.js');
var Resource = require('../lib/swagger-doc.js').Resource;

describe('Resource', function() {
    var resource;

    beforeEach(function() {
        resource = new Resource('/users');
        resource.getApi('/users/old');
    });

    describe('#path', function() {
        it('should be initialized in constructor', function() {
            assert.equal(resource.path, '/users');
        });
    });

    describe('#models', function() {
        it('is an empty object by default', function() {
            assert.equal(Object.keys(resource.models).length, 0);
        });

        it('can be initialized in constructor', function() {
            resource = new Resource('/users', {models: {Tag: {id: 'Tag'}}});
            assert.equal(resource.models.Tag.id, 'Tag');
        });
    });

    describe('#getApi()', function() {
        it('returns an empty api for new paths', function() {
            assert(!('/users/new' in resource.apis));
            var api = resource.getApi('/users/new');

            assert('/users/new' in resource.apis);
            assert.equal(api.path, '/users/new');
            assert.equal(api.description, '');
            assert.equal(api.operations.length, 0);
        });

        it('returns same api instance for existing paths', function() {
            var oldApi = resource.getApi('/users/old');
            var api = resource.getApi('/users/old');

            assert.equal(oldApi, api);
        });
    });

    describe('#get()', function() {
        it('registers an operation on an api', function() {
            resource.get('/users', {
                summary: 'Returns all users',
                parameters: [
                    {name: 'sort', required: false, dataType: 'string', paramType: 'get'}
                ]
            });

            var op = resource.getApi('/users').operations[0];
            assert.equal(op.summary, 'Returns all users');
            assert.equal(op.httpMethod, 'GET');
            assert.equal(op.parameters.length, 1);
        });

        it('supports summary as optional argument', function() {
            resource.get('/users', 'Returns all users', {});

            var op = resource.getApi('/users').operations[0];
            assert.equal(op.summary, 'Returns all users');
        });
    });
});

describe('swagger', function() {

    describe('#cleanAuthorizations', function () {
        it('ensures that the authorizations string is in a proper format', function () {
            var str = swagger.cleanAuthorizations('XYZ,  ABC');
            assert.equal(str, 'xyz abc');
        });

    });

    describe('#getRouteAuthorizations', function () {
        it('make sure api methods without authorizations are public', function () {
            var arr = swagger.getRouteAuthorizations(null);
            assert.equal(arr[0], 'public');
        });

    });

    describe('#checkAuthorized', function () {
        it('check to see if user with public and admin authorizations can access admin route', function () {
            var result = swagger.checkAuthorized(['public', 'admin'], ['admin']);
            assert.equal(result, true);
        });

        it('check to see if user with only public authorizations can access admin route', function () {
            var result = swagger.checkAuthorized(['public'], ['admin']);
            assert.equal(result, false);
        });

    });

});