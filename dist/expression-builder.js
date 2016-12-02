(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (angular, undefined) {

   var module = angular.module('expression-builder', []);

   require('./builder/expression-builder')(angular);
   require('./model/eb-expression')(angular);
   require('./model/eb-node')(angular);
   require('./model/eb-class')(angular);

   var SerializationService = require('./services/serialization'),
       DeserializationService = require('./services/deserialization'),
       TraverseService = require('./services/traverse');

   module
       .factory('expressionBuilderSerializer', [function () {
      return {
         serialize: function (node) {
            return new SerializationService(node).serialize();
         },
         deserialize: function (schema, data) {
            return new DeserializationService(schema).deserialize(data);
         }
      }
   }])
       .service('expressionBuilderTraverse', [TraverseService]);

})(angular);
},{"./builder/expression-builder":2,"./model/eb-class":7,"./model/eb-expression":8,"./model/eb-node":9,"./services/deserialization":12,"./services/serialization":15,"./services/traverse":16}],2:[function(require,module,exports){
var nodeSchemaFactoryT = require('./node-schema'),
	 groupSchemaFactoryT = require('./group-schema'),
	 patch = require('../services/patch'),
	 utility = require('../services/utils'),
	 ExpressionGroup = require('../model/expression-group'),
	 EmptyExpression = require('../model/empty');

module.exports = function (angular) {
	angular.module('expression-builder').factory('ExpressionBuilder', Factory);
	Factory.$inject = [];

	function Factory() {
		function ExpressionBuilder(expressions, globalSettings) {
			var GroupSchema = groupSchemaFactoryT();
			var NodeSchema = nodeSchemaFactoryT(GroupSchema);

			expressions.concat([EmptyExpression]).forEach(function (settings) {
				var factory = function () {
					var id = utility.identity(), parameters = {};
					if (arguments.length > 1) {
						id = arguments[0];
						parameters = arguments[1];
					} else if (arguments.length == 1) {
						parameters = arguments[0];
					}
					
					var build = function (node, line) {
						var expression = utility.defaults(parameters, settings.defaults, globalSettings.defaults);
						expression.id = id;
						expression.type = settings.type;

						var group = new ExpressionGroup();
						group.id = id;
						group.expressions.push(expression);
						expression.template = settings.templateUrl;
						line.add(group);

						patch.methodsOf(expression).with(node, line);

						var keys = Object.keys(expression);

						keys.forEach(function (key) {
							var sourceFunction = expression[key];

							if (utility.isFunction(sourceFunction)) {
								expression[key] = function () {
									var argList = utility.asArray(arguments);
									var result = sourceFunction.apply(expression, argList);

									// TODO add decorator for muttable methods instead of trigger
									if (!line.immutable) {
										expression.method = expression.method || [];
										if (expression.method.indexOf(key) < 0) {
											expression.method.push(key);
										}

										line.immutable = true;
									}
									return result;
								};
							}
						});

						return node;
					};

					this.plan.push(build);
					this.planMap[id] = build;

					return this;
				};

				var groupFactory = function () {
					var id = utility.identity(), parameters = {};
					if (arguments.length > 1) {
						id = arguments[0];
						parameters = arguments[1];
					} else if (arguments.length == 1) {
						parameters = arguments[0];
					}

					var build = function (node, line, expressionGroup) {
						var expression = utility.defaults(parameters, settings.defaults, globalSettings.defaults);
						expression.id = id;
						expression.type = settings.type;
						expression.template = settings.templateUrl;
						expressionGroup.expressions.push(expression);

						patch.methodsOf(expression).with(node, line);

						return node;
					};

					this.plan.push(build);

					return this;
				};
				
				NodeSchema.prototype[settings.type] = factory;
				GroupSchema.prototype[settings.type] = groupFactory;			
			});

			return new NodeSchema();
		}

		return ExpressionBuilder;
	}
};
},{"../model/empty":10,"../model/expression-group":11,"../services/patch":14,"../services/utils":17,"./group-schema":3,"./node-schema":5}],3:[function(require,module,exports){
module.exports = function () {
   function GroupSchema(node, line) {
      this.plan = [];
      this.line = line;
      this.node = node;
   }

   GroupSchema.prototype.apply = function (expressionGroup) {
      var self = this;
      this.plan.forEach(function (p) {
         p(self.node, self.line, expressionGroup);
      });
   };

   return GroupSchema;
};

},{}],4:[function(require,module,exports){
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
},{"../model/empty":10,"../model/expression-group":11,"../services/utils":17}],5:[function(require,module,exports){
var Node = require('./node'),
    Line = require('./line'),
    ExpressionGroup = require('../model/expression-group');

module.exports = function (GroupSchema, undefined) {
    function NodeSchema(map) {
        this.plan = [];
        this.planMap = {};
        this.schemaMap = map || {};
        this.GroupSchema = GroupSchema;
    }

    NodeSchema.prototype.clone = function () {
        var schema = new NodeSchema(this.map);
        schema.plan = this.plan;
        schema.planMap = this.planMap;
        return schema;

    };

    NodeSchema.prototype.attr = function (key, value) {
        var addAttribute = function (node, line) {
            node.attr(key, value);
        };

        this.plan.push(addAttribute);

        return this;
    };

    NodeSchema.prototype.apply = function (node) {
        node = node || new Node('#root', this);

        var line = new Line(GroupSchema);
        node.line = line;

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
            var schema = new NodeSchema(self.schemaMap);
            build(schema);

            var newNode = new Node(id, schema, node);
            schema.apply(newNode);
            node.addChildAfter(newNode);
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
},{"../model/expression-group":11,"./line":4,"./node":6}],6:[function(require,module,exports){
var utility = require('../services/utils');

module.exports = Node;

function Node(id, schema, parent) {
    this.id = id;
    this.attributes = {};
    this.schema = schema;
    this.parent = parent;
    this.children = [];
    this.level = parent ? parent.level + 1 : 0;
}

Node.prototype.attr = function (key, value) {
    if (value !== undefined) {
        this.attributes[key] = value;
    } else {
        return this.attributes[key];
    }
};

Node.prototype.classes = function () { 
};

Node.prototype.addChildAfter = function (child, after) {
    var index = after
        ? this.children.indexOf(after)
        : this.children.length - 1;

    this.children.splice(index + 1, 0, child);
    child.parent = this;
    child.level = this.level + 1;
};

Node.prototype.addChildBefore = function (child, before) {
    var index = before
        ? this.children.indexOf(before)
        : 0;

    this.children.splice(index, 0, child);
    child.parent = this;
    child.level = this.level + 1;
};

Node.prototype.addAfter = function (child) {
    if (!this.parent) {
        throw Error('Can\'t add after root');
    }
    this.parent.addChildAfter(child, this);
};

Node.prototype.addBefore = function (child) {
    if (!this.parent) {
        throw Error('Can\'t add before root');
    }
    this.parent.addChildBefore(child, this);
};

Node.prototype.clone = function () {
    var node = new Node(this.id, this.schema);
    return this.schema.apply(node);
};

Node.prototype.remove = function () {
    if (!this.parent) {
        throw Error('Root element can\'t be removed');
    }

    var index = this.parent.children.indexOf(this);
    this.parent.children.splice(index, 1);
};

Node.prototype.clear = function () {
    this.children.forEach(function (child) {
        child.parent = null;
    });

    this.children = [];
};

Node.prototype.toString = function (ident) {
    ident = ident || 0;
    return Array(ident).join('-') + this.expression.id + ' ' + this.level + '\n' +
        this.children
            .map(function (child) {
                return child.toString(ident + 1);
            })
            .join('\n');
};

Node.prototype.toTraceString = function (ident) {
    if (null != this.parent) {
        var parent = this.parent;
        while (null !== parent.parent) {
            parent = parent.parent
        }

        return parent.toString();
    }

    return this.toString();
};
},{"../services/utils":17}],7:[function(require,module,exports){
var utils = require('../services/utils'),
    evaluateFactory = require('../services/evaluateFactory');

module.exports = function (angular) {
    angular.module('expression-builder').directive('ebClass', Directive);

    Directive.$inject = ['$parse'];

    function Directive($parse) {
        return {
            restrict: 'A',
            link: function (scope, element, attr) {
                var getter = $parse(attr.ebClass),
                    contextGetter = $parse(attr.ebClassContext),
                    classes = '';

                scope.$watch(function () {
                    return evaluateFactory(contextGetter(scope), [scope.node])(getter(scope));
                }, function (value) {
                    if(value) {
                        var oldClasses = classes;
                        var newClasses = fetchClasses(value).join(' ');
                        if (oldClasses !== newClasses) {
                            classes = newClasses;
                            element.removeClass(oldClasses);
                            element.addClass(classes);
                        }
                    }
                    else{
                        element.removeClass(classes);
                        classes = '';
                    }
                }, true);

                function fetchClasses(object) {
                    var keys = Object.keys(object),
                        length = keys.length,
                        classes = [];

                    for (var i = 0; i < length; i++) {
                        var key = keys[i];
                        if (object[key]) {
                            classes.push(key);
                        }
                    }

                    return classes;
                }
            }
        }
    }
};
},{"../services/evaluateFactory":13,"../services/utils":17}],8:[function(require,module,exports){
var evaluateFactory = require('../services/evaluateFactory');

module.exports = function (angular) {

	angular.module('expression-builder').directive('ebExpression', Directive);

	Directive.$inject = ['$templateCache', '$compile'];

	function Directive($templateCache, $compile) {
		return {
			restrict: 'A',
			scope: {
				expression: '=ebExpression',
				node: '=',
				line: '='
			},
			link: function (scope, element, attr) {
				var $watch = scope.expression.$watch = scope.expression.$watch || {};
				var evaluate = evaluateFactory(scope.expression, [scope.node, scope.line]);

				var keys = Object.keys($watch),
					length = keys.length;

				for (var i = 0; i < length; i++) {
					var key = keys[i],
						watch = scope.expression.$watch[key];

					watchFactory(scope.expression, key, watch);
				}

				var template = $templateCache.get(scope.expression.template);
				var expression = $compile(template)(scope);
				element.append(expression);

				function watchFactory (context, key, handler) {
					scope.$watch(function () {
						return evaluate(context[key]);
					}, function (newVal, oldVal) {
						handler.apply(scope.expression, [newVal, oldVal, scope.node, scope.line]);
					}, true);
				}
			}
		}
	}
};
},{"../services/evaluateFactory":13}],9:[function(require,module,exports){
module.exports = function (angular) {
    angular.module('expression-builder').directive('ebNode', Directive);

    Directive.$inject = [];

    function Directive() {
        return {
            restrict: 'A',
            scope: {
                node: '=ebNode'
            },
            templateUrl: 'eb-node.html',
            link: function (scope, element, attr) {
            }
        }
    }
};
},{}],10:[function(require,module,exports){
module.exports = Empty;

function Empty() {
    this.type = 'empty';
    this.template = '';
}

},{}],11:[function(require,module,exports){
module.exports = Group;

function Group() {
    this.type = 'group';
    this.expressions = [];
    this.template = 'eb-group.html';
}

},{}],12:[function(require,module,exports){
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

function DeserializationService(schema) {
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

        utility.override(node.attributes, data.attributes);

        deserializeLine(node, node.line, data.line);

        var children = data.children,
            length = children.length;

        for (var i = 0; i < length; i++) {
            var child = children[i];
            new DeserializationService(schema.schemaMap[child.id]).deserialize(child, node, nodeMap);

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

},{"../builder/node":6,"./utils":17}],13:[function(require,module,exports){
var utils = require('./utils');

module.exports = evaluateFactory;

function evaluateFactory(thisContext, parameters) {
	return visit;

	function visit(object) {
		if(utils.isObject(object)) {
			return visitObject(object);
		} else if (utils.isArray(object)) {
			return visitArray(object);
		} else if (utils.isFunction(object)) {
			return visitFunction(object);
		}

		return object;
	}

	function visitObject(object) {
		var keys = Object.keys(object),
			length = keys.length,
			result = {};

		for (var i = 0; i < length; i++) {
			var key = keys[i];
			result[key] = visit(object[key]);
		}

		return result;
	}

	function visitArray(array) {
		var result = [];
		for (var i = 0, length = array.length; i < length; i++) {
			result[i] = visit(array[i]);
		}
		return result;
	}

	function visitFunction(delegate) {
		return delegate.apply(thisContext, parameters);
	}
}
},{"./utils":17}],14:[function(require,module,exports){
var utility = require('./utils');

module.exports = {
    method: method,
    methodsOf: methodsOf
};

function method(object, key) {
    var sourceFunction = object[key];

    return {
        with: withFactory(object, key, sourceFunction)
    }
}

function methodsOf(obj) {
    var keys = Object.keys(obj),
        length = keys.length,
        patch = {};

    for (var i = 0; i < length; i++) {
        var key = keys[i];

        if (utility.isFunction(obj[key])) {
            patch[key] = method(obj, key);
        }
    }

    return {
        with: function () {
            var keys = Object.keys(patch),
                length = keys.length,
                args = utility.asArray(arguments);

            for (var i = 0; i < length; i++) {
                var key = keys[i];
                obj.action = key;
                patch[key].with.apply(obj, args);
            }
        }
    }
}

function withFactory(object, key, sourceFunction) {
    var withFunction = function () {
        var args = utility.asArray(arguments);

        object[key] = function () {
            var argList = utility.asArray(arguments);
            return sourceFunction.apply(object, args.concat(argList));
        };
    };

    withFunction.decorator = function (decorate) {
        var args = utility.asArray(arguments).slice(1);

        object[key] = function () {
            return decorate.apply(object, [sourceFunction, object, key].concat(args));
        };
    };

    return withFunction;
}

},{"./utils":17}],15:[function(require,module,exports){
var utility = require('./utils');

module.exports = SerializationService;

function SerializationService(node) {
    function serialize() {
        var groups = node.line.expressions.map(serializeGroup);

        return {
            id: node.id,
            attributes: serializeAttributes(node),
            children: node.children.map(function (child) {
                return new SerializationService(child).serialize();
            }),
            line: groups.filter(function (group) {
                return group.expressions.length;
            })
        }
    }

    function serializeAttributes(node) {
    	var serialize = node.attr('serialize');
		if (serialize && serialize['@attr']) {
			var attrs = serialize['@attr'];
			return attrs.reduce(function (memo, attr) {
				memo[attr] = node.attr(attr);
				return memo;
			}, {})
		}
		return {};
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

},{"./utils":17}],16:[function(require,module,exports){
module.exports = TraverseService;

function TraverseService() {
    function visitLine(reduce, memo, node, line) {
        var groups = line.expressions,
            length = groups.length;

        for (var i = 0; i < length; i++) {
            memo = visitGroup(reduce, memo, node, line, groups[i]);
        }

        return memo;
    }

    function visitGroup(reduce, memo, node, line, group) {
        var expressions = group.expressions,
            length = expressions.length;

        for (var i = 0; i < length; i++) {
            memo = reduce(memo, expressions[i], line, node);
        }

        return memo;
    }

    this.depth = function (root) {
        var self = this;

        return function (reduce, memo) {
            memo = visitLine(reduce, memo, root, root.line);

            var children = root.children,
                length = children.length;

            for (var i = 0; i < length; i++) {
                memo = self.depth(children[i])(reduce, memo);
            }

            return memo;
        };
    };

}

},{}],17:[function(require,module,exports){
module.exports = {
    asArray: asArray,
    clone: clone,
    defaults: defaults,
    indexOf: indexOf,
    isArray: Array.isArray,
    isFunction: isFunction,
    isObject: isObject,
    override: override,
    identity: identity
};

function indexOf(array, predicate) {
    for (var i = 0, length = array.length; i < length; i++) {
        if (predicate(array[i], i)) {
            return i;
        }
    }
    return -1;
}

function asArray(args) {
    return Array.prototype.slice.call(args);
}

function clone(object) {
    var result = {},
        keys = Object.keys(object);
    for (var i = 0, length = keys.length; i < length; i++) {
        var key = keys[i];
        result[key] = object[key]
    }

    return result;
}

function defaults(dst) {
    var sourcesLength = arguments.length;
    var args = asArray(arguments);
    var result = clone(dst);

    for (var i = 1; i < sourcesLength; i++) {
        var source = args[i];

        if (!source) {
            continue;
        }

        var keys = Object.keys(source);

        for (var k = 0, keysLength = keys.length; k < keysLength; k++) {
            var key = keys[k];
            if (!result.hasOwnProperty(key)) {
                result[key] = source[key];
            }
        }
    }

    return result;
}

function isFunction(value) {
    return typeof value === 'function';
}

function isObject(value) {
    return value !== null && typeof value === 'object';
}

function override(dst, src) {
    var keys = Object.keys(src),
        length = keys.length;

    for(var i = 0; i < length; i++) {
        var key = keys[i];
        dst[key] = src[key];
    }

    return dst;
}

function identity() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYm9vdHN0cmFwLmpzIiwic3JjL2J1aWxkZXIvZXhwcmVzc2lvbi1idWlsZGVyLmpzIiwic3JjL2J1aWxkZXIvZ3JvdXAtc2NoZW1hLmpzIiwic3JjL2J1aWxkZXIvbGluZS5qcyIsInNyYy9idWlsZGVyL25vZGUtc2NoZW1hLmpzIiwic3JjL2J1aWxkZXIvbm9kZS5qcyIsInNyYy9tb2RlbC9lYi1jbGFzcy5qcyIsInNyYy9tb2RlbC9lYi1leHByZXNzaW9uLmpzIiwic3JjL21vZGVsL2ViLW5vZGUuanMiLCJzcmMvbW9kZWwvZW1wdHkuanMiLCJzcmMvbW9kZWwvZXhwcmVzc2lvbi1ncm91cC5qcyIsInNyYy9zZXJ2aWNlcy9kZXNlcmlhbGl6YXRpb24uanMiLCJzcmMvc2VydmljZXMvZXZhbHVhdGVGYWN0b3J5LmpzIiwic3JjL3NlcnZpY2VzL3BhdGNoLmpzIiwic3JjL3NlcnZpY2VzL3NlcmlhbGl6YXRpb24uanMiLCJzcmMvc2VydmljZXMvdHJhdmVyc2UuanMiLCJzcmMvc2VydmljZXMvdXRpbHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIihmdW5jdGlvbiAoYW5ndWxhciwgdW5kZWZpbmVkKSB7XHJcblxyXG4gICB2YXIgbW9kdWxlID0gYW5ndWxhci5tb2R1bGUoJ2V4cHJlc3Npb24tYnVpbGRlcicsIFtdKTtcclxuXHJcbiAgIHJlcXVpcmUoJy4vYnVpbGRlci9leHByZXNzaW9uLWJ1aWxkZXInKShhbmd1bGFyKTtcclxuICAgcmVxdWlyZSgnLi9tb2RlbC9lYi1leHByZXNzaW9uJykoYW5ndWxhcik7XHJcbiAgIHJlcXVpcmUoJy4vbW9kZWwvZWItbm9kZScpKGFuZ3VsYXIpO1xyXG4gICByZXF1aXJlKCcuL21vZGVsL2ViLWNsYXNzJykoYW5ndWxhcik7XHJcblxyXG4gICB2YXIgU2VyaWFsaXphdGlvblNlcnZpY2UgPSByZXF1aXJlKCcuL3NlcnZpY2VzL3NlcmlhbGl6YXRpb24nKSxcclxuICAgICAgIERlc2VyaWFsaXphdGlvblNlcnZpY2UgPSByZXF1aXJlKCcuL3NlcnZpY2VzL2Rlc2VyaWFsaXphdGlvbicpLFxyXG4gICAgICAgVHJhdmVyc2VTZXJ2aWNlID0gcmVxdWlyZSgnLi9zZXJ2aWNlcy90cmF2ZXJzZScpO1xyXG5cclxuICAgbW9kdWxlXHJcbiAgICAgICAuZmFjdG9yeSgnZXhwcmVzc2lvbkJ1aWxkZXJTZXJpYWxpemVyJywgW2Z1bmN0aW9uICgpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgc2VyaWFsaXplOiBmdW5jdGlvbiAobm9kZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IFNlcmlhbGl6YXRpb25TZXJ2aWNlKG5vZGUpLnNlcmlhbGl6ZSgpO1xyXG4gICAgICAgICB9LFxyXG4gICAgICAgICBkZXNlcmlhbGl6ZTogZnVuY3Rpb24gKHNjaGVtYSwgZGF0YSkge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IERlc2VyaWFsaXphdGlvblNlcnZpY2Uoc2NoZW1hKS5kZXNlcmlhbGl6ZShkYXRhKTtcclxuICAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgIH1dKVxyXG4gICAgICAgLnNlcnZpY2UoJ2V4cHJlc3Npb25CdWlsZGVyVHJhdmVyc2UnLCBbVHJhdmVyc2VTZXJ2aWNlXSk7XHJcblxyXG59KShhbmd1bGFyKTsiLCJ2YXIgbm9kZVNjaGVtYUZhY3RvcnlUID0gcmVxdWlyZSgnLi9ub2RlLXNjaGVtYScpLFxyXG5cdCBncm91cFNjaGVtYUZhY3RvcnlUID0gcmVxdWlyZSgnLi9ncm91cC1zY2hlbWEnKSxcclxuXHQgcGF0Y2ggPSByZXF1aXJlKCcuLi9zZXJ2aWNlcy9wYXRjaCcpLFxyXG5cdCB1dGlsaXR5ID0gcmVxdWlyZSgnLi4vc2VydmljZXMvdXRpbHMnKSxcclxuXHQgRXhwcmVzc2lvbkdyb3VwID0gcmVxdWlyZSgnLi4vbW9kZWwvZXhwcmVzc2lvbi1ncm91cCcpLFxyXG5cdCBFbXB0eUV4cHJlc3Npb24gPSByZXF1aXJlKCcuLi9tb2RlbC9lbXB0eScpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoYW5ndWxhcikge1xyXG5cdGFuZ3VsYXIubW9kdWxlKCdleHByZXNzaW9uLWJ1aWxkZXInKS5mYWN0b3J5KCdFeHByZXNzaW9uQnVpbGRlcicsIEZhY3RvcnkpO1xyXG5cdEZhY3RvcnkuJGluamVjdCA9IFtdO1xyXG5cclxuXHRmdW5jdGlvbiBGYWN0b3J5KCkge1xyXG5cdFx0ZnVuY3Rpb24gRXhwcmVzc2lvbkJ1aWxkZXIoZXhwcmVzc2lvbnMsIGdsb2JhbFNldHRpbmdzKSB7XHJcblx0XHRcdHZhciBHcm91cFNjaGVtYSA9IGdyb3VwU2NoZW1hRmFjdG9yeVQoKTtcclxuXHRcdFx0dmFyIE5vZGVTY2hlbWEgPSBub2RlU2NoZW1hRmFjdG9yeVQoR3JvdXBTY2hlbWEpO1xyXG5cclxuXHRcdFx0ZXhwcmVzc2lvbnMuY29uY2F0KFtFbXB0eUV4cHJlc3Npb25dKS5mb3JFYWNoKGZ1bmN0aW9uIChzZXR0aW5ncykge1xyXG5cdFx0XHRcdHZhciBmYWN0b3J5ID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdFx0dmFyIGlkID0gdXRpbGl0eS5pZGVudGl0eSgpLCBwYXJhbWV0ZXJzID0ge307XHJcblx0XHRcdFx0XHRpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcclxuXHRcdFx0XHRcdFx0aWQgPSBhcmd1bWVudHNbMF07XHJcblx0XHRcdFx0XHRcdHBhcmFtZXRlcnMgPSBhcmd1bWVudHNbMV07XHJcblx0XHRcdFx0XHR9IGVsc2UgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT0gMSkge1xyXG5cdFx0XHRcdFx0XHRwYXJhbWV0ZXJzID0gYXJndW1lbnRzWzBdO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHJcblx0XHRcdFx0XHR2YXIgYnVpbGQgPSBmdW5jdGlvbiAobm9kZSwgbGluZSkge1xyXG5cdFx0XHRcdFx0XHR2YXIgZXhwcmVzc2lvbiA9IHV0aWxpdHkuZGVmYXVsdHMocGFyYW1ldGVycywgc2V0dGluZ3MuZGVmYXVsdHMsIGdsb2JhbFNldHRpbmdzLmRlZmF1bHRzKTtcclxuXHRcdFx0XHRcdFx0ZXhwcmVzc2lvbi5pZCA9IGlkO1xyXG5cdFx0XHRcdFx0XHRleHByZXNzaW9uLnR5cGUgPSBzZXR0aW5ncy50eXBlO1xyXG5cclxuXHRcdFx0XHRcdFx0dmFyIGdyb3VwID0gbmV3IEV4cHJlc3Npb25Hcm91cCgpO1xyXG5cdFx0XHRcdFx0XHRncm91cC5pZCA9IGlkO1xyXG5cdFx0XHRcdFx0XHRncm91cC5leHByZXNzaW9ucy5wdXNoKGV4cHJlc3Npb24pO1xyXG5cdFx0XHRcdFx0XHRleHByZXNzaW9uLnRlbXBsYXRlID0gc2V0dGluZ3MudGVtcGxhdGVVcmw7XHJcblx0XHRcdFx0XHRcdGxpbmUuYWRkKGdyb3VwKTtcclxuXHJcblx0XHRcdFx0XHRcdHBhdGNoLm1ldGhvZHNPZihleHByZXNzaW9uKS53aXRoKG5vZGUsIGxpbmUpO1xyXG5cclxuXHRcdFx0XHRcdFx0dmFyIGtleXMgPSBPYmplY3Qua2V5cyhleHByZXNzaW9uKTtcclxuXHJcblx0XHRcdFx0XHRcdGtleXMuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XHJcblx0XHRcdFx0XHRcdFx0dmFyIHNvdXJjZUZ1bmN0aW9uID0gZXhwcmVzc2lvbltrZXldO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRpZiAodXRpbGl0eS5pc0Z1bmN0aW9uKHNvdXJjZUZ1bmN0aW9uKSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0ZXhwcmVzc2lvbltrZXldID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR2YXIgYXJnTGlzdCA9IHV0aWxpdHkuYXNBcnJheShhcmd1bWVudHMpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR2YXIgcmVzdWx0ID0gc291cmNlRnVuY3Rpb24uYXBwbHkoZXhwcmVzc2lvbiwgYXJnTGlzdCk7XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0XHQvLyBUT0RPIGFkZCBkZWNvcmF0b3IgZm9yIG11dHRhYmxlIG1ldGhvZHMgaW5zdGVhZCBvZiB0cmlnZ2VyXHJcblx0XHRcdFx0XHRcdFx0XHRcdGlmICghbGluZS5pbW11dGFibGUpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRleHByZXNzaW9uLm1ldGhvZCA9IGV4cHJlc3Npb24ubWV0aG9kIHx8IFtdO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGlmIChleHByZXNzaW9uLm1ldGhvZC5pbmRleE9mKGtleSkgPCAwKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRleHByZXNzaW9uLm1ldGhvZC5wdXNoKGtleSk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRsaW5lLmltbXV0YWJsZSA9IHRydWU7XHJcblx0XHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHJlc3VsdDtcclxuXHRcdFx0XHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0XHRcdHJldHVybiBub2RlO1xyXG5cdFx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0XHR0aGlzLnBsYW4ucHVzaChidWlsZCk7XHJcblx0XHRcdFx0XHR0aGlzLnBsYW5NYXBbaWRdID0gYnVpbGQ7XHJcblxyXG5cdFx0XHRcdFx0cmV0dXJuIHRoaXM7XHJcblx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0dmFyIGdyb3VwRmFjdG9yeSA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRcdHZhciBpZCA9IHV0aWxpdHkuaWRlbnRpdHkoKSwgcGFyYW1ldGVycyA9IHt9O1xyXG5cdFx0XHRcdFx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XHJcblx0XHRcdFx0XHRcdGlkID0gYXJndW1lbnRzWzBdO1xyXG5cdFx0XHRcdFx0XHRwYXJhbWV0ZXJzID0gYXJndW1lbnRzWzFdO1xyXG5cdFx0XHRcdFx0fSBlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoID09IDEpIHtcclxuXHRcdFx0XHRcdFx0cGFyYW1ldGVycyA9IGFyZ3VtZW50c1swXTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHR2YXIgYnVpbGQgPSBmdW5jdGlvbiAobm9kZSwgbGluZSwgZXhwcmVzc2lvbkdyb3VwKSB7XHJcblx0XHRcdFx0XHRcdHZhciBleHByZXNzaW9uID0gdXRpbGl0eS5kZWZhdWx0cyhwYXJhbWV0ZXJzLCBzZXR0aW5ncy5kZWZhdWx0cywgZ2xvYmFsU2V0dGluZ3MuZGVmYXVsdHMpO1xyXG5cdFx0XHRcdFx0XHRleHByZXNzaW9uLmlkID0gaWQ7XHJcblx0XHRcdFx0XHRcdGV4cHJlc3Npb24udHlwZSA9IHNldHRpbmdzLnR5cGU7XHJcblx0XHRcdFx0XHRcdGV4cHJlc3Npb24udGVtcGxhdGUgPSBzZXR0aW5ncy50ZW1wbGF0ZVVybDtcclxuXHRcdFx0XHRcdFx0ZXhwcmVzc2lvbkdyb3VwLmV4cHJlc3Npb25zLnB1c2goZXhwcmVzc2lvbik7XHJcblxyXG5cdFx0XHRcdFx0XHRwYXRjaC5tZXRob2RzT2YoZXhwcmVzc2lvbikud2l0aChub2RlLCBsaW5lKTtcclxuXHJcblx0XHRcdFx0XHRcdHJldHVybiBub2RlO1xyXG5cdFx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0XHR0aGlzLnBsYW4ucHVzaChidWlsZCk7XHJcblxyXG5cdFx0XHRcdFx0cmV0dXJuIHRoaXM7XHJcblx0XHRcdFx0fTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHROb2RlU2NoZW1hLnByb3RvdHlwZVtzZXR0aW5ncy50eXBlXSA9IGZhY3Rvcnk7XHJcblx0XHRcdFx0R3JvdXBTY2hlbWEucHJvdG90eXBlW3NldHRpbmdzLnR5cGVdID0gZ3JvdXBGYWN0b3J5O1x0XHRcdFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdHJldHVybiBuZXcgTm9kZVNjaGVtYSgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBFeHByZXNzaW9uQnVpbGRlcjtcclxuXHR9XHJcbn07IiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgIGZ1bmN0aW9uIEdyb3VwU2NoZW1hKG5vZGUsIGxpbmUpIHtcclxuICAgICAgdGhpcy5wbGFuID0gW107XHJcbiAgICAgIHRoaXMubGluZSA9IGxpbmU7XHJcbiAgICAgIHRoaXMubm9kZSA9IG5vZGU7XHJcbiAgIH1cclxuXHJcbiAgIEdyb3VwU2NoZW1hLnByb3RvdHlwZS5hcHBseSA9IGZ1bmN0aW9uIChleHByZXNzaW9uR3JvdXApIHtcclxuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICB0aGlzLnBsYW4uZm9yRWFjaChmdW5jdGlvbiAocCkge1xyXG4gICAgICAgICBwKHNlbGYubm9kZSwgc2VsZi5saW5lLCBleHByZXNzaW9uR3JvdXApO1xyXG4gICAgICB9KTtcclxuICAgfTtcclxuXHJcbiAgIHJldHVybiBHcm91cFNjaGVtYTtcclxufTtcclxuIiwibW9kdWxlLmV4cG9ydHMgPSBMaW5lO1xyXG5cclxudmFyIEV4cHJlc3Npb25Hcm91cCA9IHJlcXVpcmUoJy4uL21vZGVsL2V4cHJlc3Npb24tZ3JvdXAnKSxcclxuXHR1dGlsaXR5ID0gcmVxdWlyZSgnLi4vc2VydmljZXMvdXRpbHMnKSxcclxuXHRFbXB0eSA9IHJlcXVpcmUoJy4uL21vZGVsL2VtcHR5Jyk7XHJcblxyXG5mdW5jdGlvbiBMaW5lKEdyb3VwU2NoZW1hKSB7XHJcblx0dGhpcy5leHByZXNzaW9ucyA9IFtdO1xyXG5cclxuXHQvLyBUT0RPIGFkZCBkZWNvcmF0b3IgZm9yIG11dHRhYmxlIG1ldGhvZHMgaW5zdGVhZCBvZiB0cmlnZ2VyXHJcblx0dGhpcy5pbW11dGFibGUgPSB0cnVlO1xyXG5cclxuXHR2YXIgZ2V0SW5kZXggPSAoZnVuY3Rpb24gKGlkKSB7XHJcblx0XHR2YXIgaW5kZXggPSB1dGlsaXR5LmluZGV4T2YodGhpcy5leHByZXNzaW9ucywgZnVuY3Rpb24gKGl0ZW0pIHtcclxuXHRcdFx0cmV0dXJuIGl0ZW0uaWQgPT09IGlkO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aWYgKGluZGV4IDwgMCkge1xyXG5cdFx0XHR0aHJvdyBFcnJvcignRXhwcmVzc2lvbiAnICsgaWQgKyAnIG5vdCBmb3VuZCcpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBpbmRleDtcclxuXHR9KS5iaW5kKHRoaXMpO1xyXG5cclxuXHR2YXIgZmluZEJ5SWQgPSBmdW5jdGlvbiAoZXhwcmVzc2lvbnMsIGlkLCBwYXJlbnQpIHtcclxuXHRcdGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBleHByZXNzaW9ucy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xyXG5cdFx0XHRpZiAoZXhwcmVzc2lvbnNbaV0uaWQgPT0gaWQpIHtcclxuXHRcdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0aW5kZXg6IGksXHJcblx0XHRcdFx0XHRleHByZXNzaW9uOiBleHByZXNzaW9uc1tpXSxcclxuXHRcdFx0XHRcdHBhcmVudDogcGFyZW50XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChleHByZXNzaW9uc1tpXSBpbnN0YW5jZW9mIEV4cHJlc3Npb25Hcm91cCkge1xyXG5cdFx0XHRcdHZhciBjaGlsZCA9IGZpbmRCeUlkKGV4cHJlc3Npb25zW2ldLmV4cHJlc3Npb25zLCBpZCwgZXhwcmVzc2lvbnNbaV0pO1xyXG5cdFx0XHRcdGlmIChjaGlsZCkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIGNoaWxkO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdHRoaXMuYWRkID0gZnVuY3Rpb24gKGV4cHJlc3Npb24pIHtcclxuXHRcdHRoaXMuZXhwcmVzc2lvbnMucHVzaChleHByZXNzaW9uKTtcclxuXHR9O1xyXG5cclxuXHR0aGlzLmNsb25lID0gZnVuY3Rpb24gKGlkKSB7XHJcblx0XHRyZXR1cm4gYW5ndWxhci5jb3B5KHRoaXMuZ2V0KGlkKSk7XHJcblx0fTtcclxuXHJcblx0dGhpcy5nZXQgPSBmdW5jdGlvbiAoaWQpIHtcclxuXHRcdHZhciBleHByZXNzaW9uID0gZmluZEJ5SWQodGhpcy5leHByZXNzaW9ucywgaWQpO1xyXG5cclxuXHRcdGlmICghZXhwcmVzc2lvbikge1xyXG5cdFx0XHR0aHJvdyBFcnJvcignRXhwcmVzc2lvbiAnICsgaWQgKyAnIG5vdCBmb3VuZCcpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBleHByZXNzaW9uLmV4cHJlc3Npb247XHJcblx0fTtcclxuXHJcblx0dGhpcy5wdXQgPSBmdW5jdGlvbiAoaWQsIG5vZGUsIGJ1aWxkKSB7XHJcblx0XHR2YXIgaW5kZXggPSBnZXRJbmRleChpZCksXHJcblx0XHRcdHNjaGVtYSA9IG5ldyBHcm91cFNjaGVtYShub2RlLCB0aGlzKSxcclxuXHRcdFx0Z3JvdXAgPSBuZXcgRXhwcmVzc2lvbkdyb3VwKCk7XHJcblxyXG5cdFx0dmFyIGl0ZW0gPSBmaW5kQnlJZCh0aGlzLmV4cHJlc3Npb25zLCBpZCk7XHJcblx0XHR2YXIgZXhwcmVzc2lvbnMgPSBpdGVtLnBhcmVudCA/IHBhcmVudC5leHByZXNzaW9ucyA6IHRoaXMuZXhwcmVzc2lvbnM7XHJcblx0XHRpZiAoaXRlbS5leHByZXNzaW9uIGluc3RhbmNlb2YgRXhwcmVzc2lvbkdyb3VwKSB7XHJcblx0XHRcdGJ1aWxkKHNjaGVtYSk7XHJcblx0XHRcdHNjaGVtYS5hcHBseShncm91cCk7XHJcblx0XHRcdGdyb3VwLmlkID0gaWQ7XHJcblx0XHRcdHRoaXMuZXhwcmVzc2lvbnMuc3BsaWNlKGluZGV4LCAxLCBncm91cClcclxuXHRcdFx0dGhpcy5pbW11dGFibGUgPSBmYWxzZTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRocm93IG5ldyBFcnJvcignVW5zdXBwb3J0ZWQgb3BlcmF0aW9uOiBwdXQgdG8gZXhwcmVzc2lvbiwgdGhhdCBpcyBub3QgYSBncm91cCcpO1xyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdHRoaXMucmVtb3ZlID0gZnVuY3Rpb24gKGlkKSB7XHJcblx0XHR2YXIgaXRlbSA9IGZpbmRCeUlkKHRoaXMuZXhwcmVzc2lvbnMsIGlkKTtcclxuXHRcdHZhciBleHByZXNzaW9ucyA9IGl0ZW0ucGFyZW50ID8gcGFyZW50LmV4cHJlc3Npb25zIDogdGhpcy5leHByZXNzaW9ucztcclxuXHRcdGlmIChpdGVtLmV4cHJlc3Npb24gaW5zdGFuY2VvZiBFeHByZXNzaW9uR3JvdXApIHtcclxuXHRcdFx0aXRlbS5leHByZXNzaW9uLmV4cHJlc3Npb25zID0gW107XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ1Vuc3VwcG9ydGVkIG9wZXJhdGlvbjogcmVtb3ZlIGV4cHJlc3Npb24sIHRoYXQgaXMgbm90IGEgZ3JvdXAnKTtcclxuXHRcdH1cclxuXHR9O1xyXG59IiwidmFyIE5vZGUgPSByZXF1aXJlKCcuL25vZGUnKSxcclxuICAgIExpbmUgPSByZXF1aXJlKCcuL2xpbmUnKSxcclxuICAgIEV4cHJlc3Npb25Hcm91cCA9IHJlcXVpcmUoJy4uL21vZGVsL2V4cHJlc3Npb24tZ3JvdXAnKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKEdyb3VwU2NoZW1hLCB1bmRlZmluZWQpIHtcclxuICAgIGZ1bmN0aW9uIE5vZGVTY2hlbWEobWFwKSB7XHJcbiAgICAgICAgdGhpcy5wbGFuID0gW107XHJcbiAgICAgICAgdGhpcy5wbGFuTWFwID0ge307XHJcbiAgICAgICAgdGhpcy5zY2hlbWFNYXAgPSBtYXAgfHwge307XHJcbiAgICAgICAgdGhpcy5Hcm91cFNjaGVtYSA9IEdyb3VwU2NoZW1hO1xyXG4gICAgfVxyXG5cclxuICAgIE5vZGVTY2hlbWEucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBzY2hlbWEgPSBuZXcgTm9kZVNjaGVtYSh0aGlzLm1hcCk7XHJcbiAgICAgICAgc2NoZW1hLnBsYW4gPSB0aGlzLnBsYW47XHJcbiAgICAgICAgc2NoZW1hLnBsYW5NYXAgPSB0aGlzLnBsYW5NYXA7XHJcbiAgICAgICAgcmV0dXJuIHNjaGVtYTtcclxuXHJcbiAgICB9O1xyXG5cclxuICAgIE5vZGVTY2hlbWEucHJvdG90eXBlLmF0dHIgPSBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xyXG4gICAgICAgIHZhciBhZGRBdHRyaWJ1dGUgPSBmdW5jdGlvbiAobm9kZSwgbGluZSkge1xyXG4gICAgICAgICAgICBub2RlLmF0dHIoa2V5LCB2YWx1ZSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5wbGFuLnB1c2goYWRkQXR0cmlidXRlKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9O1xyXG5cclxuICAgIE5vZGVTY2hlbWEucHJvdG90eXBlLmFwcGx5ID0gZnVuY3Rpb24gKG5vZGUpIHtcclxuICAgICAgICBub2RlID0gbm9kZSB8fCBuZXcgTm9kZSgnI3Jvb3QnLCB0aGlzKTtcclxuXHJcbiAgICAgICAgdmFyIGxpbmUgPSBuZXcgTGluZShHcm91cFNjaGVtYSk7XHJcbiAgICAgICAgbm9kZS5saW5lID0gbGluZTtcclxuXHJcbiAgICAgICAgdGhpcy5wbGFuLmZvckVhY2goZnVuY3Rpb24gKHApIHtcclxuICAgICAgICAgICAgcChub2RlLCBsaW5lKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIG5vZGU7XHJcbiAgICB9O1xyXG5cclxuICAgIE5vZGVTY2hlbWEucHJvdG90eXBlLm5vZGUgPSBmdW5jdGlvbiAoaWQsIGJ1aWxkKSB7XHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICAgICAgICBpZiAoIWJ1aWxkKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQnVpbGQgZnVuY3Rpb24gaXMgbm90IGRlZmluZWQnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBidWlsZE5vZGUgPSBmdW5jdGlvbiAobm9kZSwgbGluZSkge1xyXG4gICAgICAgICAgICB2YXIgc2NoZW1hID0gbmV3IE5vZGVTY2hlbWEoc2VsZi5zY2hlbWFNYXApO1xyXG4gICAgICAgICAgICBidWlsZChzY2hlbWEpO1xyXG5cclxuICAgICAgICAgICAgdmFyIG5ld05vZGUgPSBuZXcgTm9kZShpZCwgc2NoZW1hLCBub2RlKTtcclxuICAgICAgICAgICAgc2NoZW1hLmFwcGx5KG5ld05vZGUpO1xyXG4gICAgICAgICAgICBub2RlLmFkZENoaWxkQWZ0ZXIobmV3Tm9kZSk7XHJcbiAgICAgICAgICAgIHNlbGYuc2NoZW1hTWFwW2lkXSA9IHNjaGVtYTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBub2RlO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoaXMucGxhbi5wdXNoKGJ1aWxkTm9kZSk7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfTtcclxuXHJcbiAgICBOb2RlU2NoZW1hLnByb3RvdHlwZS5ncm91cCA9IGZ1bmN0aW9uIChpZCwgYnVpbGQpIHtcclxuICAgICAgICBpZiAoIWJ1aWxkKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQnVpbGQgZnVuY3Rpb24gaXMgbm90IGRlZmluZWQnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBidWlsZEdyb3VwID0gZnVuY3Rpb24gKG5vZGUsIGxpbmUpIHtcclxuICAgICAgICAgICAgdmFyIGV4cHJlc3Npb25Hcm91cCA9IG5ldyBFeHByZXNzaW9uR3JvdXAoKTtcclxuICAgICAgICAgICAgZXhwcmVzc2lvbkdyb3VwLmlkID0gaWQ7XHJcblxyXG4gICAgICAgICAgICB2YXIgc2NoZW1hID0gbmV3IEdyb3VwU2NoZW1hKG5vZGUsIGxpbmUpO1xyXG4gICAgICAgICAgICBidWlsZChzY2hlbWEpO1xyXG4gICAgICAgICAgICBzY2hlbWEuYXBwbHkoZXhwcmVzc2lvbkdyb3VwKTtcclxuICAgICAgICAgICAgbGluZS5hZGQoZXhwcmVzc2lvbkdyb3VwKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBub2RlO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHRoaXMucGxhbi5wdXNoKGJ1aWxkR3JvdXApO1xyXG4gICAgICAgIHRoaXMucGxhbk1hcFtpZF0gPSBidWlsZEdyb3VwO1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIE5vZGVTY2hlbWE7XHJcbn07IiwidmFyIHV0aWxpdHkgPSByZXF1aXJlKCcuLi9zZXJ2aWNlcy91dGlscycpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBOb2RlO1xyXG5cclxuZnVuY3Rpb24gTm9kZShpZCwgc2NoZW1hLCBwYXJlbnQpIHtcclxuICAgIHRoaXMuaWQgPSBpZDtcclxuICAgIHRoaXMuYXR0cmlidXRlcyA9IHt9O1xyXG4gICAgdGhpcy5zY2hlbWEgPSBzY2hlbWE7XHJcbiAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcclxuICAgIHRoaXMuY2hpbGRyZW4gPSBbXTtcclxuICAgIHRoaXMubGV2ZWwgPSBwYXJlbnQgPyBwYXJlbnQubGV2ZWwgKyAxIDogMDtcclxufVxyXG5cclxuTm9kZS5wcm90b3R5cGUuYXR0ciA9IGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XHJcbiAgICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIHRoaXMuYXR0cmlidXRlc1trZXldID0gdmFsdWU7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmF0dHJpYnV0ZXNba2V5XTtcclxuICAgIH1cclxufTtcclxuXHJcbk5vZGUucHJvdG90eXBlLmNsYXNzZXMgPSBmdW5jdGlvbiAoKSB7IFxyXG59O1xyXG5cclxuTm9kZS5wcm90b3R5cGUuYWRkQ2hpbGRBZnRlciA9IGZ1bmN0aW9uIChjaGlsZCwgYWZ0ZXIpIHtcclxuICAgIHZhciBpbmRleCA9IGFmdGVyXHJcbiAgICAgICAgPyB0aGlzLmNoaWxkcmVuLmluZGV4T2YoYWZ0ZXIpXHJcbiAgICAgICAgOiB0aGlzLmNoaWxkcmVuLmxlbmd0aCAtIDE7XHJcblxyXG4gICAgdGhpcy5jaGlsZHJlbi5zcGxpY2UoaW5kZXggKyAxLCAwLCBjaGlsZCk7XHJcbiAgICBjaGlsZC5wYXJlbnQgPSB0aGlzO1xyXG4gICAgY2hpbGQubGV2ZWwgPSB0aGlzLmxldmVsICsgMTtcclxufTtcclxuXHJcbk5vZGUucHJvdG90eXBlLmFkZENoaWxkQmVmb3JlID0gZnVuY3Rpb24gKGNoaWxkLCBiZWZvcmUpIHtcclxuICAgIHZhciBpbmRleCA9IGJlZm9yZVxyXG4gICAgICAgID8gdGhpcy5jaGlsZHJlbi5pbmRleE9mKGJlZm9yZSlcclxuICAgICAgICA6IDA7XHJcblxyXG4gICAgdGhpcy5jaGlsZHJlbi5zcGxpY2UoaW5kZXgsIDAsIGNoaWxkKTtcclxuICAgIGNoaWxkLnBhcmVudCA9IHRoaXM7XHJcbiAgICBjaGlsZC5sZXZlbCA9IHRoaXMubGV2ZWwgKyAxO1xyXG59O1xyXG5cclxuTm9kZS5wcm90b3R5cGUuYWRkQWZ0ZXIgPSBmdW5jdGlvbiAoY2hpbGQpIHtcclxuICAgIGlmICghdGhpcy5wYXJlbnQpIHtcclxuICAgICAgICB0aHJvdyBFcnJvcignQ2FuXFwndCBhZGQgYWZ0ZXIgcm9vdCcpO1xyXG4gICAgfVxyXG4gICAgdGhpcy5wYXJlbnQuYWRkQ2hpbGRBZnRlcihjaGlsZCwgdGhpcyk7XHJcbn07XHJcblxyXG5Ob2RlLnByb3RvdHlwZS5hZGRCZWZvcmUgPSBmdW5jdGlvbiAoY2hpbGQpIHtcclxuICAgIGlmICghdGhpcy5wYXJlbnQpIHtcclxuICAgICAgICB0aHJvdyBFcnJvcignQ2FuXFwndCBhZGQgYmVmb3JlIHJvb3QnKTtcclxuICAgIH1cclxuICAgIHRoaXMucGFyZW50LmFkZENoaWxkQmVmb3JlKGNoaWxkLCB0aGlzKTtcclxufTtcclxuXHJcbk5vZGUucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIG5vZGUgPSBuZXcgTm9kZSh0aGlzLmlkLCB0aGlzLnNjaGVtYSk7XHJcbiAgICByZXR1cm4gdGhpcy5zY2hlbWEuYXBwbHkobm9kZSk7XHJcbn07XHJcblxyXG5Ob2RlLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBpZiAoIXRoaXMucGFyZW50KSB7XHJcbiAgICAgICAgdGhyb3cgRXJyb3IoJ1Jvb3QgZWxlbWVudCBjYW5cXCd0IGJlIHJlbW92ZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgaW5kZXggPSB0aGlzLnBhcmVudC5jaGlsZHJlbi5pbmRleE9mKHRoaXMpO1xyXG4gICAgdGhpcy5wYXJlbnQuY2hpbGRyZW4uc3BsaWNlKGluZGV4LCAxKTtcclxufTtcclxuXHJcbk5vZGUucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uIChjaGlsZCkge1xyXG4gICAgICAgIGNoaWxkLnBhcmVudCA9IG51bGw7XHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLmNoaWxkcmVuID0gW107XHJcbn07XHJcblxyXG5Ob2RlLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIChpZGVudCkge1xyXG4gICAgaWRlbnQgPSBpZGVudCB8fCAwO1xyXG4gICAgcmV0dXJuIEFycmF5KGlkZW50KS5qb2luKCctJykgKyB0aGlzLmV4cHJlc3Npb24uaWQgKyAnICcgKyB0aGlzLmxldmVsICsgJ1xcbicgK1xyXG4gICAgICAgIHRoaXMuY2hpbGRyZW5cclxuICAgICAgICAgICAgLm1hcChmdW5jdGlvbiAoY2hpbGQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBjaGlsZC50b1N0cmluZyhpZGVudCArIDEpO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAuam9pbignXFxuJyk7XHJcbn07XHJcblxyXG5Ob2RlLnByb3RvdHlwZS50b1RyYWNlU3RyaW5nID0gZnVuY3Rpb24gKGlkZW50KSB7XHJcbiAgICBpZiAobnVsbCAhPSB0aGlzLnBhcmVudCkge1xyXG4gICAgICAgIHZhciBwYXJlbnQgPSB0aGlzLnBhcmVudDtcclxuICAgICAgICB3aGlsZSAobnVsbCAhPT0gcGFyZW50LnBhcmVudCkge1xyXG4gICAgICAgICAgICBwYXJlbnQgPSBwYXJlbnQucGFyZW50XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gcGFyZW50LnRvU3RyaW5nKCk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRoaXMudG9TdHJpbmcoKTtcclxufTsiLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuLi9zZXJ2aWNlcy91dGlscycpLFxyXG4gICAgZXZhbHVhdGVGYWN0b3J5ID0gcmVxdWlyZSgnLi4vc2VydmljZXMvZXZhbHVhdGVGYWN0b3J5Jyk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChhbmd1bGFyKSB7XHJcbiAgICBhbmd1bGFyLm1vZHVsZSgnZXhwcmVzc2lvbi1idWlsZGVyJykuZGlyZWN0aXZlKCdlYkNsYXNzJywgRGlyZWN0aXZlKTtcclxuXHJcbiAgICBEaXJlY3RpdmUuJGluamVjdCA9IFsnJHBhcnNlJ107XHJcblxyXG4gICAgZnVuY3Rpb24gRGlyZWN0aXZlKCRwYXJzZSkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cikge1xyXG4gICAgICAgICAgICAgICAgdmFyIGdldHRlciA9ICRwYXJzZShhdHRyLmViQ2xhc3MpLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHRHZXR0ZXIgPSAkcGFyc2UoYXR0ci5lYkNsYXNzQ29udGV4dCksXHJcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NlcyA9ICcnO1xyXG5cclxuICAgICAgICAgICAgICAgIHNjb3BlLiR3YXRjaChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGV2YWx1YXRlRmFjdG9yeShjb250ZXh0R2V0dGVyKHNjb3BlKSwgW3Njb3BlLm5vZGVdKShnZXR0ZXIoc2NvcGUpKTtcclxuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvbGRDbGFzc2VzID0gY2xhc3NlcztcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG5ld0NsYXNzZXMgPSBmZXRjaENsYXNzZXModmFsdWUpLmpvaW4oJyAnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9sZENsYXNzZXMgIT09IG5ld0NsYXNzZXMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzZXMgPSBuZXdDbGFzc2VzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5yZW1vdmVDbGFzcyhvbGRDbGFzc2VzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYWRkQ2xhc3MoY2xhc3Nlcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5yZW1vdmVDbGFzcyhjbGFzc2VzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NlcyA9ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0sIHRydWUpO1xyXG5cclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGZldGNoQ2xhc3NlcyhvYmplY3QpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKG9iamVjdCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlbmd0aCA9IGtleXMubGVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGFzc2VzID0gW107XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGtleSA9IGtleXNbaV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvYmplY3Rba2V5XSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3Nlcy5wdXNoKGtleSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjbGFzc2VzO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59OyIsInZhciBldmFsdWF0ZUZhY3RvcnkgPSByZXF1aXJlKCcuLi9zZXJ2aWNlcy9ldmFsdWF0ZUZhY3RvcnknKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFuZ3VsYXIpIHtcclxuXHJcblx0YW5ndWxhci5tb2R1bGUoJ2V4cHJlc3Npb24tYnVpbGRlcicpLmRpcmVjdGl2ZSgnZWJFeHByZXNzaW9uJywgRGlyZWN0aXZlKTtcclxuXHJcblx0RGlyZWN0aXZlLiRpbmplY3QgPSBbJyR0ZW1wbGF0ZUNhY2hlJywgJyRjb21waWxlJ107XHJcblxyXG5cdGZ1bmN0aW9uIERpcmVjdGl2ZSgkdGVtcGxhdGVDYWNoZSwgJGNvbXBpbGUpIHtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHJlc3RyaWN0OiAnQScsXHJcblx0XHRcdHNjb3BlOiB7XHJcblx0XHRcdFx0ZXhwcmVzc2lvbjogJz1lYkV4cHJlc3Npb24nLFxyXG5cdFx0XHRcdG5vZGU6ICc9JyxcclxuXHRcdFx0XHRsaW5lOiAnPSdcclxuXHRcdFx0fSxcclxuXHRcdFx0bGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRyKSB7XHJcblx0XHRcdFx0dmFyICR3YXRjaCA9IHNjb3BlLmV4cHJlc3Npb24uJHdhdGNoID0gc2NvcGUuZXhwcmVzc2lvbi4kd2F0Y2ggfHwge307XHJcblx0XHRcdFx0dmFyIGV2YWx1YXRlID0gZXZhbHVhdGVGYWN0b3J5KHNjb3BlLmV4cHJlc3Npb24sIFtzY29wZS5ub2RlLCBzY29wZS5saW5lXSk7XHJcblxyXG5cdFx0XHRcdHZhciBrZXlzID0gT2JqZWN0LmtleXMoJHdhdGNoKSxcclxuXHRcdFx0XHRcdGxlbmd0aCA9IGtleXMubGVuZ3RoO1xyXG5cclxuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0XHR2YXIga2V5ID0ga2V5c1tpXSxcclxuXHRcdFx0XHRcdFx0d2F0Y2ggPSBzY29wZS5leHByZXNzaW9uLiR3YXRjaFtrZXldO1xyXG5cclxuXHRcdFx0XHRcdHdhdGNoRmFjdG9yeShzY29wZS5leHByZXNzaW9uLCBrZXksIHdhdGNoKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHZhciB0ZW1wbGF0ZSA9ICR0ZW1wbGF0ZUNhY2hlLmdldChzY29wZS5leHByZXNzaW9uLnRlbXBsYXRlKTtcclxuXHRcdFx0XHR2YXIgZXhwcmVzc2lvbiA9ICRjb21waWxlKHRlbXBsYXRlKShzY29wZSk7XHJcblx0XHRcdFx0ZWxlbWVudC5hcHBlbmQoZXhwcmVzc2lvbik7XHJcblxyXG5cdFx0XHRcdGZ1bmN0aW9uIHdhdGNoRmFjdG9yeSAoY29udGV4dCwga2V5LCBoYW5kbGVyKSB7XHJcblx0XHRcdFx0XHRzY29wZS4kd2F0Y2goZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gZXZhbHVhdGUoY29udGV4dFtrZXldKTtcclxuXHRcdFx0XHRcdH0sIGZ1bmN0aW9uIChuZXdWYWwsIG9sZFZhbCkge1xyXG5cdFx0XHRcdFx0XHRoYW5kbGVyLmFwcGx5KHNjb3BlLmV4cHJlc3Npb24sIFtuZXdWYWwsIG9sZFZhbCwgc2NvcGUubm9kZSwgc2NvcGUubGluZV0pO1xyXG5cdFx0XHRcdFx0fSwgdHJ1ZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG59OyIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFuZ3VsYXIpIHtcclxuICAgIGFuZ3VsYXIubW9kdWxlKCdleHByZXNzaW9uLWJ1aWxkZXInKS5kaXJlY3RpdmUoJ2ViTm9kZScsIERpcmVjdGl2ZSk7XHJcblxyXG4gICAgRGlyZWN0aXZlLiRpbmplY3QgPSBbXTtcclxuXHJcbiAgICBmdW5jdGlvbiBEaXJlY3RpdmUoKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgICAgICAgc2NvcGU6IHtcclxuICAgICAgICAgICAgICAgIG5vZGU6ICc9ZWJOb2RlJ1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2ViLW5vZGUuaHRtbCcsXHJcbiAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cikge1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59OyIsIm1vZHVsZS5leHBvcnRzID0gRW1wdHk7XHJcblxyXG5mdW5jdGlvbiBFbXB0eSgpIHtcclxuICAgIHRoaXMudHlwZSA9ICdlbXB0eSc7XHJcbiAgICB0aGlzLnRlbXBsYXRlID0gJyc7XHJcbn1cclxuIiwibW9kdWxlLmV4cG9ydHMgPSBHcm91cDtcclxuXHJcbmZ1bmN0aW9uIEdyb3VwKCkge1xyXG4gICAgdGhpcy50eXBlID0gJ2dyb3VwJztcclxuICAgIHRoaXMuZXhwcmVzc2lvbnMgPSBbXTtcclxuICAgIHRoaXMudGVtcGxhdGUgPSAnZWItZ3JvdXAuaHRtbCc7XHJcbn1cclxuIiwidmFyIHV0aWxpdHkgPSByZXF1aXJlKCcuL3V0aWxzJyksXHJcbiAgICBOb2RlID0gcmVxdWlyZSgnLi4vYnVpbGRlci9ub2RlJyk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IERlc2VyaWFsaXphdGlvblNlcnZpY2U7XHJcblxyXG5mdW5jdGlvbiB0cmF2ZXJzZShub2RlLCBtYXApIHtcclxuICAgIGlmICghbWFwLmhhc093blByb3BlcnR5KG5vZGUuaWQpKSB7XHJcbiAgICAgICAgbWFwW25vZGUuaWRdID0gbm9kZTtcclxuICAgIH1cclxuXHJcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gbm9kZS5jaGlsZHJlbi5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhciBjaGlsZCA9IG5vZGUuY2hpbGRyZW5bMF1cclxuICAgICAgICB0cmF2ZXJzZShjaGlsZCwgbWFwKTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gRGVzZXJpYWxpemF0aW9uU2VydmljZShzY2hlbWEpIHtcclxuICAgIGZ1bmN0aW9uIGRlc2VyaWFsaXplKGRhdGEsIHBhcmVudCwgbm9kZU1hcCkge1xyXG4gICAgICAgIG5vZGVNYXAgPSBub2RlTWFwIHx8IHt9O1xyXG5cclxuICAgICAgICBpZiAoIXBhcmVudCkge1xyXG4gICAgICAgICAgICB2YXIgbm9kZSA9IG5ldyBOb2RlKGRhdGEuaWQsIHNjaGVtYSk7XHJcbiAgICAgICAgICAgIHNjaGVtYS5hcHBseShub2RlKTtcclxuICAgICAgICAgICAgdHJhdmVyc2Uobm9kZSwgbm9kZU1hcCk7XHJcbiAgICAgICAgICAgIG5vZGUuY2xlYXIoKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB2YXIgbm9kZSA9IG5vZGVNYXBbZGF0YS5pZF07XHJcbiAgICAgICAgICAgIG5vZGUgPSBub2RlLmNsb25lKCk7XHJcbiAgICAgICAgICAgIHBhcmVudC5hZGRDaGlsZEFmdGVyKG5vZGUpO1xyXG4gICAgICAgICAgICB0cmF2ZXJzZShwYXJlbnQsIG5vZGVNYXApO1xyXG4gICAgICAgICAgICBub2RlLmNsZWFyKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB1dGlsaXR5Lm92ZXJyaWRlKG5vZGUuYXR0cmlidXRlcywgZGF0YS5hdHRyaWJ1dGVzKTtcclxuXHJcbiAgICAgICAgZGVzZXJpYWxpemVMaW5lKG5vZGUsIG5vZGUubGluZSwgZGF0YS5saW5lKTtcclxuXHJcbiAgICAgICAgdmFyIGNoaWxkcmVuID0gZGF0YS5jaGlsZHJlbixcclxuICAgICAgICAgICAgbGVuZ3RoID0gY2hpbGRyZW4ubGVuZ3RoO1xyXG5cclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2ldO1xyXG4gICAgICAgICAgICBuZXcgRGVzZXJpYWxpemF0aW9uU2VydmljZShzY2hlbWEuc2NoZW1hTWFwW2NoaWxkLmlkXSkuZGVzZXJpYWxpemUoY2hpbGQsIG5vZGUsIG5vZGVNYXApO1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBub2RlO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGRlc2VyaWFsaXplTGluZShub2RlLCBsaW5lLCBkYXRhTGluZSkge1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBkYXRhTGluZS5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICB2YXIgc2VyaWFsaXplZEdyb3VwID0gZGF0YUxpbmVbaV07XHJcblxyXG4gICAgICAgICAgICBkZXNlcmlhbGl6ZUdyb3VwKG5vZGUsIGxpbmUsIGxpbmUuZ2V0KHNlcmlhbGl6ZWRHcm91cC5pZCksIHNlcmlhbGl6ZWRHcm91cCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGRlc2VyaWFsaXplR3JvdXAobm9kZSwgbGluZSwgZ3JvdXAsIGRhdGFHcm91cCkge1xyXG4gICAgICAgIHZhciBzZXJpYWxpemVkRXhwcmVzc2lvbnMgPSBkYXRhR3JvdXAuZXhwcmVzc2lvbnMsXHJcbiAgICAgICAgICAgIGxlbmd0aCA9IHNlcmlhbGl6ZWRFeHByZXNzaW9ucy5sZW5ndGg7XHJcblxyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgdmFyIHNlcmlhbGl6ZWRFeHAgPSBzZXJpYWxpemVkRXhwcmVzc2lvbnNbaV07XHJcblxyXG4gICAgICAgICAgICB2YXIgaW5kZXggPSB1dGlsaXR5LmluZGV4T2YoZ3JvdXAuZXhwcmVzc2lvbnMsIGZ1bmN0aW9uIChleHByZXNzaW9uKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZXhwcmVzc2lvbi5pZCA9PT0gc2VyaWFsaXplZEV4cC5pZDtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB1dGlsaXR5Lm92ZXJyaWRlKGdyb3VwLmV4cHJlc3Npb25zW2luZGV4XSwgc2VyaWFsaXplZEV4cCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmIChzZXJpYWxpemVkRXhwcmVzc2lvbnNbaV0ubWV0aG9kKSB7XHJcbiAgICAgICAgICAgICAgICBzZXJpYWxpemVkRXhwcmVzc2lvbnNbaV0ubWV0aG9kLmZvckVhY2goZnVuY3Rpb24gKG0pIHtcclxuICAgICAgICAgICAgICAgICAgICBncm91cC5leHByZXNzaW9uc1tpbmRleF1bbV0obm9kZSwgbGluZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZ3JvdXAuZXhwcmVzc2lvbnNbaW5kZXhdLm1ldGhvZCA9IHNlcmlhbGl6ZWRFeHByZXNzaW9uc1tpXS5tZXRob2Q7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmRlc2VyaWFsaXplID0gZGVzZXJpYWxpemU7XHJcbn1cclxuIiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBldmFsdWF0ZUZhY3Rvcnk7XHJcblxyXG5mdW5jdGlvbiBldmFsdWF0ZUZhY3RvcnkodGhpc0NvbnRleHQsIHBhcmFtZXRlcnMpIHtcclxuXHRyZXR1cm4gdmlzaXQ7XHJcblxyXG5cdGZ1bmN0aW9uIHZpc2l0KG9iamVjdCkge1xyXG5cdFx0aWYodXRpbHMuaXNPYmplY3Qob2JqZWN0KSkge1xyXG5cdFx0XHRyZXR1cm4gdmlzaXRPYmplY3Qob2JqZWN0KTtcclxuXHRcdH0gZWxzZSBpZiAodXRpbHMuaXNBcnJheShvYmplY3QpKSB7XHJcblx0XHRcdHJldHVybiB2aXNpdEFycmF5KG9iamVjdCk7XHJcblx0XHR9IGVsc2UgaWYgKHV0aWxzLmlzRnVuY3Rpb24ob2JqZWN0KSkge1xyXG5cdFx0XHRyZXR1cm4gdmlzaXRGdW5jdGlvbihvYmplY3QpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBvYmplY3Q7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiB2aXNpdE9iamVjdChvYmplY3QpIHtcclxuXHRcdHZhciBrZXlzID0gT2JqZWN0LmtleXMob2JqZWN0KSxcclxuXHRcdFx0bGVuZ3RoID0ga2V5cy5sZW5ndGgsXHJcblx0XHRcdHJlc3VsdCA9IHt9O1xyXG5cclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0dmFyIGtleSA9IGtleXNbaV07XHJcblx0XHRcdHJlc3VsdFtrZXldID0gdmlzaXQob2JqZWN0W2tleV0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiByZXN1bHQ7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiB2aXNpdEFycmF5KGFycmF5KSB7XHJcblx0XHR2YXIgcmVzdWx0ID0gW107XHJcblx0XHRmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gYXJyYXkubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0cmVzdWx0W2ldID0gdmlzaXQoYXJyYXlbaV0pO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHJlc3VsdDtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHZpc2l0RnVuY3Rpb24oZGVsZWdhdGUpIHtcclxuXHRcdHJldHVybiBkZWxlZ2F0ZS5hcHBseSh0aGlzQ29udGV4dCwgcGFyYW1ldGVycyk7XHJcblx0fVxyXG59IiwidmFyIHV0aWxpdHkgPSByZXF1aXJlKCcuL3V0aWxzJyk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICAgIG1ldGhvZDogbWV0aG9kLFxyXG4gICAgbWV0aG9kc09mOiBtZXRob2RzT2ZcclxufTtcclxuXHJcbmZ1bmN0aW9uIG1ldGhvZChvYmplY3QsIGtleSkge1xyXG4gICAgdmFyIHNvdXJjZUZ1bmN0aW9uID0gb2JqZWN0W2tleV07XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICB3aXRoOiB3aXRoRmFjdG9yeShvYmplY3QsIGtleSwgc291cmNlRnVuY3Rpb24pXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG1ldGhvZHNPZihvYmopIHtcclxuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMob2JqKSxcclxuICAgICAgICBsZW5ndGggPSBrZXlzLmxlbmd0aCxcclxuICAgICAgICBwYXRjaCA9IHt9O1xyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YXIga2V5ID0ga2V5c1tpXTtcclxuXHJcbiAgICAgICAgaWYgKHV0aWxpdHkuaXNGdW5jdGlvbihvYmpba2V5XSkpIHtcclxuICAgICAgICAgICAgcGF0Y2hba2V5XSA9IG1ldGhvZChvYmosIGtleSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgd2l0aDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHBhdGNoKSxcclxuICAgICAgICAgICAgICAgIGxlbmd0aCA9IGtleXMubGVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgYXJncyA9IHV0aWxpdHkuYXNBcnJheShhcmd1bWVudHMpO1xyXG5cclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgdmFyIGtleSA9IGtleXNbaV07XHJcbiAgICAgICAgICAgICAgICBvYmouYWN0aW9uID0ga2V5O1xyXG4gICAgICAgICAgICAgICAgcGF0Y2hba2V5XS53aXRoLmFwcGx5KG9iaiwgYXJncyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHdpdGhGYWN0b3J5KG9iamVjdCwga2V5LCBzb3VyY2VGdW5jdGlvbikge1xyXG4gICAgdmFyIHdpdGhGdW5jdGlvbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgYXJncyA9IHV0aWxpdHkuYXNBcnJheShhcmd1bWVudHMpO1xyXG5cclxuICAgICAgICBvYmplY3Rba2V5XSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdmFyIGFyZ0xpc3QgPSB1dGlsaXR5LmFzQXJyYXkoYXJndW1lbnRzKTtcclxuICAgICAgICAgICAgcmV0dXJuIHNvdXJjZUZ1bmN0aW9uLmFwcGx5KG9iamVjdCwgYXJncy5jb25jYXQoYXJnTGlzdCkpO1xyXG4gICAgICAgIH07XHJcbiAgICB9O1xyXG5cclxuICAgIHdpdGhGdW5jdGlvbi5kZWNvcmF0b3IgPSBmdW5jdGlvbiAoZGVjb3JhdGUpIHtcclxuICAgICAgICB2YXIgYXJncyA9IHV0aWxpdHkuYXNBcnJheShhcmd1bWVudHMpLnNsaWNlKDEpO1xyXG5cclxuICAgICAgICBvYmplY3Rba2V5XSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGRlY29yYXRlLmFwcGx5KG9iamVjdCwgW3NvdXJjZUZ1bmN0aW9uLCBvYmplY3QsIGtleV0uY29uY2F0KGFyZ3MpKTtcclxuICAgICAgICB9O1xyXG4gICAgfTtcclxuXHJcbiAgICByZXR1cm4gd2l0aEZ1bmN0aW9uO1xyXG59XHJcbiIsInZhciB1dGlsaXR5ID0gcmVxdWlyZSgnLi91dGlscycpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTZXJpYWxpemF0aW9uU2VydmljZTtcclxuXHJcbmZ1bmN0aW9uIFNlcmlhbGl6YXRpb25TZXJ2aWNlKG5vZGUpIHtcclxuICAgIGZ1bmN0aW9uIHNlcmlhbGl6ZSgpIHtcclxuICAgICAgICB2YXIgZ3JvdXBzID0gbm9kZS5saW5lLmV4cHJlc3Npb25zLm1hcChzZXJpYWxpemVHcm91cCk7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGlkOiBub2RlLmlkLFxyXG4gICAgICAgICAgICBhdHRyaWJ1dGVzOiBzZXJpYWxpemVBdHRyaWJ1dGVzKG5vZGUpLFxyXG4gICAgICAgICAgICBjaGlsZHJlbjogbm9kZS5jaGlsZHJlbi5tYXAoZnVuY3Rpb24gKGNoaWxkKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFNlcmlhbGl6YXRpb25TZXJ2aWNlKGNoaWxkKS5zZXJpYWxpemUoKTtcclxuICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgIGxpbmU6IGdyb3Vwcy5maWx0ZXIoZnVuY3Rpb24gKGdyb3VwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZ3JvdXAuZXhwcmVzc2lvbnMubGVuZ3RoO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzZXJpYWxpemVBdHRyaWJ1dGVzKG5vZGUpIHtcclxuICAgIFx0dmFyIHNlcmlhbGl6ZSA9IG5vZGUuYXR0cignc2VyaWFsaXplJyk7XHJcblx0XHRpZiAoc2VyaWFsaXplICYmIHNlcmlhbGl6ZVsnQGF0dHInXSkge1xyXG5cdFx0XHR2YXIgYXR0cnMgPSBzZXJpYWxpemVbJ0BhdHRyJ107XHJcblx0XHRcdHJldHVybiBhdHRycy5yZWR1Y2UoZnVuY3Rpb24gKG1lbW8sIGF0dHIpIHtcclxuXHRcdFx0XHRtZW1vW2F0dHJdID0gbm9kZS5hdHRyKGF0dHIpO1xyXG5cdFx0XHRcdHJldHVybiBtZW1vO1xyXG5cdFx0XHR9LCB7fSlcclxuXHRcdH1cclxuXHRcdHJldHVybiB7fTtcclxuXHR9XHJcblxyXG4gICAgZnVuY3Rpb24gc2VyaWFsaXplR3JvdXAoZ3JvdXApIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBpZDogZ3JvdXAuaWQsXHJcbiAgICAgICAgICAgIGV4cHJlc3Npb25zOiBncm91cC5leHByZXNzaW9uc1xyXG4gICAgICAgICAgICAgICAgLmZpbHRlcihzZXJpYWxpemFibGUpXHJcbiAgICAgICAgICAgICAgICAubWFwKHNlcmlhbGl6ZUV4cHJlc3Npb24pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHNlcmlhbGl6YWJsZShleHByZXNzaW9uKSB7XHJcbiAgICAgICAgdmFyIHNlcmlhbGl6ZUF0dHIgPSBub2RlLmF0dHIoJ3NlcmlhbGl6ZScpO1xyXG4gICAgICAgIGlmICghc2VyaWFsaXplQXR0cikge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgcHJvcGVydGllc1RvU2VyaWFsaXplID0gc2VyaWFsaXplQXR0cltleHByZXNzaW9uLmlkXTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHByb3BlcnRpZXNUb1NlcmlhbGl6ZSAmJiBwcm9wZXJ0aWVzVG9TZXJpYWxpemUubGVuZ3RoO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHNlcmlhbGl6ZUV4cHJlc3Npb24oZXhwcmVzc2lvbikge1xyXG4gICAgICAgIHZhciBzZXJpYWxpemVBdHRyID0gbm9kZS5hdHRyKCdzZXJpYWxpemUnKTtcclxuXHJcbiAgICAgICAgdmFyIHJlc3VsdCA9IHt9LFxyXG4gICAgICAgICAgICBwcm9wZXJ0aWVzVG9TZXJpYWxpemUgPSBzZXJpYWxpemVBdHRyW2V4cHJlc3Npb24uaWRdO1xyXG5cclxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gcHJvcGVydGllc1RvU2VyaWFsaXplLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIHZhciBwcm9wID0gcHJvcGVydGllc1RvU2VyaWFsaXplW2ldO1xyXG4gICAgICAgICAgICByZXN1bHRbcHJvcF0gPSBleHByZXNzaW9uW3Byb3BdO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXN1bHQuaWQgPSBleHByZXNzaW9uLmlkO1xyXG4gICAgICAgIHJlc3VsdC50eXBlID0gZXhwcmVzc2lvbi50eXBlO1xyXG4gICAgICAgIHJlc3VsdC5tZXRob2QgPSBleHByZXNzaW9uLm1ldGhvZDtcclxuXHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnNlcmlhbGl6ZSA9IHNlcmlhbGl6ZTtcclxufVxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IFRyYXZlcnNlU2VydmljZTtcclxuXHJcbmZ1bmN0aW9uIFRyYXZlcnNlU2VydmljZSgpIHtcclxuICAgIGZ1bmN0aW9uIHZpc2l0TGluZShyZWR1Y2UsIG1lbW8sIG5vZGUsIGxpbmUpIHtcclxuICAgICAgICB2YXIgZ3JvdXBzID0gbGluZS5leHByZXNzaW9ucyxcclxuICAgICAgICAgICAgbGVuZ3RoID0gZ3JvdXBzLmxlbmd0aDtcclxuXHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBtZW1vID0gdmlzaXRHcm91cChyZWR1Y2UsIG1lbW8sIG5vZGUsIGxpbmUsIGdyb3Vwc1tpXSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbWVtbztcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB2aXNpdEdyb3VwKHJlZHVjZSwgbWVtbywgbm9kZSwgbGluZSwgZ3JvdXApIHtcclxuICAgICAgICB2YXIgZXhwcmVzc2lvbnMgPSBncm91cC5leHByZXNzaW9ucyxcclxuICAgICAgICAgICAgbGVuZ3RoID0gZXhwcmVzc2lvbnMubGVuZ3RoO1xyXG5cclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIG1lbW8gPSByZWR1Y2UobWVtbywgZXhwcmVzc2lvbnNbaV0sIGxpbmUsIG5vZGUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG1lbW87XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5kZXB0aCA9IGZ1bmN0aW9uIChyb290KSB7XHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHJlZHVjZSwgbWVtbykge1xyXG4gICAgICAgICAgICBtZW1vID0gdmlzaXRMaW5lKHJlZHVjZSwgbWVtbywgcm9vdCwgcm9vdC5saW5lKTtcclxuXHJcbiAgICAgICAgICAgIHZhciBjaGlsZHJlbiA9IHJvb3QuY2hpbGRyZW4sXHJcbiAgICAgICAgICAgICAgICBsZW5ndGggPSBjaGlsZHJlbi5sZW5ndGg7XHJcblxyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBtZW1vID0gc2VsZi5kZXB0aChjaGlsZHJlbltpXSkocmVkdWNlLCBtZW1vKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIG1lbW87XHJcbiAgICAgICAgfTtcclxuICAgIH07XHJcblxyXG59XHJcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xyXG4gICAgYXNBcnJheTogYXNBcnJheSxcclxuICAgIGNsb25lOiBjbG9uZSxcclxuICAgIGRlZmF1bHRzOiBkZWZhdWx0cyxcclxuICAgIGluZGV4T2Y6IGluZGV4T2YsXHJcbiAgICBpc0FycmF5OiBBcnJheS5pc0FycmF5LFxyXG4gICAgaXNGdW5jdGlvbjogaXNGdW5jdGlvbixcclxuICAgIGlzT2JqZWN0OiBpc09iamVjdCxcclxuICAgIG92ZXJyaWRlOiBvdmVycmlkZSxcclxuICAgIGlkZW50aXR5OiBpZGVudGl0eVxyXG59O1xyXG5cclxuZnVuY3Rpb24gaW5kZXhPZihhcnJheSwgcHJlZGljYXRlKSB7XHJcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gYXJyYXkubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBpZiAocHJlZGljYXRlKGFycmF5W2ldLCBpKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gaTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gLTE7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGFzQXJyYXkoYXJncykge1xyXG4gICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3MpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjbG9uZShvYmplY3QpIHtcclxuICAgIHZhciByZXN1bHQgPSB7fSxcclxuICAgICAgICBrZXlzID0gT2JqZWN0LmtleXMob2JqZWN0KTtcclxuICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBrZXlzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdmFyIGtleSA9IGtleXNbaV07XHJcbiAgICAgICAgcmVzdWx0W2tleV0gPSBvYmplY3Rba2V5XVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRlZmF1bHRzKGRzdCkge1xyXG4gICAgdmFyIHNvdXJjZXNMZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoO1xyXG4gICAgdmFyIGFyZ3MgPSBhc0FycmF5KGFyZ3VtZW50cyk7XHJcbiAgICB2YXIgcmVzdWx0ID0gY2xvbmUoZHN0KTtcclxuXHJcbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IHNvdXJjZXNMZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhciBzb3VyY2UgPSBhcmdzW2ldO1xyXG5cclxuICAgICAgICBpZiAoIXNvdXJjZSkge1xyXG4gICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoc291cmNlKTtcclxuXHJcbiAgICAgICAgZm9yICh2YXIgayA9IDAsIGtleXNMZW5ndGggPSBrZXlzLmxlbmd0aDsgayA8IGtleXNMZW5ndGg7IGsrKykge1xyXG4gICAgICAgICAgICB2YXIga2V5ID0ga2V5c1trXTtcclxuICAgICAgICAgICAgaWYgKCFyZXN1bHQuaGFzT3duUHJvcGVydHkoa2V5KSkge1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0W2tleV0gPSBzb3VyY2Vba2V5XTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG59XHJcblxyXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKHZhbHVlKSB7XHJcbiAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nO1xyXG59XHJcblxyXG5mdW5jdGlvbiBpc09iamVjdCh2YWx1ZSkge1xyXG4gICAgcmV0dXJuIHZhbHVlICE9PSBudWxsICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCc7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG92ZXJyaWRlKGRzdCwgc3JjKSB7XHJcbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHNyYyksXHJcbiAgICAgICAgbGVuZ3RoID0ga2V5cy5sZW5ndGg7XHJcblxyXG4gICAgZm9yKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdmFyIGtleSA9IGtleXNbaV07XHJcbiAgICAgICAgZHN0W2tleV0gPSBzcmNba2V5XTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZHN0O1xyXG59XHJcblxyXG5mdW5jdGlvbiBpZGVudGl0eSgpIHtcclxuICAgIGZ1bmN0aW9uIHM0KCkge1xyXG4gICAgICAgIHJldHVybiBNYXRoLmZsb29yKCgxICsgTWF0aC5yYW5kb20oKSkgKiAweDEwMDAwKVxyXG4gICAgICAgICAgICAudG9TdHJpbmcoMTYpXHJcbiAgICAgICAgICAgIC5zdWJzdHJpbmcoMSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gczQoKSArIHM0KCkgKyAnLScgKyBzNCgpICsgJy0nICsgczQoKSArICctJyArXHJcbiAgICAgICAgczQoKSArICctJyArIHM0KCkgKyBzNCgpICsgczQoKTtcclxufVxyXG4iXX0=

angular.module("expression-builder").run(["$templateCache", function($templateCache) {$templateCache.put("eb-group.html","<ul class=\"expression-builder-group\">\r\n    <li ng-repeat=\"exp in expression.expressions\"\r\n        eb-expression=\"exp\"\r\n        node=\"node\"\r\n        line=\"line\"\r\n        class=\"expression-builder-expression\">\r\n    </li>\r\n</ul>");
$templateCache.put("eb-node.html","<ul class=\"expression-builder-node\" eb-class=\"node.attr(\'class\')\">\r\n    <li class=\"expression-builder-line\">\r\n        <ul>\r\n            <li ng-repeat=\"expression in node.line.expressions\"\r\n                eb-expression=\"expression\"\r\n                node=\"node\"\r\n                line=\"node.line\"\r\n                class=\"expression-builder-expression\">\r\n            </li>\r\n        </ul>\r\n    </li>\r\n    \r\n\r\n    <li class=\"expression-builder-children\">\r\n        <ul>\r\n            <li ng-repeat=\"child in node.children\" eb-node=\"child\" class=\"expression-builder-child\"></li>\r\n        </ul>\r\n    </li>\r\n</ul>");}]);