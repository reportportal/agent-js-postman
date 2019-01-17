let RPClient = require('reportportal-client'),
    _ = require('lodash');

/**
 * Possible test execution statuses.
 * 
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
 * 
 * @param  {Function} [iteratee=_.identity] The function invoked per iteration.
 * @returns {Array} Returns the new flattened array.
 */
Array.prototype.flatMap = function (iteratee = _.identity) {
    return this.map(iteratee).reduce((acc, x) => acc.concat(x), []);
}

module.exports = function (emitter, options, collectionRunOptions) {
    const client = new RPClient({
        token: options.token,
        debug: options.debug,
        endpoint: options.endpoint,
        project: options.project,
        launch: options.launch
    });

    var launchObj;

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

        let testObj = client.startTestItem({
            name: o.item.name,
            type: "TEST"
        }, launchObj.tempId);

        collectionMap.set(o.cursor.ref, {
            testId: testObj.tempId,
            steps: []
        });
    });

    // Starts test scripts as test steps
    emitter.on('beforeTest', (err, o) => {
        if (err) {
            throw err;
        }

        let testObj = collectionMap.get(o.cursor.ref);
<<<<<<< HEAD

        _.filter(o.events, event => event.script)
            .flatMap(event => event.script.exec)
            .forEach(exec => {
                let stepName = getStepName(exec);

                if (!stepName) {
                    return;
                }

                let stepObj = client.startTestItem({
                    name: stepName,
                    type: "STEP"
                }, launchObj.tempId, testObj.testId);

=======

        _.filter(o.events, event => event.script)
            .flatMap(event => event.script.exec)
            .forEach(exec => {
                let stepName = getStepName(exec);

                if (!stepName) {
                    return;
                }

                let stepObj = client.startTestItem({
                    name: stepName,
                    type: "STEP"
                }, launchObj.tempId, testObj.testId);

>>>>>>> 0857eb15f8050d3568ca2b4a7d838e3f7e9d7edc
                testObj.steps.push({
                    stepName: stepName,
                    stepId: stepObj.tempId
                });
            });
    });

    // Finishes all test steps and tests
    emitter.on('beforeDone', (err, o) => {
        if (err) {
            throw err;
        }

        // Array of test run failures
        let failures = o.summary.run.failures;

        collectionMap.forEach((value, key) => {
            finishSteps(key, value, failures);
            finishTest(key, value, failures);
<<<<<<< HEAD
        });
    });

    // Finishes launch
    emitter.on('done', (err, o) => {
        client.finishLaunch(launchObj.tempId, {
            status: o.run.failures || err ? TestStatus.FAILED : TestStatus.PASSED
        });
    });

    // Sends console log entry
    emitter.on('console', (err, o) => {
        if (err) {
            throw err;
        }
    });

=======
        });
    });

    // Finishes launch
    emitter.on('done', (err, o) => {
        client.finishLaunch(launchObj.tempId, {
            status: o.run.failures || err ? TestStatus.FAILED : TestStatus.PASSED
        });
    });

>>>>>>> 0857eb15f8050d3568ca2b4a7d838e3f7e9d7edc
    /**
     * Finishes all test steps in a given test object.
     * 
     * @param  {string} ref Reference id to the current test run.
     * @param  {Object} testObj Test item which steps have to be finished.
     * @param  {Array} failures Array of failures which were happened during test run.
     */
    function finishSteps(ref, testObj, failures) {
        _.map(testObj.steps, step => {
            let failed = _.some(failures, failure => failure.cursor.ref == ref && failure.error.test == step.stepName);

            return {
                id: step.stepId,
                failed: failed
            };
        }).forEach(step => {
            client.finishTestItem(step.id, {
                status: step.failed ? TestStatus.FAILED : TestStatus.PASSED
            });
        });
    }

    /**
     * Finishes given test object.
     * 
     * @param  {string} ref Reference id to the current test run.
     * @param  {Object} testObj Test item to finish.
     * @param  {Array} failures Array of failures which were happened during test run.
     */
    function finishTest(ref, testObj, failures) {
        let failed = _.some(failures, failure => failure.cursor.ref == ref && !failure.cursor.scriptId);

        client.finishTestItem(testObj.testId, {
            status: failed ? TestStatus.FAILED : TestStatus.PASSED
        })
    }

    /**
     * Searches for a step name in a given script string and returns it. If a test name won't be found - this function returns @type {null}.
<<<<<<< HEAD
     * Supports both old and new postman's tests style.
=======
     * Supports both old and new postman't test style.
>>>>>>> 0857eb15f8050d3568ca2b4a7d838e3f7e9d7edc
     * 
     * @param  {?Object} execScript Newman test script string.
     * @returns Step name of given script string.
     */
    function getStepName(execScript) {
        if (!execScript) {
            return null;
        }

        let testName = execScript.match(/pm.test\(\"(.*)\"/) || execScript.match(/tests\[\"(.*)\"\]/);
        return testName == null ? null : testName[1];
    }
}