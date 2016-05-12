(function (angular, undefined) {

	angular.module('expression-builder')
		.factory('ExpressionBuilder', Factory);

	Factory.$inject = ['BuilderNode', 'BuilderGroup'];

	function Factory(BuilderNode, BuilderGroup) {
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

			function GroupBuilder() {
				this.plan = [];
				this.children = [];
			}

			function Context (builder, node) {
				this.add = function (child) {
					node.children.push(child);
				};

				this.create = function (build) {

				};

				this.clone = function () {
					var newNode = new BuilderNode();
					builder.apply(newNode);

					return newNode;
				};

				this.remove = function () {
					node.remove();
				};

				this.replace = function (id, build) {
				};
			}

			GroupBuilder.prototype.apply = function (node) {
				var fakeNode = angular.copy(node);
				fakeNode.expressions = [];
				fakeNode.children = [];

				var groupExpression = new BuilderGroup();
				var context = new Context();

				this.plan.forEach(function (p) {
					p(fakeNode, context);
				});

				fakeNode.expressions.forEach(function (expression) {
					groupExpression.expressions.push(expression);
					expression.parent = groupExpression;
					expression.remove = function () {
						var index = groupExpression.expressions.indexOf(expression);
						groupExpression.expressions.splice(index, 1);
					};
				});

				fakeNode.expressions = [];

				node.expressions.push(groupExpression);
			};

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
					var newNode = angular.extend(new BuilderNode(), parameters);

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

			Builder.prototype.group = function (id, build) {
				var buildGroup = function (node, context) {
					var builder = new GroupBuilder();
					build(builder);
					builder.apply(node);

					context[id] = node.expressions[node.expressions.length - 1];

					return node;
				};

				this.plan.push(buildGroup);

				return this;
			};

			expressions.forEach(function (settings) {
				var factory = function (id, parameters) {
					var self = this;

					var build = function (node, context) {
						var patch = new Patch(node, context, self);

						var expression = angular.extend(new settings.type(), parameters);
						expression.template = settings.templateUrl;
						expression.parent = node;
						node.expressions.push(expression);

						var keys = Object.keys(expression);

						for (var i = 0, length = keys.length; i < length; i++) {
							var key = keys[i];

							if (angular.isFunction(expression[key])) {
								patch.context(expression, key);
							}
							if (expression.unholdOn && expression.unholdOn.indexOf(key) > -1) {
								patch.unhold(expression, key, node, context);
							}
						}

						if (!angular.isFunction(expression.isVisible)) {
							expression.isVisible = function () {
								return true;
							};
						}
						patch.visibility(expression);

						context[id] = expression;

						return node;
					};

					this.plan.push(build);

					return this;
				};

				Builder.prototype[settings.property] = factory;
				GroupBuilder.prototype[settings.property] = factory;
			});

			return new Builder();
		}

		function Patch(node, context, self) {
			this.context = function (expression, key) {
				var sourceFunction = expression[key];

				expression[key] = function () {
					return sourceFunction.apply(expression, [context].concat(arguments));
				};
			};

			this.unhold = function (expression, key) {
				var sourceFunction = expression[key];
				expression[key] = function () {
					if (node.placeholder) {
						self.unhold(node, context);
					}
					expression[key] = sourceFunction;

					return sourceFunction.apply(self, arguments);
				};
			};

			this.visibility = function (expression) {
				var sourceFunction = expression.isVisible;

				expression.isVisible = function () {
					return (!node.placeholder || expression.placeholder !== false) && sourceFunction.apply(expression, [context]);
				};
			};
		}
	}

})(angular);