(function (angular, undefined) {
    
    angular.module('expression-builder')
        .directive('ebNode', Directive);
    
    Directive.$inject = [];
    
    function Directive () {
        return {
            restrict: 'A',
            scope: {
                node: '=ebNode',
                builder: '=builder'
            },
            templateUrl: 'expression-builder.node.html',
            link: function (scope, element, attr) {
                console.log('NB NODE');
            }
        }
    }
})(angular);