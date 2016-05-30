var utils = require('../services/utils'),
    evaluateFactory = require('../services/evaluateFactory');

module.exports = function (angular) {
    angular.module('expression-builder').directive('ebClass', Directive);

    Directive.$inject = ['$parse'];

    function Directive($parse) {
        return {
            restrict: 'A',
            link: function (scope, element, attr) {
                var getter = $parse(attr.ebClass),
                    contextGetter = $parse(attr.ebClassContext),
                    classes = '';

                scope.$watch(function () {
                    return evaluateFactory(contextGetter(scope), [scope.node])(getter(scope));
                }, function (value) {
                    if(value) {
                        var oldClasses = classes;
                        var newClasses = fetchClasses(value).join(' ');
                        if (oldClasses !== newClasses) {
                            classes = newClasses;
                            element.removeClass(oldClasses);
                            element.addClass(classes);
                        }
                    }
                    else{
                        element.removeClass(classes);
                        classes = '';
                    }
                }, true);

                function fetchClasses(object) {
                    var keys = Object.keys(object),
                        length = keys.length,
                        classes = [];

                    for (var i = 0; i < length; i++) {
                        var key = keys[i];
                        if (object[key]) {
                            classes.push(key);
                        }
                    }

                    return classes;
                }
            }
        }
    }
};