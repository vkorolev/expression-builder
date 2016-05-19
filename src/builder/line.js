module.exports = Line;

var ExpressionGroup = require('../model/expression-group'),
	 utility = require('../services/utils');

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

	this.add = function (expression) {
		this.expressions.push(expression);
	};

	this.clone = function (id) {
		return angular.copy(this.get(id));
	};

	this.get = function (id) {
		return this.expressions[getIndex(id)];
	};

	this.put = function (id, node, build) {
		var index = getIndex(id),
			 schema = new GroupSchema(node, this),
			 group = new ExpressionGroup();

		build(schema);
		schema.apply(group);
		group.id = id;
		this.expressions.splice(index, 1, group)
		this.immutable = false;
	};

	this.remove = function (id) {
		var index = getIndex(id);
		this.expressions[index].expressions = [];
	};
}