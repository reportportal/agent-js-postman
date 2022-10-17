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
const { testPatterns, pmVariablesTestCaseIdPatterns, pmVariablesStatusPatterns } = require('./constants/patterns');

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
    FAILED: 'FAILED',
    SKIPPED: 'SKIPPED'
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
        this.testLogs = [];

        emitter.on('console', this.onConsole.bind(this));
        emitter.on('start', this.onStart.bind(this));
        emitter.on('beforeRequest', this.onBeforeRequest.bind(this));
        emitter.on('beforeTest', this.onBeforeTest.bind(this));
        emitter.on('item', this.finishTest.bind(this));
        emitter.on('assertion', this.finishStep.bind(this));
        emitter.on('test', this.finishAllSteps.bind(this));
        emitter.on('request', this.onRequest.bind(this));
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
                    args.messages.slice(1)
                        .forEach(message => this.launchLogs.push({ level: args.level, message, time: this.getTime() }));
                }
                break;
            case 'suite':
                if (this.suiteLogs !== null) {
                    args.messages.slice(1)
                        .forEach(message => this.suiteLogs.push({ level: args.level, message, time: this.getTime() }));
                }
                break;
            case 'test':
                args.messages.slice(1)
                    .forEach(message => this.testLogs.push({ level: args.level, message, time: this.getTime() }));
                break;
            default:
                break;
        }
    }

    getCurrentSuiteTempId () {
        const tempId = this.suitesInfoStack.length ?
            this.suitesInfoStack[this.suitesInfoStack.length - 1].tempId : null;

        return tempId;
    }

    getTestName (result) {
        if (result.item.name === undefined) {
            return null;
        }
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
            testCaseId: utils.getCollectionVariablesByKey('testCaseId', this.collectionRunOptions.collection.variables),
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
        const name = this.getTestName(result);
        if (!name) {
            return;
        }
        const parentId = this.getCurrentSuiteTempId();
        const description = result.request.description && result.request.description.content;
        const codeRefTitle = `${this.collectionRunOptions.collection.name}/${result.item.name}`;
        const codeRef = utils.getCodeRef(this.collectionPath, codeRefTitle);
        const parameters = utils.getParameters(this.collectionRunOptions.iterationData, result.cursor.iteration);

        const testObj = this.client.startTestItem({
            name,
            type: 'TEST',
            description,
            codeRef,
            parameters,
            testCaseId: utils.getCollectionVariablesByKey('testCaseId', this.collectionRunOptions.environment.values),
            attributes: utils.getAttributes(this.collectionRunOptions.environment.values)
        },
        this.launchObj.tempId, parentId);

        testObj.promise.catch(errorHandler);

        this.sendRequestLogs(testObj.tempId, result.request);
        this.collectionMap.set(result.cursor.ref, {
            testId: testObj.tempId,
            requestId: result.cursor.httpRequestId || result.item.id,
            steps: [],
            status: utils.getCollectionVariablesByKey('status', this.collectionRunOptions.environment.values)
        });

        this.testLogs &&
            this.testLogs.forEach(log => this.logMessage(testObj.tempId, log.message, log.level, log.time));
        this.testLogs = [];

        this.launchLogs && this.launchLogs.forEach(log => this.sendLaunchLogMessage(log.message, log.level, log.time));
        this.launchLogs = null;

        this.suiteLogs && this.suiteLogs.forEach(log => this.logMessage(parentId, log.message, log.level, log.time));
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
                const status = utils.getStepParameterByPatterns(exec, pmVariablesStatusPatterns)[0];

                return Object.assign({},
                    stepName ? { stepName } : {},
                    testCaseId ? { testCaseId } : {},
                    status ? { status } : {});
            })
            .groupBySpecificField('stepName', ['testCaseId', 'status'])
            .forEach(stepInfoObj => {
                // Starts a new step for every test in a test script
                const stepName = stepInfoObj.stepName;
                const codeRefTitle = `${this.collectionRunOptions.collection.name}/${result.item.name}/${stepName}`;
                const parameters = utils.getParameters(this.collectionRunOptions.iterationData,
                    result.cursor.iteration);
                const codeRef = utils.getCodeRef(this.collectionPath, codeRefTitle);
                const stepObj = this.client.startTestItem(Object.assign({
                    name: stepName,
                    type: 'STEP',
                    parameters,
                    codeRef
                }, stepInfoObj.testCaseId ? { testCaseId: stepInfoObj.testCaseId } : {}),
                this.launchObj.tempId,
                testObj.testId);

                stepObj.promise.catch(errorHandler);

                testObj.steps.push({
                    stepId: stepObj.tempId,
                    name: stepName,
                    status: stepInfoObj.status
                });
            });
    }

    finishStep (error, testAssertion) {
        const testObj = this.collectionMap.get(testAssertion.cursor.ref);
        if (!testObj) {
            return;
        }
        const currentStepIndex = testObj.steps.findIndex(step => step.name === testAssertion.assertion);
        const currentStep = testObj.steps[currentStepIndex];
        testObj.steps.splice(currentStepIndex, 1);

        if (!currentStep) {
            return;
        }
        const actualError = error || testAssertion.error;
        if (actualError) {
            // Logs error message for the failed steps
            this.logMessage(currentStep.stepId, actualError.message, 'ERROR');
        }

        const additionalData = {};
        if (testAssertion.skipped) {
            additionalData.status = TestStatus.SKIPPED;
            if (this.options.skippedIssue === false) {
                additionalData.issue = { issueType: 'NOT_ISSUE' };
            }
        }

        this.client
            .finishTestItem(currentStep.stepId, {
                status: currentStep.status || (actualError ? TestStatus.FAILED : TestStatus.PASSED),
                ...additionalData
            })
            .promise.catch(errorHandler);
        this.collectionMap.set(testAssertion.cursor.ref, testObj);
    }

    finishAllSteps (err, testResult) {
        if (err) {
            throw err;
        }

        const testObj = this.collectionMap.get(testResult.cursor.ref);
        const testWithError = testResult.executions.find(item => item.error);

        if (testWithError) {
            // Fails all steps with the same error if there is an error in a test-script
            this.failAllSteps(testObj, testWithError.error.message);
        }
    }

    onRequest (error, result) {
        const testObj = this.collectionMap.get(result.cursor.ref);

        if (testObj) {
            this.collectionMap.set(result.cursor.ref, { ...testObj, response: result && result.response, error });
        }
    }

    finishTest (err, result) {
        if (err) {
            throw err;
        }

        const testObj = this.collectionMap.get(result.cursor.ref);
        if (!testObj) {
            return;
        }
        const status = testObj.status;

        if (testObj.error) {
            this.logMessage(testObj.testId, testObj.error.message, 'ERROR');

            this.client
                .finishTestItem(testObj.testId, {
                    status: status || TestStatus.FAILED
                })
                .promise.catch(errorHandler);

            return;
        }

        if (testObj.response) {
            this.sendResponseLogs(testObj.testId, testObj.response);
        }

        this.client
            .finishTestItem(testObj.testId, {
                status: status || TestStatus.PASSED
            })
            .promise.catch(errorHandler);
    }

    // Finishes suite
    onBeforeDone (err) {
        if (err) {
            throw err;
        }

        this.finishSuite();
        this.suitesInfoStack.pop();
    }

    // Finishes launch
    onDone (err, result) {
        const checkedFailures = result && result.run && result.run.failures && result.run.failures.length;
        if (err) {
            throw err;
        }
        const status = this.collectionRunOptions.collection &&
            utils.getCollectionVariablesByKey('launchStatus', this.collectionRunOptions.collection.variables);

        this.client
            .finishLaunch(this.launchObj.tempId, {
                status: status || (checkedFailures ? TestStatus.FAILED : TestStatus.PASSED)
            })
            .promise.catch(errorHandler);
    }

    // eslint-disable-next-line class-methods-use-this
    getTime () {
        return new Date().valueOf();
    }

    /**
     * Sends launch log message to RP using it's client.
     *
     * @param  {string} message value.
     * @param  {string} [level="INFO"] Log level.
     * @param  {number} time when the log was started.
     */
    sendLaunchLogMessage (message, level, time) {
        this.logMessage(this.launchObj.tempId, message, level, time);
    }

    /**
     * Sends log message to RP using it's client.
     *
     * @param  {string} id RP's item id.
     * @param  {string} value Message value.
     * @param  {string} [level="INFO"] Log level.
     * @param  {number} time when the log was started.
     */
    logMessage (id, value, level = 'INFO', time) {
        this.client
            .sendLog(id, {
                level: level,
                message: value,
                time: time || this.getTime()
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

    finishSuite () {
        const currentSuiteTempId = this.getCurrentSuiteTempId();
        const status = this.collectionRunOptions.collection &&
            utils.getCollectionVariablesByKey('status', this.collectionRunOptions.collection.variables);

        this.client
            .finishTestItem(currentSuiteTempId, { status })
            .promise.catch(errorHandler);
    }
}

module.exports = Reporter;
