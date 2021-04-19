"use strict";
exports.__esModule = true;
exports.registerKey = void 0;
var keyRegistry = new Set();
exports.registerKey = function (id) {
    if (keyRegistry.has(id)) {
        throw new Error("Tried to register key more than once: " + id);
    }
    else {
        keyRegistry.add(id);
        return id;
    }
};
