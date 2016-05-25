module.exports = function (config) {
    config.set({
        frameworks: ['mocha', 'chai'],
        browsers: ['PhantomJS'],
        reporters: ['spec'],
        files: [
            'node_modules/chai/chai.js',
            'bower_components/angular/angular.js',
            'bower_components/angular-mocks/angular-mocks.js',
            'dist/expression-builder.js',
            'test/spec/**/*.js'
        ]
    })
};