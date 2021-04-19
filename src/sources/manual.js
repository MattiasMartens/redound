"use strict";
exports.__esModule = true;
exports.manualSourcePrototype = void 0;
var functions_1 = require("@/patterns/functions");
var function_1 = require("fp-ts/lib/function");
var Option_1 = require("fp-ts/lib/Option");
var source_1 = require("../core/source");
function manualSourcePrototype(params) {
    if (params === void 0) { params = {}; }
    var _a = params.name, name = _a === void 0 ? "Manual" : _a;
    return source_1.declareSimpleSource({
        close: functions_1.noop,
        name: name,
        emits: new Set( /** TODO */),
        open: function () {
            var initialValueExists = "initialValue" in params;
            var state = initialValueExists ? Option_1.some(params.initialValue) : Option_1.none;
            var emit;
            return {
                get: function () { return state; },
                set: function (t) {
                    state = Option_1.some(t);
                    emit({
                        type: "UPDATE",
                        species: "UPDATE",
                        eventScope: "ROOT",
                        payload: t
                    });
                    return t;
                },
                registerEmit: function (_emit) {
                    emit = _emit;
                    function_1.pipe(state, Option_1.map(function (t) { return emit({
                        type: "ADD",
                        species: "INITIAL",
                        eventScope: "ROOT",
                        payload: t
                    }); }));
                }
            };
        },
        generate: function (emit, references) {
            references.registerEmit(emit);
        }
    });
}
exports.manualSourcePrototype = manualSourcePrototype;
