module.exports = function (angular) {
   angular.module('expression-builder')
       .factory('ExpressionBuilder', Factory);

   Factory.$inject = ['ExpressionNode', 'ExpressionGroup'];

   var NodeSchema = require('./node-schema'),
       GroupSchema = require('./group-schema'),
       Patch = require('./../services/patch');

   function Factory(ExpressionNode, ExpressionGroup) {
      function ExpressionBuilder(expressions) {
         expressions.forEach(function (settings) {
            var factory = function (id, parameters) {

               var build = function (node, context) {
                  var patch = new Patch(context);

                  var expression = angular.extend({}, parameters);
                  var group = new ExpressionGroup();
                  group.expressions.push(expression);
                  expression.template = settings.templateUrl;
                  // expression.parent = node;
                  node.expressions.push(expression);

                  var keys = Object.keys(expression);

                  for (var i = 0, length = keys.length; i < length; i++) {
                     var key = keys[i];

                     if (angular.isFunction(expression[key])) {
                        patch.context(expression, key);
                     }
                  }

                  context[id] = expression;

                  return node;
               };

               this.plan.push(build);

               return this;
            };

            NodeSchema.prototype[settings.property] = factory;
            GroupSchema.prototype[settings.property] = factory;
         });

         return new NodeSchema();
      }

      return ExpressionBuilder;
   }
};