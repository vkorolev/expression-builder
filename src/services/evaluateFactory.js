var utils = require('./utils');

module.exports = evaluateFactory;

function evaluateFactory(thisContext, parameters) {
	return visit;

	function visit(object) {
		if(utils.isObject(object)) {
			return visitObject(object);
		} else if (utils.isArray(object)) {
			return visitArray(object);
		} else if (utils.isFunction(object)) {
			return visitFunction(object);
		}

		return object;
	}

	function visitObject(object) {
		var keys = Object.keys(object),
			length = keys.length,
			result = {};

		for (var i = 0; i < length; i++) {
			var key = keys[i];
			result[key] = visit(object[key]);
		}

		return result;
	}

	function visitArray(array) {
		var result = [];
		for (var i = 0, length = array.length; i < length; i++) {
			result[i] = visit(array[i]);
		}
		return result;
	}

	function visitFunction(delegate) {
		return delegate.apply(thisContext, parameters);
	}
}