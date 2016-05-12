(function (angular, undefined) {

	angular.module('expression-builder')
		.factory('BuilderGroup', Factory);

	Factory.$inject = ['BuilderExpression'];

	function Factory (BuilderExpression) {
		return Group;

		function Group () {
			BuilderExpression.call(this, 'group');
			this.expressions = [];
			this.template = 'expression-builder.group.html';
			this.isVisible = function () {
				return true;
			}
		}
	}
})(angular);