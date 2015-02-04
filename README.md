node-restify-swagger
=======================

[![Build Status](https://travis-ci.org/z0mt3c/node-restify-swagger.png)](https://travis-ci.org/z0mt3c/node-restify-swagger)
[![Coverage Status](https://coveralls.io/repos/z0mt3c/node-restify-swagger/badge.png?branch=master)](https://coveralls.io/r/z0mt3c/node-restify-swagger?branch=master)
[![Dependency Status](https://gemnasium.com/z0mt3c/node-restify-swagger.png)](https://gemnasium.com/z0mt3c/node-restify-swagger)

## Requirements
This project depends on https://github.com/z0mt3c/node-restify-validation.

## Example

    var restify = require('restify');
    var restifySwagger = require('node-restify-swagger');
    var restifyValidation = require('node-restify-validation');

    var server = restify.createServer();
    server.use(restify.queryParser());
    server.use(restifyValidation.validationPlugin({
        errorsAsArray: false,
    }));
    restifySwagger.configure(server, {
        description: 'Description of my API',
        title: 'Title of my API',
        allowMethodInModelNames: true
    });

    server.post({
        url: '/animals',
        swagger: {
                summary: 'Add animal',
                docPath: 'zoo'
        },
        validation: {
            name: { isRequired: true, isAlpha:true, scope: 'body' },
            locations: { isRequired: true, type:'array', swaggerType: 'Location', scope: 'body' }
        },
        models: {
            Location: {
                id: 'Location',
                properties: {
                    name: { type: 'string' },
                    continent: { type: 'string' }
                }
            },
        }
    }, function (req, res, next) {
        res.send(req.params);
    });

    restifySwagger.loadRestifyRoutes();
    server.listen(8001, function () {
        console.log('%s listening at %s', server.name, server.url);
    });


Above will validate and accept at POST /animals:

    {
        "name": "Tiger",
        "location": [
            { "name": "India", continent: "Asia" },
            { "name": "China", continent: "Asia" }
        ]
    }

And produce swagger spec doc at http://localhost:8001/swagger/resources.json

    {
      "swaggerVersion": "1.2",
      "apiVersion": [],
      "basePath": "http://localhost:8001",
      "apis": [
        {
          "path": "/swagger/zoo",
          "description": ""
        }
      ]
    }

And endpoint documentation at http://localhost:8001/swagger/zoo

    {
      "swaggerVersion": "1.2",
      "apiVersion": [],
      "basePath": "http://localhost:8001",
      "resourcePath": "/swagger/zoo",
      "apis": [
        {
          "path": "/animals",
          "description": "",
          "operations": [
            {
              "notes": null,
              "nickname": "Animals",
              "produces": [
                "application/json"
              ],
              "consumes": [
                "application/json"
              ],
              "responseMessages": [
                {
                  "code": 500,
                  "message": "Internal Server Error"
                }
              ],
              "parameters": [
                {
                  "name": "Body",
                  "required": true,
                  "dataType": "POSTAnimals",
                  "paramType": "body"
                }
              ],
              "summary": "Add animal",
              "httpMethod": "POST",
              "method": "POST"
            }
          ]
        }
      ],
      "models": {
        "Location": {
          "id": "Location",
          "properties": {
            "name": {
              "type": "string"
            },
            "continent": {
              "type": "string"
            }
          }
        },
        "POSTAnimals": {
          "properties": {
            "name": {
              "type": "string",
              "dataType": "string",
              "name": "name",
              "required": true
            },
            "locations": {
              "type": "array",
              "dataType": "Location",
              "name": "locations",
              "items": {
                "$ref": "Location"
              },
              "required": true
            }
          }
        }
      }
    }


## Install

    npm install node-restify-swagger


## License


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