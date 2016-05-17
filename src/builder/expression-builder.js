var nodeSchemaFactoryT = require('./node-schema'),
    groupSchemaFactoryT = require('./group-schema'),
    Patch = require('./../services/patch');

module.exports = function (module) {
   module
       .factory('ExpressionBuilder', Factory);

   Factory.$inject = ['ExpressionGroup'];

   function Factory(ExpressionGroup) {
      function ExpressionBuilder(expressions) {
         var GroupSchema = groupSchemaFactoryT();
         var NodeSchema = nodeSchemaFactoryT(GroupSchema);

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

            NodeSchema.prototype[settings.type] = factory;
            GroupSchema.prototype[settings.type] = factory;
         });

         return new NodeSchema();
      }

      return ExpressionBuilder;
   }
};