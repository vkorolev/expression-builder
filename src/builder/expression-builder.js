var nodeSchemaFactoryT = require('./node-schema'),
    groupSchemaFactoryT = require('./group-schema'),
    Patch = require('./../services/patch');

module.exports = function (module) {
   module.factory('ExpressionBuilder', Factory);
   Factory.$inject = ['ExpressionGroup'];

   function Factory(ExpressionGroup) {
      function ExpressionBuilder(expressions) {
         var GroupSchema = groupSchemaFactoryT();
         var NodeSchema = nodeSchemaFactoryT(GroupSchema);

         expressions.forEach(function (settings) {
            var factory = function (id, parameters) {

               var build = function (expressionNode, node, line) {
                  var patch = new Patch(node, line);

                  var expression = angular.extend({}, parameters);
                  var group = new ExpressionGroup();
                  group.id = id;
                  group.expressions.push(expression);
                  expression.template = settings.templateUrl;
                  line.add(group);

                  var keys = Object.keys(expression);

                  for (var i = 0, length = keys.length; i < length; i++) {
                     var key = keys[i];

                     if (angular.isFunction(expression[key])) {
                        patch.context(expression, key);
                     }
                  }

                  return expressionNode;
               };

               this.plan.push(build);

               return this;
            };

            var groupFactory = function (id, parameters) {

               var build = function (expressionNode, node, line) {
                  var patch = new Patch(node, line);

                  var expression = angular.extend({}, parameters);
                  expression.id = id;
                  expression.template = settings.templateUrl;
                  line.add(expression);

                  var keys = Object.keys(expression);

                  for (var i = 0, length = keys.length; i < length; i++) {
                     var key = keys[i];

                     if (angular.isFunction(expression[key])) {
                        patch.context(expression, key);
                     }
                  }

                  return expressionNode;
               };

               this.plan.push(build);

               return this;
            };

            NodeSchema.prototype[settings.type] = factory;
            GroupSchema.prototype[settings.type] = groupFactory;
         });

         return new NodeSchema();
      }

      return ExpressionBuilder;
   }
};