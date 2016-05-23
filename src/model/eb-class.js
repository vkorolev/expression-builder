var utils = require('../services/utils');

module.exports = function (angular) {
    angular.module('expression-builder').directive('ebClass', Directive);

    Directive.$inject = ['$parse'];

    function Directive($parse) {
        return {
            restrict: 'A',
            link: function (scope, element, attr) {
                var getter = $parse(attr.ebClass),
                    classes = '';

                var unbind = scope.$watch(evaluateClassObject, function (value) {
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

                function evaluateClassObject() {
                    var classObject = getter(scope);

                    if (!classObject) {
                        return null;
                    }

                    var keys = Object.keys(classObject),
                        result = {},
                        length = keys.length;

                    for (var i = 0; i < length; i++) {
                        var key = keys[i],
                            value = classObject[key];
                        if (utils.isFunction(value)) {
                            result[key] = value(scope.node);
                        } else {
                            result[key] = value;
                        }
                    }

                    return result;
                }

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

                scope.$on('$destroy', function () {
                    unbind();
                });

            }
        }
    }
};