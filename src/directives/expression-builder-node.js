(function (angular, undefined) {
    
    angular.module('expression-builder')
        .directive('ebNode', Directive);
    
    Directive.$inject = [];
    
    function Directive () {
        return {
            restrict: 'A',
            scope: {
                node: '=ebNode'
            },
            templateUrl: 'expression-builder.node.html',
            link: function (scope, element, attr) {
            }
        }
    }
})(angular);