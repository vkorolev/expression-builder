(function (angular, undefined) {

   var app = angular.module('expression-builder', [])

   var utils = require('./services/utils');

   require('./builder/expression-builder')(angular);

   require('./model/eb-expression')(angular);
   require('./model/eb-node')(angular);
   require('./services/patch')(angular);

   var expressionGroup = require('./model/expression-group'),
       expressionNode = require('./model/expression-node');


   app.factory('ExpressionNode', function () {
      return expressionNode;
   });
   
   app.factory('ExpressionGroup', function () {
      return expressionGroup;
   });

})(angular);