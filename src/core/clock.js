"use strict";
exports.__esModule = true;
exports.awaitTick = exports.tick = exports.clock = void 0;
function clock(tick) {
    if (tick === void 0) { tick = 0; }
    return {
        tick: tick,
        awaiters: new Map()
    };
}
exports.clock = clock;
exports.tick = function (clock) {
    clock.tick++;
    clock.awaiters.forEach(function (fns, clockValue) {
        if (clockValue <= clock.tick) {
            fns.forEach(function (f) { return f(clock.tick); });
        }
    });
    return clock;
};
function awaitTick(clock, tick) {
    return new Promise(function (resolve) {
        if (tick <= clock.tick) {
            resolve(tick);
        }
        else {
            if (!clock.awaiters.has(tick)) {
                clock.awaiters.set(tick, []);
            }
            var resolveSet = clock.awaiters.get(tick);
            resolveSet.push(resolve);
        }
    });
}
exports.awaitTick = awaitTick;
