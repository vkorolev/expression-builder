(function (angular, undefined) {
    
    angular.module('expression-builder')
        .directive('ebNode', Directive);
    
    Directive.$inject = [];
    
    function Directive () {
        return {
            restrict: 'E',
            scope: {
                node: '=ebNode'
            },
            template: '',
            link: function (scope, element, attr) {
                
            }
        }
    }
})(angular);