const RPClient = require('reportportal-client'),

    StringDecoder = require('string_decoder').StringDecoder,

    _ = require('lodash'),

    utils = require('./utils');

/**
 * Possible test execution statuses.
 * @enum {string}
 */
const TestStatus = Object.freeze({
    PASSED: "PASSED",
    FAILED: "FAILED"
});

/**
 * Creates a flattened array of values by running each element in given array
 * thru `iteratee` and flattening the mapped results. The iteratee is invoked
 * with three arguments: (value, index|key, collection).
 * @param  {Function} [iteratee=_.identity] The function invoked per iteration.
 * @returns {Array} Returns the new flattened array.
 */
Array.prototype.flatMap = function (iteratee = _.identity) {
    return this.map(iteratee).reduce((acc, x) => acc.concat(x), []);
}

/**
 * Creates reportportal reporter for the newman.
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
    });

    /** 
     * Basic launch object for the current test run. 
     * @type {Object} 
     * */
    let launchObj;

    const /** Map<string, Object> */ collectionMap = new Map();

    // Starts a new launch
    emitter.on('start', () => {
        let description = 'Newman launch';

        if (_.has(collectionRunOptions.collection, 'description')) {
            description = collectionRunOptions.collection.description.content;
        }

        launchObj = client.startLaunch({
            description: description
        });
    });

    // Starts an item as test
    emitter.on('beforeItem', (err, o) => {
        if (err) {
            throw err;
        }

        const testObj = client.startTestItem({
            name: o.item.name,
            type: "TEST"
        }, launchObj.tempId);

        collectionMap.set(o.cursor.ref, {
            testId: testObj.tempId,
            steps: []
        });
    });

    // Starts request step
    emitter.on('beforeRequest', (err, o) => {
        if (err) {
            throw err;
        }

        const stepName = o.request.description ? o.request.description.content : 'Postman request';

        const testObj = collectionMap.get(o.cursor.ref);
        const stepObj = client.startTestItem({
            name: stepName,
            type: "STEP"
        }, launchObj.tempId, testObj.testId);

        // Sends request metadata
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

        _.filter(o.events, event => event.script)
            .flatMap(event => event.script.exec)
            .forEach(exec => {
                const stepName = getStepName(exec);

                if (!stepName) {
                    return;
                }

                const stepObj = client.startTestItem({
                    name: stepName,
                    type: "STEP"
                }, launchObj.tempId, testObj.testId);

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

        collectionMap.forEach((testObj, ref) => {
            finishSteps(ref, testObj, run);
            finishTest(ref, testObj, run);
        });
    });

    // Finishes launch
    emitter.on('done', (err, o) => {
        client.finishLaunch(launchObj.tempId, {
            status: o.run.failures || err ? TestStatus.FAILED : TestStatus.PASSED
        });
    });

    /**
     * Constructs log message body for RP client.
     * @param  {string} value Message value.
     * @param  {string} [level="INFO"] Log level.
     */
    function logMessage(value, level = "INFO") {
        return {
            level: level,
            message: value
        }
    }

    /**
     * Sends request data logs for specific request: URL, method, headers, body.
     * @param  {string} stepId Id of request's step.
     * @param  {Object} request Http request.
     */
    function sendRequestLogs(stepId, request) {
        client.sendLog(stepId, logMessage(`Request: URL: ${request.url.toString()}`));
        client.sendLog(stepId, logMessage(`Request: Method: ${request.method}`));

        const headers = request.headers.members.map(header => `${header.key}:${header.value}`);
        if (headers.length) {
            client.sendLog(stepId, logMessage(`Request: Headers: ${headers}`));
        }

        const body = request.body.toString();
        if (body) {
            client.sendLog(stepId, logMessage(`Request: Body: ${body}`));
        }
    }

    /**
     * Sends response data logs for specific request: response code, status, headers, body.
     * @param  {string} stepId Id of request's step
     * @param  {Object} response Http response
     */
    function sendResponseLogs(stepId, response) {
        client.sendLog(stepId, logMessage(`Response: Code: ${response.code}`));
        client.sendLog(stepId, logMessage(`Response: Status: ${response.status}`));

        const headers = response.headers.members.map(header => `${header.key}:${header.value}`);
        client.sendLog(stepId, logMessage(`Response: Headers: ${headers}`));

        const decoder = new StringDecoder('utf8');
        client.sendLog(stepId, logMessage(`Response: Body: ${decoder.write(response.stream)}`));
    }

    /**
     * Finishes all test steps in a given test object.
     * @param  {string} ref Reference id to the current test run.
     * @param  {Object} testObj Test item which steps have to be finished.
     * @param  {Array} failures Array of failures which were happened during test run.
     */
    function finishSteps(ref, testObj, run) {
        // First of all send logs with response data
        const requestStep = testObj.steps.find(step => step.requestId);
        const response = run.executions.find(exec => exec.id == requestStep.requestId).response;

        sendResponseLogs(requestStep.stepId, response);

        // Check for failures
        const scriptFailure = _.find(run.failures, failure => failure.at == "test-script");

        if (scriptFailure) {
            //Fail all steps with the same error if there is an error in a test-script
            testObj.steps.forEach(step => {
                client.sendLog(step.stepId, logMessage(scriptFailure.error.message, "ERROR"));
                client.finishTestItem(step.stepId, {
                    status: TestStatus.FAILED
                });
            });
        } else {
            // Otherwise finish all steps according to their results
            testObj.steps.forEach(step => {
                const failure = _.find(run.failures, failure => failure.cursor.ref == ref && failure.error.test == step.name);

                if (failure) {
                    // Log error message for failed steps
                    client.sendLog(step.stepId, logMessage(failure.error.message, "ERROR"));
                }

                client.finishTestItem(step.stepId, {
                    status: failure ? TestStatus.FAILED : TestStatus.PASSED
                });
            });
        }
    }

    /**
     * Finishes given test object.
     * @param  {string} ref Reference id to the current test run.
     * @param  {Object} testObj Test item to finish.
     * @param  {Array} failures Array of failures which were happened during test run.
     */
    function finishTest(ref, testObj, run) {
        const failed = _.some(run.failures, failure => failure.cursor.ref == ref);

        client.finishTestItem(testObj.testId, {
            status: failed ? TestStatus.FAILED : TestStatus.PASSED
        })
    }

    /**
     * Searches for a step name in a given script string and returns it. If a test name won't be found - this function returns @type {null}.
     * Supports both old and new postman's tests style.
     * @param  {?Object} script Newman test script string.
     * @returns Step name of given script string.
     */
    function getStepName(script) {
        const testPatterns = [
            /^[\s]*pm.test\(\"(.*)\"/,
            /^[\s]*tests\[\"(.*)\"\]/
        ];

        return utils.matchPattern(script, testPatterns, 1);
    }
}