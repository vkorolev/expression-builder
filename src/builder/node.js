var ExpressionNode = require('../model/expression-node');

module.exports = Node;

function Node(schema, node, parent, attributes) {
    this.attributes = attributes || {};

    this.schema = schema;

    this.parent = parent;

    this.node = node;

    this.level = parent ? parent.level + 1 : 0;

    this.replace = function (id, build) {
        var builder = new GroupBuilder();
        var fakeNode = new Node();
        build(builder);
        builder.apply(fakeNode);

        var index = node.expressions.indexOf(this[id]);
        var groupExpression = fakeNode.expressions[0];
        groupExpression.id = id;
        groupExpression.parent = node;
        groupExpression.remove = function () {
            var index = node.expressions.indexOf(groupExpression);
            node.expressions.splice(index, 1);
        };

        this[id] = groupExpression;
        node.expressions.splice(index, 1, groupExpression);
    };
}

Node.prototype.attr = function (key, value) {
    if (arguments.length == 2) {
        this.attributes[key] = value;
    } else {
        return this.attributes[key];
    }
};

Node.prototype.addChildAfter = function (child, after) {
    var index = after
        ? this.node.children.indexOf(after.node)
        : this.node.children.length - 1;

    this.node.children.splice(index + 1, 0, child.node);
    child.parent = this;
    child.level = this.level + 1;
};

Node.prototype.addChildBefore = function (child, before) {
    var index = before
        ? this.node.children.indexOf(before.node)
        : 0;

    this.node.children.splice(index, 0, child.node);
    child.parent = this;
    child.level = this.level + 1;
};

Node.prototype.addAfter = function (child) {
    if (!this.parent) {
        throw Error('Root element can\'t be removed');
    }
    this.parent.addChildAfter(child, this);
};

Node.prototype.addBefore = function (child) {
    if (!this.parent) {
        throw Error('Root element can\'t be removed');
    }
    this.parent.addChildBefore(child, this);
};

Node.prototype.clone = function () {
    var newNode = new ExpressionNode();
    return this.schema.apply(newNode);
};

Node.prototype.remove = function () {
    if (!this.parent) {
        throw Error('Root element can\'t be removed');
    }

    var index = this.parent.node.children.indexOf(this.node);
    this.parent.node.children.splice(index, 1);
};
