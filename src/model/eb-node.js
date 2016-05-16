module.exports = function (angular) {

   angular.module('expression-builder')
       .directive('ebNode', Directive);

   Directive.$inject = [];

   function Directive() {
      return {
         restrict: 'A',
         scope: {
            node: '=ebNode'
         },
         templateUrl: 'eb-node.html',
         link: function (scope, element, attr) {
         }
      }
   }
};