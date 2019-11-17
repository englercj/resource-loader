'use strict';

module.exports = function conf(config) {
    config.set({
        basePath: '../',
        frameworks: ['mocha', 'sinon-chai'],
        autoWatch: true,
        logLevel: config.LOG_INFO,
        logColors: true,
        reporters: ['mocha'],
        browsers: ['Chrome'],
        browserDisconnectTimeout: 10000,
        browserDisconnectTolerance: 2,
        browserNoActivityTimeout: 30000,

        files: [
            // our code
            'dist/resource-loader.js',

            // fixtures
            {
                pattern: 'test/fixtures/**/*.js',
                watched: false,
                included: true,
                served: true,
            },

            {
                pattern: 'test/data/**/*',
                watched: false,
                included: false,
                served: true,
            },

            // tests
            {
                pattern: 'test/spec/**/*.test.js',
                watched: true,
                included: true,
                served: true,
            },
        ],

        plugins: [
            'karma-mocha',
            'karma-sinon-chai',
            'karma-mocha-reporter',
            'karma-chrome-launcher',
            'karma-firefox-launcher',
        ],
    });

    if (process.env.TRAVIS)
    {
        config.logLevel = config.LOG_DEBUG;
        config.browsers = ['Firefox'];
    }
};
