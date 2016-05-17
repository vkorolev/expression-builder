(function (angular, undefined) {

   var module = angular.module('expression-builder', []);

   require('./builder/expression-builder')(module);
   require('./model/eb-expression')(module);
   require('./model/eb-node')(module);

   var expressionGroup = require('./model/expression-group'),
       expressionNode = require('./model/expression-node');

   module.factory('ExpressionNode', function () {
      return expressionNode;
   });
   
   module.factory('ExpressionGroup', function () {
      return expressionGroup;
   });

})(angular);