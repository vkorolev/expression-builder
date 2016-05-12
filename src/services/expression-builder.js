(function (angular, undefined) {

	angular.module('expression-builder')
		.factory('ExpressionBuilder', Factory);

	Factory.$inject = ['BuilderNode', 'ExpressionBuilderContext'];

	function Factory(BuilderNode, Context) {
		return ExpressionBuilder;

		function ExpressionBuilder(expressions) {
			function Builder() {
				this.plan = [];
				this.children = [];
				this.context = new Context();
				this.unhold = function (node, context) {
					node.placeholder = false;

					var index = node.parent.children.indexOf(node);
					var newPlaceholder = new BuilderNode();

					this.apply(newPlaceholder);
					newPlaceholder.placeholder = true;
					newPlaceholder.id = node.id;

					newPlaceholder.parent = node.parent;
					newPlaceholder.remove = function () {
						var index = node.parent.children.indexOf(newPlaceholder);
						node.parent.children.splice(index, 1);
					};

					node.parent.children.splice(index + 1, 0, newPlaceholder);
				}
			}

			Builder.prototype.apply = function (node) {
				var context = new Context(this, node);
				var index = 0;
				var self = this;

				this.plan.forEach(function (p) {
					var tmpNode = p(node, context);
					if (tmpNode !== node) {
						self.children[index++].apply(tmpNode);
					}
				});
			};

			Builder.prototype.node = function (parameters, build) {
				var self = this;

				var buildNode = function (node, context) {
					var newNode = new BuilderNode();

					var builder = new Builder(expressions);
					build(builder);
					builder.apply(newNode);

					node.children.push(newNode);
					newNode.parent = node;
					newNode.remove = function () {
						var index = node.children.indexOf(newNode);
						node.children.splice(index, 1);
					};

					self.children.push(builder);

					return node;
				};

				this.plan.push(buildNode);

				return this;
			};

			expressions.forEach(function (settings) {
				Builder.prototype[settings.property] = function (id, parameters) {
					var self = this;

					var build = function (node, context) {
						var expression = new settings.constructor();
						angular.extend(expression, parameters);
						expression.template = settings.templateUrl;
						expression.parent = node;
						node.expressions.push(expression);

						var keys = Object.keys(expression);

						for (var i = 0, length = keys.length; i < length; i++) {
							var key = keys[i];
							if (angular.isFunction(expression[key])) {
								intercept(expression, key, context);
							}
							if (expression.unholdOn && expression.unholdOn.indexOf(key) > -1) {
								unholdInterceptor(expression, key, node, context);
							}
						}

						context[id] = expression;

						return node;
					};

					var unholdInterceptor = function (expression, key, node, context) {
						var sourceFunction = expression[key];
						// TODO: add if expressoin.parent.placeholder
						expression[key] = function () {
							self.unhold(node, context);
							sourceFunction.apply(self, arguments);
							expression[key] = sourceFunction;
						}
					};

					var intercept = function (object, key, context) {
						var sourceFunction = object[key];

						object[key] = function () {
							sourceFunction.apply(self, [context].concat(arguments));
						};
					};

					this.plan.push(build);

					return this;
				};
			});

			return new Builder();
		}
	}

})(angular);