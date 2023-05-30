
## [5.0.3] - 2023-05-30
### Fixed
- [#82](https://github.com/reportportal/agent-js-postman/issues/82) Fix checks of a failure array.
- Security vulnerabilities
### Changed
- Package size reduced
- Actualized dependencies
### Added
- The ability to mark skipped tests as not to be investigated using the `skippedIssue` flag

## [5.0.2] - 2021-06-23
### Updated
- `@reportportal/client-javascript` version to the latest

### Added
- `restClientConfig` configuration property support (more details in [client-javascript](https://github.com/reportportal/client-javascript))

## [5.0.1] - 2021-05-18
### Fixed
- [#53](https://github.com/reportportal/agent-js-postman/issues/43) Fix working with CLI.
- [#31](https://github.com/reportportal/agent-js-postman/issues/31) Fix reporting attributes for launch with CLI.
- [#8](https://github.com/reportportal/agent-js-postman/issues/8) Fix error "Cannot read property 'requestError' of undefined".

## [5.0.0] - 2021-03-08
### Changed
- The architecture of the agent-js-postman's reporting

### Added
- Full compatibility with ReportPortal version 5.* (see [reportportal releases](https://github.com/reportportal/reportportal/releases))

### Deprecated
- Previous packages [newman-reporter-reportportal](https://www.npmjs.com/package/newman-reporter-reportportal) and [@reportportal/newman-reporter-reportportal](https://www.npmjs.com/package/@reportportal/newman-reporter-reportportal) will no longer supported by reportportal.io
