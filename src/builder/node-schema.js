var Node = require('./node');
var Line = require('./line');
var ExpressionGroup = require('../model/expression-group');
var DeserializationService = require('../services/deserialization');

module.exports = function (GroupSchema, undefined) {
    function NodeSchema() {
        var self = this;
        var deserializationService = new DeserializationService(self, GroupSchema);

        this.plan = [];
        this.planMap = {};
        this.schemaMap = {};
        this.deserialize = function (data) {
            return deserializationService.deserialize(data, self);
        };
    }

    NodeSchema.prototype.attr = function (key, value) {
        var addAttribute = function (node, line) {
            node.attr(key, value);
        };

        this.plan.push(addAttribute);

        return this;
    };

    NodeSchema.prototype.apply = function () {
        var line = new Line(GroupSchema);
        var node = new Node(this, line);

        this.plan.forEach(function (p) {
            p(node, line);
        });

        return node;
    };

    NodeSchema.prototype.node = function (id, build) {
        var self = this;

        if (!build) {
            throw new Error('Build function is not defined');
        }

        var buildNode = function (node, line) {
            var schema = new NodeSchema();
            build(schema);

            var newNode = schema.apply();
            newNode.id = id;
            newNode.parent = node;
            newNode.level = node.level + 1;

            node.children.push(newNode);

            self.schemaMap[id] = schema;

            return node;
        };

        this.plan.push(buildNode);

        return this;
    };

    NodeSchema.prototype.group = function (id, build) {
        if (!build) {
            throw new Error('Build function is not defined');
        }

        var buildGroup = function (node, line) {
            var expressionGroup = new ExpressionGroup();
            expressionGroup.id = id;

            var schema = new GroupSchema(node, line);
            build(schema);
            schema.apply(expressionGroup);

            line.add(expressionGroup);

            return node;
        };

        this.plan.push(buildGroup);
        this.planMap[id] = buildGroup;

        return this;
    };

    return NodeSchema;
};