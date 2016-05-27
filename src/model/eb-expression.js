var evaluateFactory = require('../services/evaluateFactory');

module.exports = function (angular) {

	angular.module('expression-builder').directive('ebExpression', Directive);

	Directive.$inject = ['$templateCache', '$compile'];

	function Directive($templateCache, $compile) {
		return {
			restrict: 'A',
			scope: {
				expression: '=ebExpression',
				node: '='
			},
			link: function (scope, element, attr) {
				var $watch = scope.expression.$watch = scope.expression.$watch || {};
				var evaluate = evaluateFactory(scope.expression, [scope.node]);

				var keys = Object.keys($watch),
					length = keys.length;

				for (var i = 0; i < length; i++) {
					var key = keys[i],
						watch = scope.expression.$watch[key];

					watchFactory(scope.expression[key], watch);
				}

				var template = $templateCache.get(scope.expression.template);
				var expression = $compile(template)(scope);
				element.append(expression);

				function watchFactory (watchExpression, handler) {
					scope.$watch(function () {
						return evaluate(watchExpression);
					}, function (newVal, oldVal) {
						handler.apply(scope.expression, [newVal, oldVal]);
					}, true);
				}
			}
		}
	}
};