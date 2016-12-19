module.exports = Line;

var ExpressionGroup = require('../model/expression-group'),
	utility = require('../services/utils'),
	Empty = require('../model/empty');

function Line(GroupSchema) {
	this.expressions = [];

	// TODO add decorator for muttable methods instead of trigger
	this.immutable = true;

	var getIndex = (function (id) {
		var index = utility.indexOf(this.expressions, function (item) {
			return item.id === id;
		});

		if (index < 0) {
			throw Error('Expression ' + id + ' not found');
		}

		return index;
	}).bind(this);

	var findById = function (expressions, id, parent) {
		for (var i = 0, length = expressions.length; i < length; i++) {
			if (expressions[i].id == id) {
				return {
					index: i,
					expression: expressions[i],
					parent: parent
				}
			}
			if (expressions[i] instanceof ExpressionGroup) {
				var child = findById(expressions[i].expressions, id, expressions[i]);
				if (child) {
					return child;
				}
			}
		}
	};

	this.add = function (expression) {
		this.expressions.push(expression);
	};

	this.clone = function (id) {
		return angular.copy(this.get(id));
	};

	this.get = function (id) {
		var expression = findById(this.expressions, id);

		if (!expression) {
			throw Error('Expression ' + id + ' not found');
		}

		return expression.expression;
	};

	this.put = function (id, node, build) {
		var index = getIndex(id),
			schema = new GroupSchema(node, this),
			group = new ExpressionGroup();

		var item = findById(this.expressions, id);
		var expressions = item.parent ? parent.expressions : this.expressions;
		if (item.expression instanceof ExpressionGroup) {
			build(schema);
			schema.apply(group);
			group.id = id;
			this.expressions.splice(index, 1, group)
			this.immutable = false;
		} else {
			throw new Error('Unsupported operation: put to expression, that is not a group');
		}
	};

	this.remove = function (id) {
		var item = findById(this.expressions, id);
		var expressions = item.parent ? parent.expressions : this.expressions;
		if (item.expression instanceof ExpressionGroup) {
			item.expression.expressions = [];
		} else {
			throw new Error('Unsupported operation: remove expression, that is not a group');
		}
	};
}