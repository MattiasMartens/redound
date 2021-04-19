"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
exports.initializeTag = void 0;
var runtime_1 = require("@/runtime");
var uuid_1 = require("uuid");
var SEPARATOR = '::';
function initializeTag(prefix, id) {
    var tag = __spreadArrays((prefix === undefined ? [] : [prefix]), [
        id === undefined ? uuid_1.v4() : id
    ]).join(SEPARATOR);
    return runtime_1.registerKey(tag);
}
exports.initializeTag = initializeTag;
