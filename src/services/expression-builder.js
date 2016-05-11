(function (angular, undefined) {

	angular.module('expression-builder')
		.factory('ExpressionBuilder', Factory);

	Factory.$inject = ['BuilderNode', 'ExpressionBuilderContext'];

	function Factory(BuilderNode, Context) {
		return ExpressionBuilder;

		function ExpressionBuilder(expressions) {
			function Builder() {
				this.plan = [];
				this.context = new Context();
			}

			Builder.prototype.apply = function (node) {
				var context = new Context(this, node);

				this.plan.forEach(function (p) {
					p(node, context);
				});
			};

			Builder.prototype.node = function (parameters, build) {
				var buildNode = function (node, context) {
					var newNode = new BuilderNode();

					var builder = new Builder(expressions);
					build(builder);
					builder.apply(newNode);

					newNode.remove = function () {
						var index = node.children.indexOf(newNode);
						node.children.splice(index, 1);
					};

					node.children.push(newNode);
				};

				this.plan.push(buildNode);

				return this;
			};

			expressions.forEach(function (settings) {
				Builder.prototype[settings.property] = function (id, parameters) {
					var build = function (node, context) {
						var expression = new settings.constructor();
						angular.extend(expression, parameters);
						expression.template = settings.templateUrl;
						node.expressions.push(expression);

						var keys = Object.keys(expression);

						for (var i = 0, length = keys.length; i < length; i++) {
							var key = keys[i];
							if (angular.isFunction(expression[key])) {
                                var sourceFunction = expression[key];
								expression[key] = function () {
									sourceFunction.apply(expression, [context].concat(arguments));
								};
							}
						}

						context[id] = expression;
					};

					this.plan.push(build);

					return this;
				};
			});

			return new Builder();
		}
	}

})(angular);