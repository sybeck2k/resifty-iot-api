module.exports = function (grunt) {

  // configuration
  grunt.initConfig({
    jshint: {
      options: {
        jshintrc: '.jshintrc',
        ignores: ['test/coverage/**/*.js','node_modules/**/*']
      },
      files: {
        src: ['app/**/*.js']
      },
      gruntfile: {
        src: 'Gruntfile.js'
      }
    },

    watch: {
      lint: {
        files: '<%= jshint.files.src %>',
        tasks: 'jshint'
      },
      test: {
        files: ['test/unit/*.js'],
        tasks: ['jshint', 'mochaTest:unit']
      }
    },

    nodemon: {
      dev: {
        script: 'server.js',
        options: {
          ext: 'js,json'
        }
      }
    },

    concurrent: {
      target: {
        tasks: ['nodemon', 'watch'],
        options: {
          logConcurrentOutput: true
        }
      }
    },

    mochacov: {
      coverage: {
        options: {
          reporter: 'html-cov'
        }
      },
      test: {
        options: {
          reporter: 'spec'
        }
      },
      all: ['test/*.js']
    },

    clean: {
      coverage: {
        src: ['test/coverage/']
      }
    }

  });


  // plugins
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-mocha-cov');
  grunt.loadNpmTasks('grunt-nodemon');
  grunt.loadNpmTasks('grunt-concurrent');
  grunt.loadNpmTasks('grunt-env');

  // tasks
  grunt.registerTask('server', ['concurrent:target']);
  grunt.registerTask('default', []);
  grunt.registerTask('travis', ['mochacov:coverage']);
  grunt.registerTask('test', ['jshint', 'mochacov:test']);

};