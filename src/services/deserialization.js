var utility = require('./utils'),
    Line = require('../builder/line'),
    Node = require('../builder/node');

module.exports = DeserializationService;

function traverse(node, map) {
    if (!map.hasOwnProperty(node.id)) {
        map[node.id] = {visited: false, node: node};
    }

    for (var i = 0, length = node.children.length; i < length; i++) {
        var child = node.children[0]
        traverse(child, map);
    }
}

function DeserializationService(schema, GroupSchema) {
    function deserialize(data, parent, nodes) {
        var fake = new Node(data.id, schema);
        nodes = nodes || {};

        if (!parent) {
            var node = new Node(data.id, schema);
            schema.apply(node);
            traverse(node, nodes);
            node.clear();
        } else {
            var node = nodes[data.id];
            node = node.node.clone();
            parent.addChildAfter(node);
            traverse(parent, nodes);
            node.clear();
            // if(!node.visited){
            //     node.visited = true;
            //     node = node.node;
            // }
            // else{
            //     node = node.node.clone();
            //     parent.addChildAfter(node);
            //     traverse(parent, nodes);
            //     node.clear();
            // }
        }

        node.attributes = data.attributes;

        deserializeLine(node, node.line, data.line);

        var children = data.children,
            length = children.length;

        for (var i = 0; i < length; i++) {
            var child = children[i];
            console.log('child.id: ' + child.id + ' ' + (schema.schemaMap[child.id] ? 'true' : 'false'));
            new DeserializationService(schema.schemaMap[child.id], GroupSchema).deserialize(child, node, nodes);

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

            console.log('Index of group: ' + index);

            utility.override(group.expressions[index], serializedExp);

        }


        for (var i = 0; i < length; i++) {
            if (serializedExpressions[i].method) {
                serializedExpressions[i].method.forEach(function (m) {
                    group.expressions[index][m](node, line);
                });
            }
        }
    }

    this.deserialize = deserialize;
}
