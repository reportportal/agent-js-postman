/*
 *  Copyright 2020 EPAM Systems
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

const RPClient = require('@reportportal/client-javascript');
const StringDecoder = require('string_decoder').StringDecoder;
const _ = require('lodash');
const utils = require('./utils');
const { testPatterns, pmVariablesTestCaseIdPatterns } = require('./constants/patterns');

/**
 * Basic error handler for promises. Just prints errors.
 *
 * @param {Object} err Promise's error
 */
const errorHandler = err => {
    if (err) {
        console.error(err);
    }
};

/**
 * Possible test execution statuses.
 *
 * @enum {string}
 */
const TestStatus = Object.freeze({
    PASSED: 'PASSED',
    FAILED: 'FAILED'
});

class Reporter {
    constructor (emitter, options, collectionRunOptions) {
        this.client = new RPClient(utils.getClientInitObject(options), utils.getAgentInfo());
        this.launchObj = this.client.startLaunch(utils.getStartLaunchObj(options));
        this.collectionMap = new Map();
        this.suitesInfoStack = [];
        this.decoder = new StringDecoder('utf8');
        this.collectionRunOptions = collectionRunOptions;
        this.options = options;
        this.collectionPath = utils.getCollectionPath(this.collectionRunOptions.workingDir);
        this.launchLogs = [];
        this.suiteLogs = [];
        this.logs = [];

        emitter.on('console', this.onConsole.bind(this));
        emitter.on('start', this.onStart.bind(this));
        emitter.on('beforeRequest', this.onBeforeRequest.bind(this));
        emitter.on('beforeTest', this.onBeforeTest.bind(this));
        emitter.on('beforeDone', this.onBeforeDone.bind(this));
        emitter.on('done', this.onDone.bind(this));
    }

    onConsole (err, args) {
        if (err) {
            throw err;
        }

        const type = args.messages && args.messages[0];

        switch (type) {
            case 'launch':
                if (this.launchLogs !== null) {
                    args.messages.slice(1).forEach(message => this.launchLogs.push({ level: args.level, message }));
                }
                break;
            case 'suite':
                if (this.suiteLogs !== null) {
                    args.messages.slice(1).forEach(message => this.suiteLogs.push({ level: args.level, message }));
                }
                break;
            default:
                args.messages.forEach(message => this.logs.push({ level: args.level, message, id: args.cursor.ref }));
        }
    }

    getCurrentSuiteTempId () {
        const tempId = this.suitesInfoStack.length ?
            this.suitesInfoStack[this.suitesInfoStack.length - 1].tempId : null;

        return tempId;
    }

    getTestName (result) {
        const iteration = this.collectionRunOptions.iterationCount === undefined ?
            '' :
            ` #${result.cursor.iteration + 1}`;

        return `${result.item.name}${iteration}`;
    }

    // Starts an item as suite
    onStart (err, result) {
        if (err) {
            throw err;
        }

        const name = this.collectionRunOptions.collection.name;
        const description = this.collectionRunOptions.collection.description &&
            this.collectionRunOptions.collection.description.content;
        const codeRef = utils.getCodeRef(this.collectionPath, name);

        const suiteObj = this.client.startTestItem({
            type: 'SUITE',
            name,
            description,
            codeRef,
            testCaseId: utils.getTestCaseId(this.collectionRunOptions.collection.variables),
            attributes: utils.getAttributes(this.collectionRunOptions.collection.variables)
        }, this.launchObj.tempId);

        suiteObj.promise.catch(errorHandler);

        this.suitesInfoStack.push({ tempId: suiteObj.tempId, ref: result.cursor.ref });
    }

    // Starts a request as test
    onBeforeRequest (err, result) {
        if (err) {
            throw err;
        }
        const parentId = this.getCurrentSuiteTempId();
        const description = result.request.description && result.request.description.content;
        const name = this.getTestName(result);
        const codeRefTitle = `${this.collectionRunOptions.collection.name}/${result.item.name}`;
        const codeRef = utils.getCodeRef(this.collectionPath, codeRefTitle);
        const parameters = utils.getParameters(this.collectionRunOptions.iterationData, result.cursor.iteration);

        const testObj = this.client.startTestItem({
            name,
            type: 'TEST',
            description,
            codeRef,
            parameters,
            testCaseId: utils.getTestCaseId(this.collectionRunOptions.environment.values),
            attributes: utils.getAttributes(this.collectionRunOptions.environment.values)
        },
        this.launchObj.tempId, parentId);

        testObj.promise.catch(errorHandler);

        this.sendRequestLogs(testObj.tempId, result.request);
        this.collectionMap.set(result.cursor.ref, {
            testId: testObj.tempId,
            requestId: result.cursor.httpRequestId || result.item.id,
            steps: []
        });

        this.launchLogs && this.launchLogs.forEach(log => this.sendLaunchLogMessage(log.message, log.level));
        this.launchLogs = null;

        this.suiteLogs && this.suiteLogs.forEach(log => this.logMessage(parentId, log.message, log.level));
        this.suiteLogs = null;
    }

    // Starts test scripts as test steps
    onBeforeTest (err, result) {
        if (err) {
            throw err;
        }

        const testObj = this.collectionMap.get(result.cursor.ref);

        _.filter(result.events, 'script')
            .flatMap(event => event.script.exec) // Extracts test script's strings
            .flatMap(exec => {
                const stepName = utils.getStepParameterByPatterns(exec, testPatterns)[0];
                const testCaseId = utils.getStepParameterByPatterns(exec, pmVariablesTestCaseIdPatterns)[0];

                return { ...stepName && { stepName }, ...testCaseId && { testCaseId } };
            })
            .groupBySpecificField('stepName', ['testCaseId'])
            .forEach(stepInfoObj => {
                // Starts a new step for every test in a test script
                const stepName = stepInfoObj.stepName;
                const codeRefTitle = `${this.collectionRunOptions.collection.name}/${result.item.name}/${stepName}`;
                const parameters = utils.getParameters(this.collectionRunOptions.iterationData,
                    result.cursor.iteration);
                const codeRef = utils.getCodeRef(this.collectionPath, codeRefTitle);
                const stepObj = this.client.startTestItem({ name: stepName,
                    type: 'STEP',
                    parameters,
                    codeRef, ...(stepInfoObj.testCaseId && { testCaseId: stepInfoObj.testCaseId }) },
                this.launchObj.tempId,
                testObj.testId);

                stepObj.promise.catch(errorHandler);

                testObj.steps.push({
                    stepId: stepObj.tempId,
                    name: stepName
                });
            });
    }

    // Finishes all test steps and tests
    onBeforeDone (err, result) {
        if (err) {
            throw err;
        }

        const run = result.summary.run;

        for (let [ref, testObj] of this.collectionMap) {
            this.finishSteps(ref, testObj, run);
            this.finishTest(ref, testObj, run);
        }

        this.finishSuite();
        this.suitesInfoStack.pop();
    }

    // Finishes launch
    onDone (err, result) {
        if (err) {
            throw err;
        }

        this.client
            .finishLaunch(this.launchObj.tempId, {
                status: result.run.failures ? TestStatus.FAILED : TestStatus.PASSED
            })
            .promise.catch(errorHandler);
    }

    /**
     * Sends launch log message to RP using it's client.
     *
     * @param  {string} message value.
     * @param  {string} [level="INFO"] Log level.
     */
    sendLaunchLogMessage (message, level) {
        this.logMessage(this.launchObj.tempId, message, level);
    }

    /**
     * Sends log message to RP using it's client.
     *
     * @param  {string} id RP's item id.
     * @param  {string} value Message value.
     * @param  {string} [level="INFO"] Log level.
     */
    logMessage (id, value, level = 'INFO') {
        this.client
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
    sendRequestLogs (stepId, request) {
        this.logMessage(stepId, `Request: URL: ${request.url.toString()}`);
        this.logMessage(stepId, `Request: Method: ${request.method}`);

        const headers = request.headers.members.map(header => `${header.key}:${header.value}`);

        if (headers.length) {
            this.logMessage(stepId, `Request: Headers: ${headers}`);
        }

        if (request.body && request.body.toString()) {
            this.logMessage(stepId, `Request: Body: ${request.body.toString()}`);
        }
    }

    /**
     * Sends response data logs for a specific request: response code, status, headers, body.
     *
     * @param  {string} stepId Id of request's step.
     * @param  {Object} response Http response.
     */
    sendResponseLogs (stepId, response) {
        const headers = response.headers.members.map(header => `${header.key}:${header.value}`);

        this.logMessage(stepId, `Response: Code: ${response.code}`);
        this.logMessage(stepId, `Response: Status: ${response.status}`);
        this.logMessage(stepId, `Response: Headers: ${headers}`);
        this.logMessage(stepId, `Response: Body: ${this.decoder.write(response.stream)}`);
    }

    /**
     * Finishes all test steps in a given test object.
     *
     * @param  {string} reference Reference id to the current test run.
     * @param  {Object} testObj Test item steps of which have to be finished.
     * @param  {Object} run Object with information about current test run.
     */
    finishSteps (reference, testObj, run) {
        const scriptFailure = _.find(run.failures, {
            at: 'test-script',
            cursor: {
                ref: reference
            }
        });

        if (scriptFailure) {
            // Fails all steps with the same error if there is an error in a test-script
            this.failAllSteps(testObj, scriptFailure.error.message);

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
                this.logMessage(step.stepId, failure.error.message, 'ERROR');
            }

            this.client
                .finishTestItem(step.stepId, {
                    status: failure ? TestStatus.FAILED : TestStatus.PASSED
                })
                .promise.catch(errorHandler);
        });
    }

    /**
     * Fails all steps of the given test object with sending the same error message for each of them.
     *
     * @param  {Object} testObj Test object with steps to fail.
     * @param  {string} message Error message to log.
     */
    failAllSteps (testObj, message) {
        _.forEach(testObj.steps, step => {
            this.logMessage(step.stepId, message, 'ERROR');

            this.client
                .finishTestItem(step.stepId, {
                    status: TestStatus.FAILED
                })
                .promise.catch(errorHandler);
        });
    }

    /**
     * Finishes given test object.
     *
     * @param  {string} reference Reference id to the current test run.
     * @param  {Object} testObj Test item to finish.
     * @param  {Object} run Object with information about current test run.
     */
    finishTest (reference, testObj, run) {
        const failed = _.some(run.failures, ['cursor.ref', reference]);
        const execution = _.find(run.executions, {
            cursor: {
                httpRequestId: testObj && testObj.requestId
            }
        });

        if (execution && execution.requestError) {
            this.logMessage(testObj.testId, execution.requestError.message, 'ERROR');

            this.client
                .finishTestItem(testObj.testId, {
                    status: TestStatus.FAILED
                })
                .promise.catch(errorHandler);

            return;
        }

        if (execution && execution.response) {
            this.sendResponseLogs(testObj.testId, execution.response);
        }

        this.client
            .finishTestItem(testObj.testId, {
                status: failed ? TestStatus.FAILED : TestStatus.PASSED
            })
            .promise.catch(errorHandler);
    }

    finishSuite () {
        const currentSuiteTempId = this.getCurrentSuiteTempId();

        this.client
            .finishTestItem(currentSuiteTempId, {})
            .promise.catch(errorHandler);
    }
}

module.exports = Reporter;
