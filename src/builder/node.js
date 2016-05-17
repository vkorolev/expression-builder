var ExpressionNode = require('../model/expression-node');

module.exports = Node;

function Node(schema, node, parent, attributes) {
    this.attributes = attributes || {};

    this.schema = schema;

    this.parent = parent;

    this.expression = node;

    this.level = parent ? parent.level + 1 : 0;
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
        ? this.expression.children.indexOf(after.expression)
        : this.expression.children.length - 1;

    this.expression.children.splice(index + 1, 0, child.expression);
    child.parent = this;
    child.level = this.level + 1;
};

Node.prototype.addChildBefore = function (child, before) {
    var index = before
        ? this.expression.children.indexOf(before.expression)
        : 0;

    this.expression.children.splice(index, 0, child.expression);
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

    var index = this.parent.expression.children.indexOf(this.expression);
    this.parent.expression.children.splice(index, 1);
};
