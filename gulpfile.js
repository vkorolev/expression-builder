var gulp = require('gulp'),
    angularTemplates = require('gulp-angular-templatecache'),
    concat = require('gulp-concat'),
    source = require('vinyl-source-stream'),
    browserify = require('browserify'),
    uglify = require('gulp-uglify'),
    Server = require('karma').Server;

var browserifyTask = function (bundleConfig) {
    return browserify('./src/bootstrap.js', bundleConfig)
        .bundle()
        .pipe(source('scripts.js'))
        .pipe(gulp.dest('./dist/'));
};

gulp.task('templates', function () {
    return gulp.src('src/templates/**/*.html')
        .pipe(angularTemplates({
            module: 'expression-builder'
        }))
        .pipe(gulp.dest('./dist/'));
});

gulp.task('concat', function () {
    return gulp.src(['dist/scripts.js', 'dist/templates.js'])
        .pipe(concat('expression-builder.js'))
        .pipe(gulp.dest('./dist'));
});

gulp.task('uglify', function () {
    return gulp.src('dist/expression-builder.js')
        .pipe(uglify())
        .pipe(gulp.dest('./dist'));
});

gulp.task('release', function () {
    gulp.run('browserify', 'templates', 'concat');
});

gulp.task('browserify', function () {
    return browserifyTask();
});

gulp.task('browserify:debug', function () {
    return browserifyTask({debug: true});
});

gulp.task('test', function (done) {
    return new Server.start({
        configFile: __dirname + '/karma.conf.js',
        singleRun: false
    }, function (exitCode) {
        done();
        process.exit(exitCode);
    });
});

gulp.task('default', function () {
    gulp.run('browserify:debug', 'templates', 'concat');

    gulp.watch('src/**/*.js', function () {
        gulp.run('browserify:debug');
        gulp.run('concat');
    });

    gulp.watch('src/templates/**/*.html', function () {
        gulp.run('templates');
        gulp.run('concat');
    });
});