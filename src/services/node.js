(function (angular, undefined) {

	angular.module('expression-builder')
		.factory('BuilderNode', Factory);

	Factory.$inject = [];

	function Factory () {
		return Node;
	}

	function Node () {
		this.expressions = [];
		this.children = [];
	}
})(angular);