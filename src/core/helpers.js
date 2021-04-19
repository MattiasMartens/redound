"use strict";
exports.__esModule = true;
exports.unaryDerivationConsumer = exports.defaultDerivationSeal = void 0;
exports.defaultDerivationSeal = function (_a) {
    var remainingUnsealedSources = _a.remainingUnsealedSources, aggregate = _a.aggregate;
    return ({
        seal: !remainingUnsealedSources.size,
        output: undefined,
        aggregate: aggregate
    });
};
exports.unaryDerivationConsumer = function (mapper) { return function (_a) {
    var event = _a.event, aggregate = _a.aggregate;
    var _b = mapper(event.payload, aggregate), payload = _b.payload, newAggregate = _b.aggregate;
    return {
        aggregate: newAggregate,
        output: payload.map(function (item) { return ({
            payload: item,
            eventScope: event.eventScope,
            type: event.type,
            species: event.species
        }); })
    };
}; };
