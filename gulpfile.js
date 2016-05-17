var gulp = require('gulp');
var angularTemplates = require('gulp-angular-templatecache');
var concat = require('gulp-concat');
var source = require('vinyl-source-stream');
var browserify = require('browserify');

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

gulp.task('concat:release', function () {
   return gulp.src(['dist/scripts.js', 'dist/templates.js'])
       .pipe(concat('expression-builder.js'))
       .pipe(gulp.dest('./dist'));
});

gulp.task('release', function () {
   gulp.run('commonjs', 'templates', 'concat:release');
});

gulp.task('browserify', function () {
   return browserifyTask();
});

gulp.task('browserify:debug', function () {
   return browserifyTask({debug: true});
});

gulp.task('default', function () {
   gulp.run('browserify:debug', 'templates');

   gulp.watch('src/**/*.js', function () {
      gulp.run('browserify:debug');
   });

   gulp.watch('src/templates/**/*.html', function () {
      gulp.run('templates');
   });
});