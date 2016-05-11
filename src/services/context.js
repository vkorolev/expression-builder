(function (angular, undefined) {

	angular.module('expression-builder')
		.factory('ExpressionBuilderContext', Factory);

	Factory.$inject = ['BuilderNode'];

	function Factory (BuilderNode) {
		function Context (builder, node) {
			this.clone = function () {
				var newNode = new BuilderNode();
				builder.apply(newNode);

				return newNode;
			};

			this.remove = function () {
				node.remove();
			};

			this.add = function (child) {
				node.children.push(child);
			};
		}

		return Context;
	}

})(angular);