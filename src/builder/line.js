module.exports = Line;

var ExpressionGroup = require('../model/expression-group'),
    utility = require('../services/utils');

function Line(GroupSchema) {
    this.expressions = [];
    this.immutable = true;

    this.add = function (expression) {
        this.expressions.push(expression);
    };

    this.clone = function (id) {
        var index = utility.indexOf(this.expressions, function (item) {
            return item.id === id;
        });

        if (index < 0) {
            throw Error('Expression not found');
        }

        return angular.copy(this.expressions[index]);
    };

    this.get = function (id) {
        var index = utility.indexOf(this.expressions, function (item) {
            return item.id === id;
        });

        return this.expressions[index];
    };

    this.put = function (id, node, build) {
        this.immutable =  false;
        
        var index = utility.indexOf(this.expressions, function (item) {
            return item.id === id;
        });

        if (index < 0) {
            throw Error('Expression not found');
        }

        var schema = new GroupSchema(node, this),
            group = new ExpressionGroup();

        build(schema);
        schema.apply(group);
        group.id = id;
        this.expressions.splice(index, 1, group)
    };

    this.remove = function (id) {
        var index = utility.indexOf(this.expressions, function (item) {
            return item.id === id;
        });
        if (index < 0) {
            throw Error('Expression not found');
        }

        this.expressions[index].expressions = [];
    };
}