"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
exports.reducedDerivationPrototype = exports.statefulDerivationPrototype = exports.mappedDerivationPrototype = void 0;
var derivation_1 = require("@/core/derivation");
var helpers_1 = require("@/core/helpers");
var functions_1 = require("@/patterns/functions");
function mappedDerivationPrototype(mapper, _a) {
    var _b = (_a === void 0 ? {} : _a).name, name = _b === void 0 ? "Mapped" : _b;
    return derivation_1.declareSimpleDerivation({
        consume: helpers_1.unaryDerivationConsumer(function (i) { return ({ payload: [mapper(i)], aggregate: undefined }); }),
        seal: helpers_1.defaultDerivationSeal,
        close: functions_1.noop,
        name: name,
        emits: new Set( /** TODO */),
        consumes: new Set( /** TODO */),
        open: functions_1.noop,
        unroll: functions_1.noop
    });
}
exports.mappedDerivationPrototype = mappedDerivationPrototype;
function statefulDerivationPrototype(transformer, initial, _a) {
    var _b = _a === void 0 ? {} : _a, _c = _b.name, name = _c === void 0 ? "Reduced" : _c, seal = _b.seal;
    return derivation_1.declareSimpleDerivation({
        consume: helpers_1.unaryDerivationConsumer(function (i, acc) {
            var _a = transformer(i, acc), state = _a.state, payload = _a.payload;
            return {
                payload: payload,
                aggregate: state
            };
        }),
        open: initial,
        close: functions_1.noop,
        seal: function (params) { return (__assign(__assign({}, helpers_1.defaultDerivationSeal(params)), seal && {
            output: seal(params.aggregate).map(function (payload) { return ({
                payload: payload,
                type: "ADD",
                species: "Seal",
                eventScope: "ROOT"
            }); })
        })); },
        name: name,
        emits: new Set( /** TODO */),
        consumes: new Set( /** TODO */),
        unroll: functions_1.noop
    });
}
exports.statefulDerivationPrototype = statefulDerivationPrototype;
function reducedDerivationPrototype(reducer, initial, _a) {
    var _b = (_a === void 0 ? {} : _a).name, name = _b === void 0 ? "Reduced" : _b;
    return derivation_1.declareSimpleDerivation({
        consume: helpers_1.unaryDerivationConsumer(function (i, acc) {
            var reduced = reducer(acc, i);
            return {
                payload: [reduced],
                aggregate: reduced
            };
        }),
        open: initial,
        seal: helpers_1.defaultDerivationSeal,
        close: functions_1.noop,
        name: name,
        emits: new Set( /** TODO */),
        consumes: new Set( /** TODO */),
        unroll: functions_1.noop
    });
}
exports.reducedDerivationPrototype = reducedDerivationPrototype;
