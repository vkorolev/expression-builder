var utility = require('./utils'),
	 Node = require('../builder/node');

module.exports = DeserializationService;

function traverse(node, map) {
	if (!map.hasOwnProperty(node.id)) {
		map[node.id] = node;
	}

	for (var i = 0, length = node.children.length; i < length; i++) {
		var child = node.children[0]
		traverse(child, map);
	}
}

function DeserializationService(schema, GroupSchema) {
	function deserialize(data, parent, nodeMap) {
		nodeMap = nodeMap || {};

		if (!parent) {
			var node = new Node(data.id, schema);
			schema.apply(node);
			traverse(node, nodeMap);
			node.clear();
		} else {
			var node = nodeMap[data.id];
			node = node.clone();
			parent.addChildAfter(node);
			traverse(parent, nodeMap);
			node.clear();
		}

		node.attributes = data.attributes;
		deserializeLine(node, node.line, data.line);

		var children = data.children,
			 length = children.length;

		for (var i = 0; i < length; i++) {
			var child = children[i];
			new DeserializationService(schema.schemaMap[child.id], GroupSchema).deserialize(child, node, nodeMap);

		}

		return node;
	}

	function deserializeLine(node, line, dataLine) {
		for (var i = 0, length = dataLine.length; i < length; i++) {
			var serializedGroup = dataLine[i];

			deserializeGroup(node, line, line.get(serializedGroup.id), serializedGroup);
		}
	}

	function deserializeGroup(node, line, group, dataGroup) {
		var serializedExpressions = dataGroup.expressions,
			 length = serializedExpressions.length;

		for (var i = 0; i < length; i++) {
			var serializedExp = serializedExpressions[i];

			var index = utility.indexOf(group.expressions, function (expression) {
				return expression.id === serializedExp.id;
			});

			utility.override(group.expressions[index], serializedExp);
		}

		for (var i = 0; i < length; i++) {
			if (serializedExpressions[i].method) {
				serializedExpressions[i].method.forEach(function (m) {
					group.expressions[index][m](node, line);
					group.expressions[index].method = serializedExpressions[i].method;
				});
			}
		}
	}

	this.deserialize = deserialize;
}
