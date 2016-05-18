var utility = require('./utils');

module.exports = serialize;

function serialize(node) {
    return {
        id: node.id,
        children: node.children.map(serialize),
        line: node.expressions.map(serializeGroup)
    }
}

function serializeGroup(group) {
    return {
        id: group.id,
        expressions: group.expressions.map(serializeExpression)
    }
}

function serializeExpression(expression) {
    var keys = Object.keys(expression),
        length = keys.length,
        result = {};

    for (var i = 0; i < length; i++) {
        var key = keys[i],
            value = expression[key];
        if (!utility.isFunction(value)) {
            result[key] = value;
        }
    }

    return result;
}
