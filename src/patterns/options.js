"use strict";
exports.__esModule = true;
exports.getSome = void 0;
var Option_1 = require("fp-ts/lib/Option");
function getSome(option, errorMessage) {
    if (errorMessage === void 0) { errorMessage = function () { return "Expected Option type to be Some but it was None"; }; }
    return Option_1.getOrElse(function () {
        var toThrow = errorMessage();
        throw toThrow instanceof Error ? toThrow : new Error(toThrow);
    })(option);
}
exports.getSome = getSome;
