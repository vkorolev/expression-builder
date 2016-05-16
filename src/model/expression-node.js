module.exports = function (angular, undefined) {

   angular.module('expression-builder')
       .factory('ExpressionNode', Factory);

   Factory.$inject = [];

   function Factory() {
      return Node;

   }

   function Node() {
      this.expressions = [];
      this.children = [];
      this.placeholder = false;
   }
};