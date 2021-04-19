"use strict";
exports.__esModule = true;
exports.forEachPrototype = void 0;
var index_author_1 = require("@/core/index.author");
var functions_1 = require("@/patterns/functions");
function forEachPrototype(forEach, name) {
    return index_author_1.declareSimpleSink({
        open: functions_1.noop,
        close: functions_1.noop,
        consumes: new Set( /** TODO */),
        name: name !== null && name !== void 0 ? name : "ForEach",
        consume: function (e) {
            if (e.type === "ADD" || e.type === "UPDATE") {
                return forEach(e.payload);
            }
        }
    });
}
exports.forEachPrototype = forEachPrototype;
