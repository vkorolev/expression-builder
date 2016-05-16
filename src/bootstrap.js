(function (angular, undefined) {
   angular.module('expression-builder', []);

   var utils = require('./services/utils');

   require('./builder/expression-builder')(angular);
   require('./builder/group-schema')(angular);
   require('./builder/line')(angular);
   require('./builder/node')(angular);
   require('./builder/node-schema')(angular);

   require('./model/eb-expression')(angular);
   require('./model/eb-node')(angular);
   require('./model/expression-group')(angular);
   require('./model/expression-node')(angular);

   require('./services/patch')(angular);
})(angular);