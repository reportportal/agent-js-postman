'use strict';

const Reporter = require('./reporter');

module.exports = function (emitter, options, collectionRunOptions) {
    return new Reporter(emitter, options, collectionRunOptions);
};
