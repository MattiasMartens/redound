"use strict";
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
exports.__esModule = true;
exports.flatMap = exports.isIterable = exports.mapIterable = exports.tapIterable = exports.forEachIterable = exports.without = exports.filterIterable = void 0;
function filterIterable(iterable, filter) {
    var i, _i, iterable_1, value;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                i = 0;
                _i = 0, iterable_1 = iterable;
                _a.label = 1;
            case 1:
                if (!(_i < iterable_1.length)) return [3 /*break*/, 5];
                value = iterable_1[_i];
                if (!filter(value, i)) return [3 /*break*/, 3];
                return [4 /*yield*/, value];
            case 2:
                _a.sent();
                _a.label = 3;
            case 3:
                i++;
                _a.label = 4;
            case 4:
                _i++;
                return [3 /*break*/, 1];
            case 5: return [2 /*return*/];
        }
    });
}
exports.filterIterable = filterIterable;
function without(arr, against, keyFn) {
    var againstAsSet, _i, arr_1, item, key;
    if (keyFn === void 0) { keyFn = function (item) { return item; }; }
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                againstAsSet = new Set(mapIterable(against, keyFn));
                _i = 0, arr_1 = arr;
                _a.label = 1;
            case 1:
                if (!(_i < arr_1.length)) return [3 /*break*/, 4];
                item = arr_1[_i];
                key = keyFn(item);
                if (!!againstAsSet.has(key)) return [3 /*break*/, 3];
                return [4 /*yield*/, item];
            case 2:
                _a.sent();
                _a.label = 3;
            case 3:
                _i++;
                return [3 /*break*/, 1];
            case 4: return [2 /*return*/];
        }
    });
}
exports.without = without;
function forEachIterable(iterable, mapper) {
    var i = 0;
    for (var _i = 0, iterable_2 = iterable; _i < iterable_2.length; _i++) {
        var value = iterable_2[_i];
        mapper(value, i);
        i++;
    }
}
exports.forEachIterable = forEachIterable;
function tapIterable(iterable, forEach) {
    var i, _i, iterable_3, value;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                i = 0;
                _i = 0, iterable_3 = iterable;
                _a.label = 1;
            case 1:
                if (!(_i < iterable_3.length)) return [3 /*break*/, 4];
                value = iterable_3[_i];
                forEach(value, i);
                return [4 /*yield*/, value];
            case 2:
                _a.sent();
                i++;
                _a.label = 3;
            case 3:
                _i++;
                return [3 /*break*/, 1];
            case 4: return [2 /*return*/];
        }
    });
}
exports.tapIterable = tapIterable;
function mapIterable(iterable, mapper) {
    var i, _i, iterable_4, value;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                i = 0;
                _i = 0, iterable_4 = iterable;
                _a.label = 1;
            case 1:
                if (!(_i < iterable_4.length)) return [3 /*break*/, 4];
                value = iterable_4[_i];
                return [4 /*yield*/, mapper(value, i)];
            case 2:
                _a.sent();
                i++;
                _a.label = 3;
            case 3:
                _i++;
                return [3 /*break*/, 1];
            case 4: return [2 /*return*/];
        }
    });
}
exports.mapIterable = mapIterable;
function isIterable(obj) {
    // checks for null and undefined
    if (obj == null) {
        return false;
    }
    return typeof obj[Symbol.iterator] === 'function';
}
exports.isIterable = isIterable;
function flatMap(arr, fn) {
    var index, _i, arr_2, val, out;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                index = 0;
                _i = 0, arr_2 = arr;
                _a.label = 1;
            case 1:
                if (!(_i < arr_2.length)) return [3 /*break*/, 6];
                val = arr_2[_i];
                index++;
                out = fn(val, index);
                if (!isIterable(out)) return [3 /*break*/, 3];
                // @ts-ignore
                return [5 /*yield**/, __values(out)];
            case 2:
                // @ts-ignore
                _a.sent();
                return [3 /*break*/, 5];
            case 3: 
            // @ts-ignore
            return [4 /*yield*/, out];
            case 4:
                // @ts-ignore
                _a.sent();
                _a.label = 5;
            case 5:
                _i++;
                return [3 /*break*/, 1];
            case 6: return [2 /*return*/];
        }
    });
}
exports.flatMap = flatMap;
