(function (angular, undefined) {

   angular.module('expression-builder', []);

   require('./builder/expression-builder')(angular);
   require('./model/eb-expression')(angular);
   require('./model/eb-node')(angular);

})(angular);