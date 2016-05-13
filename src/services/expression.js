(function (angular, undefined) {

	angular.module('expression-builder')
		.factory('BuilderExpression', Factory);

	Factory.$inject = [];

	function Factory () {
		return Expression;
	}

	function Expression (type) {
		this.type = type;
		this.classes = [];
	}

})(angular);