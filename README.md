node-restify-swagger
=======================

[![Build Status](https://travis-ci.org/z0mt3c/node-restify-swagger.png)](https://travis-ci.org/z0mt3c/node-restify-swagger)
[![Coverage Status](https://coveralls.io/repos/z0mt3c/node-restify-swagger/badge.png?branch=master)](https://coveralls.io/r/z0mt3c/node-restify-swagger?branch=master)
[![Dependency Status](https://gemnasium.com/z0mt3c/node-restify-swagger.png)](https://gemnasium.com/z0mt3c/node-restify-swagger)

Swagger resource generation for [Restify](https://github.com/mcavage/node-restify).

Uses [node-restify-validation](https://github.com/z0mt3c/node-restify-validation) for query, path, body validations.

Includes an optional access control scheme which allows api methods to be hidden and access granted from main application.


Installation
-------

Install the module.

    npm install node-restify-swagger

Include a copy of [Swagger-UI](https://github.com/swagger-api/swagger-ui) at the root of your project.


Demo project
-------

A simple demo project can be cloned from [node-restify-demo](https://github.com/z0mt3c/node-restify-demo).


Sample App.js
-------
 
    var restify = require('restify');
	var restifyValidation = require('node-restify-validation');
	var restifySwagger = require('node-restify-swagger');

	var server = module.exports.server = restify.createServer();
	server.use(restify.queryParser());
	server.use(restify.bodyParser());
	server.use(restifyValidation.validationPlugin({ errorsAsArray: false }));

	restifySwagger.configure(server, {
	    info: {
	        contact: 'email@domain.tld',
	        description: 'Description text',
	        license: 'MIT',
	        licenseUrl: 'http://opensource.org/licenses/MIT',
	        termsOfServiceUrl: 'http://opensource.org/licenses/MIT',
	        title: 'Node Restify Swagger Demo'
	    },
	    apiDescriptions: {
	        'get':'GET-Api Resourcen'
	    }
	});

    // accessControl function which will be used by the restifySwagger middleware
    // and resource generation functionality to authorize access to the methods (optional)
    function accessControl(req, res, api_key) {

      // if api_key is valid then return a space seperated list of authorizations
      // the authorizations will be defined on the routes
      return ((api_key == '12345') ? 'public account' : '');

    }

    // verify authentication and authorization (optional)
    restifySwagger.authorizeAccess(accessControl);

	// Test Controller
	server.get({url: '/get/:name',
	    swagger: {
	        summary: 'My hello call description',
	        notes: 'My hello call notes',
	        nickname: 'sayHelloCall'
	    },
	    validation: {
	        name: { isRequired: true, isIn: ['foo', 'bar'], scope: 'path', description: 'Your unreal name' },
	        status: { isRequired: true, isIn: ['foo', 'bar'], scope: 'query', description: 'Are you foo or bar?' },
	        email: { isRequired: false, isEmail: true, scope: 'query', description: 'Your real email address' },
	        age: { isRequired: true, isInt: true, scope: 'query', description: 'Your age' },
	        accept: { isRequired: true, isIn: ['true', 'false'], scope: 'query', swaggerType: 'boolean', description: 'Are you foo or bar?' },
	        password: { isRequired: true, description: 'New password' },
	        passwordRepeat: { equalTo: 'password', description: 'Repeated password'}
	    }}, function (req, res, next) {
	    res.send(req.params);
	});

	// Serve static swagger resources
	server.get(/^\/docs\/?.*/, restify.serveStatic({directory: './swagger-ui'}));
	server.get('/', function (req, res, next) {
	    res.header('Location', '/docs/index.html');
	    res.send(302);
	    return next(false);
	});

	restifySwagger.loadRestifyRoutes(accessControl);

	// Start server
	server.listen(8001, function () {
	    console.log('%s listening at %s', server.name, server.url);
	});

    
License
-------

The MIT License (MIT)

Copyright (c) 2013 Timo Behrmann

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
