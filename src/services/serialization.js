var utility = require('./utils');

module.exports = SerializationService;

function SerializationService(node) {
    function serialize() {
        var groups = node.line.expressions.map(serializeGroup);
        var attrs = utility.clone(node.attributes);
        delete attrs.serialize;

        return {
            id: node.id,
            attributes: attrs,
            children: node.children.map(function (child) {
                return new SerializationService(child).serialize();
            }),
            line: groups.filter(function (group) {
                return group.expressions.length;
            })
        }
    }

    function serializeGroup(group) {
        return {
            id: group.id,
            expressions: group.expressions
                .filter(serializable)
                .map(serializeExpression)
        }
    }

    function serializable(expression) {
        var serializeAttr = node.attr('serialize');
        if (!serializeAttr) {
            return false;
        }

        var propertiesToSerialize = serializeAttr[expression.id];

        return propertiesToSerialize && propertiesToSerialize.length;
    }

    function serializeExpression(expression) {
        var serializeAttr = node.attr('serialize');

        var result = {},
            propertiesToSerialize = serializeAttr[expression.id];

        for (var i = 0, length = propertiesToSerialize.length; i < length; i++) {
            var prop = propertiesToSerialize[i];
            result[prop] = expression[prop];
        }
        result.id = expression.id;
        result.type = expression.type;
        result.method = expression.method;

        return result;
    }

    this.serialize = serialize;
}
