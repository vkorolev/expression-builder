module.exports = function (angular) {

   angular.module('expression-builder')
       .factory('ExpressionGroup', Factory);

   Factory.$inject = [];

   function Factory() {
      return Group;

      function Group() {
         this.expressions = [];
         this.template = 'eb-group.html';
      }
   }
};