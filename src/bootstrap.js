(function (angular, undefined) {

   var module = angular.module('expression-builder', []);

   require('./builder/expression-builder')(angular);
   require('./model/eb-expression')(angular);
   require('./model/eb-node')(angular);
   require('./model/eb-class')(angular);

   var SerializationService = require('./services/serialization'),
       DeserializationService = require('./services/deserialization'),
       TraverseService = require('./services/traverse');

   module
       .factory('expressionBuilderSerializer', [function () {
      return {
         serialize: function (node) {
            return new SerializationService(node).serialize();
         },
         deserialize: function (schema, data) {
            return new DeserializationService(schema).deserialize(data);
         }
      }
   }])
       .service('expressionBuilderTraverse', [TraverseService]);

})(angular);