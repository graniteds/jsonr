/*
    jsonr.js
    2013-07-23

    Public Domain.

    NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.
    
    Author: Franck WOLFF (http://www.graniteds.org)

    Based on the work of Douglas Crockford
    See http://www.JSON.org/js.html

    This code should be minified before deployment.
    See http://javascript.crockford.com/jsmin.html

    USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
    NOT CONTROL.

    This file creates a global JSONR object containing four methods: stringify,
    isReference, revealReferences and parse:


      - JSONR.stringify(value, replacer, space)

            value       any JavaScript value, usually an object or array.

            replacer    an optional parameter that determines how object
                        values are stringified for objects. It can be a
                        function or an array of strings.

            space       an optional parameter that specifies the indentation
                        of nested structures. If it is omitted, the text will
                        be packed without extra whitespace. If it is a number,
                        it will specify the number of spaces to indent at each
                        level. If it is a string (such as '\t' or '&nbsp;'),
                        it contains the characters used to indent at each level.

            This method produces a JSON text from a JavaScript value. If it encounters
            multiple references to the same object instance (even circular references),
            it only encodes the first occurrence and put a reference for all others in
            the form of: "\uXXXX" (with XXXX = (index of instance + 0xE000)).
            
            See implementation for detail.


      - JSONR.isReference(value)

              value        any JavaScript value.
              
              This method returns true if the value is a String of length 1 with a
              unicode character in the range \uE000 - \uF8FF (ie. UTF8 private usage area).


      - JSONR.revealReferences(text)

            text        a JSON text encoded by the JSONR.stringify method.
            
            This method returns its parameter with all references replaced by human
            readable text (eg. "\uE000" -> "^0", "\uE001" -> "^1", ...,
            "\uE00A" -> "^10", etc.)


      - JSONR.parse(text, reviver)
        
            text        a JSON encoded text, such as those returned by
                        stringify.
            
            reviver        an optional parameter that can filter and
                        transform the results. It receives each of the keys and values,
                        and its return value is used instead of the original value.
                        If it returns what it received, then the structure is not
                        modified. If it returns undefined then the member is deleted.

            
            This method parses a JSON text to produce a JavaScript object. If the text
            parameter was obtained through a JSONR stringify method (or compatible),
            this method also resolve all references (see above).


    This is a reference implementation. You are free to copy, modify, or redistribute.

*/

/*global JSONR:true*/

if (typeof JSONR !== 'object') {

    JSONR = {};

    (function () {
        'use strict';

        var escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
            gap,
            indent,
            meta = {
                '\b': '\\b',
                '\t': '\\t',
                '\n': '\\n',
                '\f': '\\f',
                '\r': '\\r',
                '"' : '\\"',
                '\\': '\\\\'
            },
            rep,
            dy,
            maxi = 0xF8FF - 0xE000;


        // JSONR.stringify

        function esc(a) {
            var c = meta[a];
            return typeof c === 'string'
                ? c
                : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
        }

        function quote(string) {
            var c;

            escapable.lastIndex = 0;
            if (escapable.test(string)) {
                string = string.replace(escapable, esc);
            }

            if (string.length > 0) {
                c = string.charCodeAt(0);
                if (c >= 0xE000 && c <= 0xF8FF) {
                    string = '\uE000' + string;
                }
            }

            return '"' + string + '"';
        }


        function str(key, holder) {

            var i,
                k,
                ks,
                v,
                length,
                mind = gap,
                partial,
                value = holder[key];

            if (value !== null && typeof value === 'object' &&
                    typeof value.toJSON === 'function') {
                value = value.toJSON(key);
            }

            if (typeof rep === 'function') {
                value = rep.call(holder, key, value);
            }

            switch (typeof value) {
            case 'string':
                return quote(value);

            case 'number':
                return isFinite(value) ? String(value) : 'null';

            case 'boolean':
            case 'null':
                return String(value);

            case 'object':

                if (!value) {
                    return 'null';
                }

                i = dy.indexOf(value);
                if (i !== -1) {
                    return '"' + String.fromCharCode(0xE000 + i) + '"';
                }

                if (dy.length > maxi) {
                    throw new Error('JSONR.stringify: too many references');
                }

                dy.push(value);

                gap += indent;
                partial = [];

                if (Object.prototype.toString.apply(value) === '[object Array]') {

                    length = value.length;
                    for (i = 0; i < length; i += 1) {
                        partial[i] = str(i, value) || 'null';
                    }

                    v = partial.length === 0
                        ? '[]'
                        : gap
                        ? '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']'
                        : '[' + partial.join(',') + ']';
                    gap = mind;
                    return v;
                }

                if (rep && typeof rep === 'object') {

                    length = rep.length;
                    for (i = 0; i < length; i += 1) {
                        k = rep[i];
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                } else {

                    ks = Object.keys(value).sort();
                    length = ks.length;
                    for (i = 0; i < length; i += 1) {
                        k = ks[i];
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }

                v = partial.length === 0
                    ? '{}'
                    : gap
                    ? '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}'
                    : '{' + partial.join(',') + '}';
                gap = mind;
                return v;
            }
        }

        JSONR.stringify = function (value, replacer, space) {
            var i, s;

            indent = '';
            if (typeof space === 'number') {
                for (i = 0; i < space; i += 1) {
                    indent += ' ';
                }
            } else if (typeof space === 'string') {
                indent = space;
            }

            rep = null;
            if (replacer) {
                if (typeof replacer === 'function') {
                    rep = replacer;
                } else if (Object.prototype.toString.apply(replacer) === '[object Array]') {
                    for (i = 0; i < replacer.length; i += 1) {
                        if (typeof replacer[i] !== 'string') {
                            throw new Error('JSONR.stringify: illegal replacer');
                        }
                    }
                    rep = replacer.concat().sort();
                } else {
                    throw new Error('JSONR.stringify: illegal replacer');
                }
            }

            gap = '';
            dy = [];

            try {
                s = str('', {'': value});
            } finally {
                gap = null;
                indent = null;
                rep = null;
                dy = null;
            }

            return s;
        };

        // JSONR.isReference

        JSONR.isReference = function (value) {
            var c;
            if (typeof value === 'string' && value.length === 1) {
                c = value.charCodeAt(0);
                return c >= 0xE000 && c <= 0xF8FF;
            }
            return false;
        };

        // JSONR.revealReferences

        JSONR.revealReferences = function (text) {
            var begins = /"(?:[^"\\]|\\.)*"|[\[\{]/g,
                indexes = /\"[\uE000-\uF8FF]\"/g,
                index = 0;

            text = begins.test(text) ? text.replace(begins, function (s) {
                if (s.charAt(0) !== '"') {
                    s = '@' + index + s;
                    index += 1;
                }
                return s;
                
            }) : text;

            return indexes.test(text) ? text.replace(indexes, function (i) {
                return '"@' + (i.charCodeAt(1) - 0xE000) + '"';
            }) : text;
        };

        // JSONR.parse

        function unref(value) {
            var c, i, k, ks, length;

            switch (typeof value) {
            case 'string':
                if (value.length > 0) {
                    c = value.charCodeAt(0);
                    if (c >= 0xE000 && c <= 0xF8FF) {
                        if (value.length === 1) {
                            value = dy[c - 0xE000];
                        } else if (c === 0xE000) {
                            value = value.substr(1);
                        }
                    }
                }
                break;

            case 'object':
                if (value !== null) {
                    i = dy.indexOf(value);
                    if (i === -1) {
                        dy.push(value);
                    }

                    if (Object.prototype.toString.apply(value) === '[object Array]') {
                        length = value.length;
                        for (i = 0; i < length; i += 1) {
                            value[i] = unref(value[i]);
                        }
                    } else {
                        ks = Object.keys(value).sort();
                        length = ks.length;
                        for (i = 0; i < length; i += 1) {
                            k = ks[i];
                            value[k] = unref(value[k]);
                        }
                    }
                }
                break;
            }

            return value;
        }

        JSONR.parse = function (text, reviver) {
            var value = JSON.parse(text, reviver);
            dy = [];
            try {
                value = unref(value);
            } finally {
                dy = null;
            }
            return value;
        };
    }());
}