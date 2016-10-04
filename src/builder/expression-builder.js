var nodeSchemaFactoryT = require('./node-schema'),
	 groupSchemaFactoryT = require('./group-schema'),
	 patch = require('../services/patch'),
	 utility = require('../services/utils'),
	 ExpressionGroup = require('../model/expression-group');

module.exports = function (angular) {
	angular.module('expression-builder').factory('ExpressionBuilder', Factory);
	Factory.$inject = [];

	function Factory() {
		function ExpressionBuilder(expressions, globalSettings) {
			var GroupSchema = groupSchemaFactoryT();
			var NodeSchema = nodeSchemaFactoryT(GroupSchema);

			expressions.forEach(function (settings) {
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