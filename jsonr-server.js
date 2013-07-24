/*
    jsonr-server.js
    2013-07-23

    Public Domain.

    NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.
    
    Author: Franck WOLFF (http://www.graniteds.org)
    
    A sample Node.js server using jsonr.
*/

/*jslint node:true*/

'use strict';

var http = require('http'),
    fs = require('fs'),
    jsonr = require('./jsonr-module'),

// Creates the data model: cities have references to countries and each country have a
// reference to a capital. This brings both multiple references to the same object (eg.
// Washington DC and New York point to the same country instance: USA) and circular
// references (eg. Washington DC points to USA which have a reference to Washington DC
// as its capital).

    countries = [
        { name: 'USA', language: 'English' },
        { name: 'France', language: 'French' },
        { name: 'India', language: 'Hindi' }
    ],
    cities = [
        { name: 'Washington DC', country: countries[0] },
        { name: 'New York', country: countries[0] },
        { name: 'San Francisco', country: countries[0] },

        { name: 'Paris', country: countries[1] },
        { name: 'Lyon', country: countries[1] },

        { name: 'New Delhi', country: countries[2] },
        { name: 'Bangalore', country: countries[2] }
    ];

// Circular references:

countries[0].capital = cities[0];
countries[1].capital = cities[3];
countries[2].capital = cities[5];

http.createServer(function (req, res) {

    var data;

    console.log('Serving ' + req.url);

// Stringifies all cities with jsonr, logs jsonr data (with human readable references)
// and returns the data.

    if (req.url === '/cities') {
        data = jsonr.stringify(cities, null, '\t');
        console.log(jsonr.revealReferences(data));

        res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
        res.write(data);
        res.end();

// Logs posted jsonr data (with human readable references), parses them and returns
// an empty response.

    } else if (req.url === '/new-cities') {
        data = '';
        req.on('data', function (chunk) { data += chunk.toString(); });
        req.on('end', function () {
            console.log(jsonr.revealReferences(data));
            cities = cities.concat(jsonr.parse(data));

            res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
            res.end();
        });

// Serves html / js files.

    } else {
        fs.readFile('.' + req.url, function (err, content) {
            if (err) {
                console.log('  Not Found ' + req.url);
                res.writeHead(404);
                res.end();
            } else {
                if (req.url.indexOf('.html') !== -1) {
                    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
                } else {
                    res.writeHead(200, {'Content-Type': 'text/javascript; charset=utf-8'});
                }
                res.write(content);
                res.end();
            }
        });
    }
}).listen(8080, 'localhost');

console.log('Server running at http://localhost:8080/');