module.exports = function (angular) {

	angular.module('expression-builder').directive('ebExpression', Directive);

	Directive.$inject = ['$templateCache', '$compile'];

	function Directive($templateCache, $compile) {
		return {
			restrict: 'A',
			scope: {
				expression: '=ebExpression'
			},
			link: function (scope, element, attr) {
				var $watch = scope.expression.$watch = scope.expression.$watch || {};

				var keys = Object.keys($watch),
					length = keys.length;

				for (var i = 0; i < length; i++) {
					var key = keys[i],
						watch = scope.expression.$watch[key];

					scope.$watch('expression.' + key, function (newVal, oldVal) {
						watch.apply(scope.expression, [newVal, oldVal]);
					});
				}

				var template = $templateCache.get(scope.expression.template);
				var expression = $compile(template)(scope);
				element.append(expression);
			}
		}
	}
};