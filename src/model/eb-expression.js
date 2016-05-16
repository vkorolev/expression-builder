module.exports = function (angular) {

   angular.module('expression-builder')
       .directive('ebExpression', Directive);

   Directive.$inject = ['$templateCache', '$compile'];

   function Directive($templateCache, $compile) {
      return {
         restrict: 'A',
         scope: {
            expression: '=ebExpression'
         },
         link: function (scope, element, attr) {
            var template = $templateCache.get(scope.expression.template);
            var expression = $compile(template)(scope);
            element.append(expression);
         }
      }
   }
};