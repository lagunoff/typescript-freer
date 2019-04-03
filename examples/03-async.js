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
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
exports.__esModule = true;
var async_1 = require("../src/async");
var io_1 = require("../src/io");
var state_1 = require("../src/state");
var src_1 = require("../src");
var async01 = async_1.Async.subscribe(function (next, complete) { return (setTimeout(function () { return (next(Math.floor(Math.random() * 100)), complete()); }, 1000), noopFunc); });
function process() {
    var value;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, log('Process started')];
            case 1:
                _a.sent();
                return [4 /*yield*/, async01];
            case 2:
                value = _a.sent();
                return [4 /*yield*/, log('value', value)];
            case 3:
                _a.sent();
                return [4 /*yield*/, state_1.State.set(value)];
            case 4:
                _a.sent();
                return [5 /*yield**/, __values(state_1.State.modify(function (value) { return value * value; }))];
            case 5:
                _a.sent();
                return [4 /*yield*/, state_1.State.get()];
            case 6:
                value = _a.sent();
                return [4 /*yield*/, log('value', value)];
            case 7:
                _a.sent();
                return [4 /*yield*/, async01.map(String)];
            case 8:
                value = _a.sent();
                return [4 /*yield*/, log('value', value)];
            case 9:
                _a.sent();
                return [4 /*yield*/, new async_1.Pure(value)];
            case 10:
                _a.sent();
                return [2 /*return*/];
        }
    });
}
exports.process = process;
var log = function () {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    return io_1.IO.create.apply(io_1.IO, [console.log].concat(args));
};
var counter = 0;
src_1.runEffects(process(), src_1.compose(io_1.runIO, state_1.runState(function () { return counter; }, function (next) { return counter = next; }), async_1.runAsync), function (result) {
    console.log('result arrived', result);
});
function noopFunc() { }
