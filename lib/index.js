'use strict';

const RPClient = require('reportportal-client'),
    StringDecoder = require('string_decoder').StringDecoder,
    _ = require('lodash'),
    utils = require('./utils'),

    /**
     * Basic error handler for promises. Just prints errors.
     *
     * @param {Object} err Promise's error
     */
    errorHandler = err => {
        if (err) {
            console.error(err);
        }
    },

    /**
     * Possible test execution statuses.
     *
     * @enum {string}
     */
    TestStatus = Object.freeze({
        PASSED: 'PASSED',
        FAILED: 'FAILED'
    }),

    /**
     * The list of patterns for determining test cases in a test script.
     *
     * @type {Array}
     */
    TEST_PATTERNS = [/[\s]*pm.test\("(.*?)",/, /[\s]*tests\["(.*?)"\]/];

/**
 * Creates reportportal reporter for the newman.
 *
 * @param {Object} emitter The collection run object, with a event handler setter, used to enable event wise reporting.
 * @param {Object} options The set of Reportportal reporter run options.
 * @param {Object} collectionRunOptions The set of all the collection run options.
 * @returns {Object} Reportportal reporter for the newman.
 */
module.exports = function (emitter, options, collectionRunOptions) {
    const client = new RPClient({
            token: options.token,
            debug: options.debug,
            endpoint: options.endpoint,
            project: options.project,
            launch: options.launch
        }),

        /** Map<string, Object> */
        collectionMap = new Map(),

        /** String decoder. */
        decoder = new StringDecoder('utf8');

    /**
     * Launch object of the current test run.
     *
     * @type {Object}
     * */
    let launchObj;

    // Starts a new launch
    emitter.on('start', err => {
        if (err) {
            throw err;
        }

        const description = collectionRunOptions.collection.description ?
            collectionRunOptions.collection.description.content :
            'Newman launch';

        launchObj = client.startLaunch({
            description: description,
            tags: getTags(collectionRunOptions.collection.variables)
        });

        launchObj.promise.catch(errorHandler);
    });

    // Starts an item as test
    emitter.on('beforeItem', (err, o) => {
        if (err) {
            throw err;
        }

        const testObj = client.startTestItem({
            name: o.item.name,
            type: 'TEST',
            tags: getTags(collectionRunOptions.collection.variables)
        },
        launchObj.tempId);

        testObj.promise.catch(errorHandler);

        collectionMap.set(o.cursor.ref, {
            testId: testObj.tempId,
            steps: []
        });
    });

    // Starts a request step
    emitter.on('beforeRequest', (err, o) => {
        if (err) {
            throw err;
        }

        const testObj = collectionMap.get(o.cursor.ref),
            // Name of the current step. If requst doesn't have description - default name will be used
            stepName = o.request.description ? o.request.description.content : 'Postman request',
            // Creates a new step
            stepObj = client.startTestItem({
                name: stepName,
                type: 'STEP',
                tags: getTags(collectionRunOptions.environment.values)
            },
            launchObj.tempId,
            testObj.testId);

        stepObj.promise.catch(errorHandler);

        // Sends request's metadata
        sendRequestLogs(stepObj.tempId, o.request);

        testObj.steps.push({
            stepId: stepObj.tempId,
            requestId: o.item.id,
            name: stepName
        });
    });

    // Starts test scripts as test steps
    emitter.on('beforeTest', (err, o) => {
        if (err) {
            throw err;
        }

        const testObj = collectionMap.get(o.cursor.ref);

        _.filter(o.events, 'script')
            .flatMap(event => event.script.exec) // Extracts test script's strings
            .flatMap(exec => getStepNames(exec)) // Extracts test names from script's strings
            .forEach(stepName => {
                // Starts a new step for every test in a test script
                const stepObj = client.startTestItem({
                    name: stepName,
                    type: 'STEP',
                    tags: getTags(collectionRunOptions.environment.values)
                },
                launchObj.tempId,
                testObj.testId);

                stepObj.promise.catch(errorHandler);

                testObj.steps.push({
                    stepId: stepObj.tempId,
                    name: stepName
                });
            });
    });

    // Finishes all test steps and tests
    emitter.on('beforeDone', (err, o) => {
        if (err) {
            throw err;
        }

        // Test run object
        const run = o.summary.run;

        for (let [ref, testObj] of collectionMap) {
            finishSteps(ref, testObj, run);
            finishTest(ref, testObj, run);
        }
    });

    // Finishes launch
    emitter.on('done', (err, o) => {
        if (err) {
            throw err;
        }

        client
            .finishLaunch(launchObj.tempId, {
                status: o.run.failures ? TestStatus.FAILED : TestStatus.PASSED
            })
            .promise.catch(errorHandler);
    });

    /**
     * Sends log message to RP using it's client.
     *
     * @param  {string} id RP's item id.
     * @param  {string} value Message value.
     * @param  {string} [level="INFO"] Log level.
     */
    function logMessage (id, value, level = 'INFO') {
        client
            .sendLog(id, {
                level: level,
                message: value
            })
            .promise.catch(errorHandler);
    }

    /**
     * Sends request data logs for a specific request: URL, method, headers, body.
     *
     * @param  {string} stepId Id of request's step.
     * @param  {Object} request Http request.
     */
    function sendRequestLogs (stepId, request) {
        logMessage(stepId, `Request: URL: ${request.url.toString()}`);
        logMessage(stepId, `Request: Method: ${request.method}`);

        const headers = request.headers.members.map(header => `${header.key}:${header.value}`);

        if (headers.length) {
            logMessage(stepId, `Request: Headers: ${headers}`);
        }

        if (request.body && request.body.toString()) {
            logMessage(stepId, `Request: Body: ${request.body.toString()}`);
        }
    }

    /**
     * Sends response data logs for a specific request: response code, status, headers, body.
     *
     * @param  {string} stepId Id of request's step.
     * @param  {Object} response Http response.
     */
    function sendResponseLogs (stepId, response) {
        const headers = response.headers.members.map(header => `${header.key}:${header.value}`);

        logMessage(stepId, `Response: Code: ${response.code}`);
        logMessage(stepId, `Response: Status: ${response.status}`);
        logMessage(stepId, `Response: Headers: ${headers}`);
        logMessage(stepId, `Response: Body: ${decoder.write(response.stream)}`);
    }

    /**
     * Finishes all test steps in a given test object.
     *
     * @param  {string} reference Reference id to the current test run.
     * @param  {Object} testObj Test item steps of which have to be finished.
     * @param  {Object} run Object with iformation about current test run.
     */
    function finishSteps (reference, testObj, run) {
        // First of all check request step
        const requestStep = _.find(testObj.steps, 'requestId'),
            // Checks for executions object
            execution = _.find(run.executions, {
                id: requestStep.requestId
            });

        if (execution.requestError) {
            // If request step has been finished with errors - fails it and all steps from it's test object
            failAllSteps(testObj, execution.requestError.message);

            return;
        }

        sendResponseLogs(requestStep.stepId, execution.response);

        // Check for script failures
        const scriptFailure = _.find(run.failures, {
            at: 'test-script',
            cursor: {
                ref: reference
            }
        });

        if (scriptFailure) {
            // Fails all steps with the same error if there is an error in a test-script
            failAllSteps(testObj, scriptFailure.error.message);

            return;
        }

        // Otherwise finishes all steps according to their results
        _.forEach(testObj.steps, step => {
            const failure = _.find(run.failures, {
                cursor: {
                    ref: reference
                },
                error: {
                    test: step.name
                }
            });

            if (failure) {
                // Logs error message for the failed steps
                logMessage(step.stepId, failure.error.message, 'ERROR');
            }

            client
                .finishTestItem(step.stepId, {
                    status: failure ? TestStatus.FAILED : TestStatus.PASSED
                })
                .promise.catch(errorHandler);
        });

        /**
         * Fails all steps of the given test object with sending the same error message for each of them.
         *
         * @param  {Object} testObj Test object with steps to fail.
         * @param  {string} message Error message to log.
         */
        function failAllSteps (testObj, message) {
            _.forEach(testObj.steps, step => {
                logMessage(step.stepId, message, 'ERROR');

                client
                    .finishTestItem(step.stepId, {
                        status: TestStatus.FAILED
                    })
                    .promise.catch(errorHandler);
            });
        }
    }

    /**
     * Finishes given test object.
     *
     * @param  {string} reference Reference id to the current test run.
     * @param  {Object} testObj Test item to finish.
     * @param  {Object} run Object with information about current test run.
     */
    function finishTest (reference, testObj, run) {
        const failed = _.some(run.failures, ['cursor.ref', reference]);

        client
            .finishTestItem(testObj.testId, {
                status: failed ? TestStatus.FAILED : TestStatus.PASSED
            })
            .promise.catch(errorHandler);
    }

    /**
     * Searches for a step names in a given script string and returns them.
     * Supports both old and new postman's tests style.
     *
     * @param  {string} script Newman's test script string.
     * @returns {Array} Array of step names from the given script's string.
     */
    function getStepNames (script) {
        return script
            .split(';')
            .sliceOn(0, x => x.includes('//')) // Removes commented elements
            .map(x => utils.matchPattern(x, TEST_PATTERNS, 1))
            .filter(Boolean); // Removes empty step names
    }

    /**
     * Extracts a value of the 'tags' variable from the given array and transforms it's value to array
     * of tags.
     *
     * @param  {Object} variables Object that cintains array of postman's variables.
     * @returns {Array} Array of tags.
     */
    function getTags (variables) {
        const tags = _.find(variables.members, {
            key: 'tags'
        });

        return tags && tags.value ? tags.value.split(';') : [];
    }
};
