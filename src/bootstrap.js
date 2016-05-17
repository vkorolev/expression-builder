(function (angular, undefined) {

   var module = angular.module('expression-builder', []);

   require('./builder/expression-builder')(angular);
   require('./model/eb-expression')(angular);
   require('./model/eb-node')(angular);

   var expressionGroup = require('./model/expression-group'),
       expressionNode = require('./model/expression-node');

   module.factory('ExpressionNode', function () {
      return expressionNode;
   });
   
   module.factory('ExpressionGroup', function () {
      return expressionGroup;
   });

})(angular);