module.exports = {
    asArray: asArray,
    clone: clone,
    defaults: defaults,
    indexOf: indexOf,
    isArray: Array.isArray,
    isFunction: isFunction,
    isObject: isObject,
    override: override,
    identity: identity
    
};

function indexOf(array, predicate) {
    for (var i = 0, length = array.length; i < length; i++) {
        if (predicate(array[i], i)) {
            return i;
        }
    }
    return -1;
}

function asArray(args) {
    return Array.prototype.slice.call(args);
}

function clone(object) {
    var result = {},
        keys = Object.keys(object);
    for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i];
        result[key] = object[key]
    }

    return result;
}

function defaults(dst) {
    var sourcesLength = arguments.length;
    var args = asArray(arguments);
    var result = clone(dst);

    for (var i = 1; i < sourcesLength; i++) {
        var source = args[i];

        if (!source) {
            continue;
        }

        var keys = Object.keys(source);

        for (var k = 0, keysLength = keys.length; k < keysLength; k++) {
            var key = keys[k];
            if (!result.hasOwnProperty(key)) {
                result[key] = source[key];
            }
        }
    }

    return result;
}

function isFunction(value) {
    return typeof value === 'function';
}

function isObject(value) {
    return value !== null && typeof value === 'object';
}

function override(dst, src) {
    var keys = Object.keys(src),
        length = keys.length;

    for(var i = 0; i < length; i++) {
        var key = keys[i];
        dst[key] = src[key];
    }

    return dst;
}

function identity() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}
