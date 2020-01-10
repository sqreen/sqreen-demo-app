# Change Log
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).


## [1.38.2]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* Sqreen will not attach current context to exceptions

### Security

N/A

## [1.38.1]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* Sqreen to report request when the only attack is a WAF one.

### Security

N/A


## [1.38.0]
### Added

N/A

### Changed

* WAF attacks are parsed to apply data scrubbing to it
* RASP request sanitization has been made faster

### Deprecated

N/A

### Removed

N/A

### Fixed

* Express endpoint detection works with sibling middlewares

### Security

N/A

## [1.37.2]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* Express endpoint detection works with sibling middlewares

### Security

N/A

## [1.37.1]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* in app WAF performance and safety

### Security

N/A

## [1.37.0]
### Added

N/A

### Changed

* vendored dependencies (Hoek, Boom, Wreck)
* Move from joi to joi-browser
* `url_decode` transformer is fail safe 

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.36.1]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* updated https-proxy-agent to version 3

### Security

N/A

## [1.36.0]
### Added

* url_decode transformer
* Reveal

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.35.1]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* call waf clearAll only at rule reload

### Security

N/A

## [1.35.0]
### Added

* Reporting libSqreen version properly

### Changed

* Updated libSqreen to 0.2.0
* place Sqreen Express middleware after body parser

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.34.0]
### Added

* support for in-app WAF on Musulc linuxes and Windows (64bits)

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* agent now reports errors when Request Record failed to close
* support for scoped packages in dependencies
* devDpendencies are taken in account ofr bundle hash

### Security

N/A

## [1.33.0]
### Added

* support for in-app WAF on Linux and MacOS through a native module

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.32.0]
### Added

* support for asynchronous callbacks
* support for monitoring only budget
* exception cap for monitoring rules
* track and collect Express endpoint
* add command to collect whole Express routing table
* agent sends default features at startup 

### Changed

* user agents protection do not change the regexps
* new format for data points
* metrics accept objects as key

### Deprecated

N/A

### Removed

N/A

### Fixed

* Sqreen URL in npm page

### Security

N/A


## [1.31.0]
### Added

N/A

### Changed

* by default on Node.js >= 8.2, agent will use async hooks
* always instrument http and https

### Deprecated

N/A

### Removed

N/A

### Fixed

* multiple minor bugs

### Security

N/A

## [1.30.3]
### Added

* users can ignore custom substring in first requires
* adding ts-node in first require

### Changed

* use paths of main module to detect project's root

### Deprecated

N/A

### Removed

N/A

### Fixed

* agent only collects HTTP end once
* fix extending security response
* type bugs

### Security

N/A

## [1.30.2]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* cleanup async hook stores when HTTP request is over

### Security

N/A

## [1.30.1]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* when using two listeners on server, bot attacks will be reported once
* remove interaction with cls-hooked
* fix minor bugs
* better auto-instrumentation of passport-local

### Security

N/A


## [1.30.1]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* when using two listeners on server, bot attacks will be reported once
* remove interaction with cls-hooked
* fix minor bugs
* better auto-instrumentation of passport-local

### Security

N/A

## [1.30.0]
### Added

* redirect_users security response
* health metric collections
* smart project root detection

### Changed

* README points to sqreen.com
* login retries are longer and backend's 401 trigger re-login
* perf cap and perf metric collection v2

### Deprecated

N/A

### Removed

N/A

### Fixed

* IP address will not be found in "port" field anymore
* prevent errors on some rules outputs

### Security

N/A

## [1.29.5]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* agent does not crash when having multiple listeners on HTTP server and blocking an IP

### Security

N/A

## [1.29.4]
### Added

* configurable scrubbing of values before reporting to Sqreen

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* first login instrumentation

### Security

N/A

## [1.29.3]
### Added

* collect if user has enabled async_hook-based instrumentation for debug purpose

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.29.2]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* radix tree access are made in try catch block

### Security

N/A

## [1.29.0]
### Added

* support for organization token

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* agent will not send performance metric when disabled

### Security

N/A

## [1.28.2]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* better handling of cleanup when blocking an injection in Knexjs 

### Security

N/A

## [1.28.1]
### Added

* debug process cwd + dependencies dir

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* when specifying app root, package.json will be looked-up from this root

### Security

N/A

## [1.28.0]
### Added

* ENV variable to prevent first-requires logs
* Request record to contain HTTP response details

### Changed

* Blacklist native callback using radix tree
* Radix tress have limited size

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.27.3]
### Added

N/A

### Changed

* js callbacks can be without budget

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.27.2]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* removed memory leak due to knex

### Security

N/A

## [1.27.1]
### Added

* Support for Node.js 11

### Changed

* Dependencies hash is built form package.json

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.27.0]
### Added

* Perf monitoring for agent

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.26.2]
### Added

N/A

### Changed

* In security responses, IP address management has moved to a radix tree

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.26.1]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* Sqreen will not use vm timeout with floats

### Security

N/A

## [1.26.0]
### Added

* Sqreen to not collect body by default when tracking event

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.25.2]
### Added

N/A

### Changed

* unicity in collector is not only based on ref anymore

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A


## [1.25.0]
### Added

N/A

### Changed

* unicity in collector is not only based on ref anymore

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A


## [1.25.0]
### Added

* binary `sqreen-check-network` to check if Sqreen servers are reachable

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.24.1]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* disabling Sqreen removes all current security responses
* fix signature normalization algorithm

### Security

N/A

## [1.24.0]
### Added

* pmx module can now be required before Sqreen without triggering warnings
* performance cap features to limit the impact of Sqreen on an application

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* instrumentation was broken and has been fixed on Windows

### Security

N/A

## [1.23.0]
### Added

* Add callback to collect config
* Add logs to track tracked events
* Can patch methods on global classes

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* pre-condition were broken

### Security

N/A

## [1.22.0]
### Added

* dotenv added to whitelist of modules that can be required before Sqreen
* change request_params binding accessor
* add SQREEN_APP_ROOT environment variable to declare project root directory

### Changed

* try multiple encodings when reading config file

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.21.0]
### Added

* Sqreen to collect request parameters
* Redacting sensitive data

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.20.2]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* When a request is explicitly given to auth_track, it is taken in account
* ShellEnv atom exception fixed

### Security

N/A


## [1.20.1]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* "block user" will display block user events in dashboard

### Security

N/A

## [1.20.0]
### Added

* block users security response
* dash message will be shown in dashboard if module is not required first

### Changed

* added a few try-catch

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.19.0]
### Added

* support for knexjs

### Changed

* added a few try-catch

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.18.5]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* patches use the current instance of the CLS in all cases

### Security

N/A

## [1.18.4]
### Added

N/A

### Changed

* link to doc in readme

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.18.3]
### Added

* http and https are loaded before other pieces of code to ensure no tempering.

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A


## [1.18.2]
### Added

N/A

### Changed

* Agent will not call process.exit when SIGINT happens

### Deprecated

N/A

### Removed

N/A

### Fixed

* Request record will use array for headers

### Security

N/A

## [1.18.1]
### Added

N/A

### Changed

* redirection without urls will be ignored

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.18.0]
### Added

N/A

### Changed

* stacktrace collection is a command now
* performance update in js callbacks by reusing script
* update Hoek
* track SDK has 16 claims limitation

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.17.1]
### Added

N/A

### Changed

* in Request Record, SDK events are observations


### Deprecated

N/A

### Removed

N/A

### Fixed

* remove logs that should not be there

### Security

N/A

## [1.17.0]
### Added

* support for `ip_header` config
* add tracking SDK and security responses
* experimental use of Async Hooks to track context behind a flag

### Changed

* copyrights are up to date


### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.16.0]
### Added

* HTTP proxy support

### Changed

* removed Sqreen from stacktrace at module loading
* CRS max length support
* whitelist pm2 in require checks
* collect content-type header in case of attacks


### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.15.0]
### Added

* signature control from BE
* handle global methods

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.14.2]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* fix potential cleanup failure of Request Records

### Security

N/A

## [1.14.1]
### Added

* SDK to identify methods
* Request record reporting system

### Changed

* require race fixed in xss

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.13.0]
### Added

* Reveal support for XSS in express

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A


## [1.12.0]
### Added

* Reveal support

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* Error message when login fails

### Security

N/A

## [1.11.0]
### Added

N/A

### Changed

* Agent to use a Sqreen user agent to connect to BE
* IP addresses detection updated
* Node.js 9 added to build targets
* Logo changes

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.10.4]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* ensure no infinite recursions when packages are installed with cnpm

### Security

N/A

## [1.10.3]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* attachValue cb checks that context exists before running

### Security

N/A

## [1.10.2]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* insert sqreen header sooner in request lifecycle

### Security

N/A

## [1.10.1]
### Added

* CRS patterns min_length control

### Changed

* requests are cleaned at response time
* reduced usage of setImmediates

### Fixed

* CLS-patched modules are patchable

## [1.10.0]
### Added

* When Sqreen is not the first required module, a warning message will be displayed in the error output

### Changed

* hook detection uses `hasOwnProperty`

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.9.9]
### Added

N/A

### Changed

* js rules in strict mode
* better sqreen debug logs

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.9.8]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* add forgotten promise rejection catch

### Security

N/A

## [1.9.7]
### Added

N/A

### Changed

* safeguard at specific hooks

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.9.6]
### Added

N/A

### Changed

* lazy binding accessor

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.9.5]
### Added

N/A

### Changed

* lazy build of rules callbacks
* moved debug collection of dependencies to command

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A


## [1.9.4]
### Added

N/A

### Changed

* prevent errors on tentative of pathcing unexisting packages

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.9.3]
### Added

N/A

### Changed

* prevent errors on tentative of pathcing unexisting packages

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.9.3]
### Added

N/A

### Changed

* prevent errors on tentative of pathcing unexisting packages

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.9.2]
### Added

N/A

### Changed

* ip address detection behavior

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.9.1]
### Added

N/A

### Changed

* login v1.5

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.8.8]
### Added

N/A

### Changed

* reduce memory/cpu footprint on login due to packages collection

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.8.7]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* first attacks are pushed to BE immediately

### Security

N/A

## [1.8.6]
### Added

* filtered_request_params BA

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.8.5]
### Added

N/A

### Changed

* better handling of network errors
* node_modules/.bin rpertory not explored at login

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.8.4]
### Added

N/A

### Changed

* Null rulespack do not fire errors anymore

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.8.3]
### Added

N/A

### Changed

* Express middleware to be injected by overriding lazyrouter and not init

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.8.2]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

*on-request hook is blocking when skipped

### Security

N/A

## [1.8.1]
### Added

* IP blacklist support
* onrequest http/https hook after cls init

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.8.0]
### Added

* IP whitelist support

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* reduced continuity loss in passport-local

### Security

N/A

## [1.7.10]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* express CRS support when no call to `use` is made
* referer header captured in attacks

### Security

N/A

## [1.7.9]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* passport-SAML auto hook strategy to handle mongoose objects

### Security

N/A

## [1.7.8]
### Added

* '1' is allowed for env var

### Changed

* escape only certain xss

### Deprecated

N/A

### Removed

N/A

### Fixed

* tests in node 8

### Security

N/A

## [1.7.7]
### Added

* SQREEN_DISABLE env to disable Sqreen

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* tests in node 8

### Security

N/A

## [1.7.6]
SKIPPED

## [1.7.5]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* agent version not to be tempered with

### Security

N/A

## [1.7.4]
### Added

* hapijs ext points added for custom ruling

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A`

## [1.7.3]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* whitepathed attacks are whitepathed

### Security

N/A

## [1.7.2]
### Added

N/A

### Changed

* remove an unhandled promise rejection

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.7.1]
### Added

* safeguard to ensure remote ip is a string in utils

### Changed

* README.md

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.7.0]
### Added

* attack page and redirection behavior

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* Pre-conditions updates

### Security

N/A

## [1.6.0]
### Added

* CRS support
* request_params BA

### Changed

* beats force metric collection

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.5.0]
### Added

* pre-conditions support
* BindingAccessorCounter cb 

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.4.8]
### Added

N/A

### Changed

* updated wreck to 12.

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.4.7]
### Added

* https support

### Changed

* login metric name

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A


## [1.4.6]
### Added

N/A

### Changed

* rename hook files names to prevent NR fake warning

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.4.5]
### Added

N/A

### Changed

* reduced error logs

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A


## [1.4.4]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* batch is overridden when an event kind is met for the first time

### Security

N/A

## [1.4.3]
### Added

N/A

### Changed

* change logs

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.4.2]
### Added

N/A

### Changed

* fast logout when NODE_ENV indicates dev

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.4.1]
### Added

* `#.cwd` in accessors

### Changed

* allow all chars in pkg names

### Deprecated

N/A

### Removed

N/A

### Fixed

* login features issue

### Security

N/A

## [1.4.0]
### Added

* ensure preventaion of double call on res.write
* shellshock protection

### Changed

* remove patching prevention on native code

### Deprecated

N/A

### Removed

* lookup space cache removed to prevent reducing the attack space size

### Fixed

* matcher case_sensitive management

### Security

N/A


## [1.3.5]
### Added

* count status code of dropped requests

### Changed

* do not use a shadow cache for non native modules
* remove blind patching

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A


## [1.3.4]
### Added

* require-dir excluded from patching

### Changed

* do not cache excluded modules

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.3.3]
### Added

* include cls-bluebird

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.3.2]
### Added

* Async callback continuity

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.3.1]
### Added

N/A

### Changed

* inlined @vdeturckheim/asjson

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [1.3.0]
### Added

* support for passport-saml

### Changed

* udpate lab

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A


## [1.2.1]
### Added

* request tracking with uuid v4

### Changed

* updated warning when no config is found

### Deprecated

N/A

### Removed

N/A

### Fixed

* attack artifacts should be compliant with BE

### Security

N/A

## [1.2.0]
### Added

* initial features
* (not public) signup sdk part 1

### Changed

* split context in CLS thrown errors
* hard coded express continuity

### Deprecated

N/A

### Removed

* opbeat warnings

### Fixed

N/A

### Security

N/A

## [1.1.0]
### Added

* force logout command

### Changed

* npm keywords
* update README

### Deprecated

N/A

### Removed

N/A

### Fixed

* callback call count fixed (bad rulespack, no default enabled)

### Security

N/A

## [1.0.0]
DEC 2016
### Added

N/A

### Changed

* custom management of response.end to prevent overrides impact
* binding accessor will give exceptions
* remove feature on metric delay

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [0.12.1]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* SDK auth fail are not converted to success anymore

### Security

N/A

## [0.12.0]
### Added

N/A

### Changed

* metrics key are not a string in a string
* versionCheck metric is better
* use login/heartbeat API v1
* sqreen does not block all depreciation messages anymore

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A
### Security

N/A

## [0.11.3]
### Added

* Continuity relays on q promises
* Better reports if a js cb fails
* Metric flush on logout
* Better behavior when NR is present

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A
### Security

N/A

## [0.11.2]
### Added

* Continuity relays on passport

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A
### Security

N/A

## [0.11.1]
### Added

* N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* Renamed instrumentation/director for preventing NR from thinking that npm package director has been already required.

### Security

N/A

## [0.11.0]
### Added

* N/A

### Changed

* major perf boost
* dynamic patching enabled

### Deprecated

N/A

### Removed

N/A

### Fixed

* call count disabled on default

### Security

N/A

## [0.10.0]
### Added

* auth SDK ([see Documentation](http://doc.sqreen.io/v1.1/docs/nodejs-agent-users-monitoring))

### Changed

* perf boost

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [0.9.0]
### Added

* requests are given a sqreen uuid

### Changed

* perf boost
* continuity CB tries to bind emitters

### Deprecated

N/A

### Removed

N/A

### Fixed

* newrelic bump
* rule version check removed
* reporting payload formalized

### Security

N/A

## [0.8.9]
### Added

N/A

### Changed

* rulespack acceptation is atomic
* ip handling is changed
* default passport local export is patched

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [0.8.8]
### Added

N/A

### Changed

* patcher is paranoid

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [0.8.7]
### Added

N/A

### Changed

* patcher refuses null objects

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [0.8.6]
### Added

N/A

### Changed

* smarter patcher to detect calls to `new`

### Deprecated

N/A

### Removed

N/A

### Fixed

* ip field in attacks

### Security

N/A

## [0.8.5]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* headers field in attacks

### Security

N/A

## [0.8.4]
### Added

* better client's ip handling

### Changed

* login is async

### Deprecated

N/A

### Removed

N/A

### Fixed

* dep name issue

### Security

N/A

## [0.8.3]
### Added

N/A

### Changed

* do not trigger getters at patching

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [0.8.2]
### Added

* catch all excpetion report promises
* safer for weird process objects

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* kue compatibility

### Security

N/A

## [0.8.1]
### Added

* opbeat warnings

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [0.8.0]
### Added

* wl features (see #120)
* call count

### Changed

* better ip address detection
* better memory handling

### Deprecated

N/A

### Removed

N/A

### Fixed

* enhance performances of patcher

### Security

N/A

## [0.7.7]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* enhance performances of patcher

### Security

N/A

## [0.7.6]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* Cb error to be Errors

### Security

N/A

## [0.7.5]
### Added

N/A

### Changed

* Agent does not start with node < 4
* Better choice of client ip

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A


## [0.7.4]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* fix binding accessor regex
* fix batch event type case

### Security

N/A


## [0.7.2]
### Added

* place log prevention on some patched modules

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [0.7.1]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* Shadow shimming artifacts

### Security

N/A

## [0.7.0]
### Added

* update to wreck 10
* feature change supported
* batch mode exist

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [0.6.7]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* patcher selector is more subtile

### Security

N/A

## [0.6.6]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* always provide ip in auth metrics

### Security

N/A

## [0.6.5]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* ensure header insertion is possible before doing it
* generate reporting stacktraces before postponing report

### Security

N/A

## [0.6.3]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* fix rule parsing in user-agent regexp

### Security

N/A

## [0.6.2]
### Added

* scanning bot support 

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [0.6.1]
### Added

N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* dropRequest will not prevent witting headers on dropped requests

### Security

N/A

## [0.6.0]
### Added
* metrics support
* passport-local & passport-http(basic) support
* hapi request support (no auth yet)
* http code tracking
* xss (jade) callbacks

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [0.5.4]
### Added
* Support for de-instrumentation
* Better configuration parsing
* Remove all callbacks is possible
* client's ip accessible to callbacks

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* logging to file works

### Security

N/A

## [0.4.3]
### Added
N/A

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

* tapable non instrumented for now
* check that an object is expendable before flagging it as sqreen constructed

### Security

N/A

## [0.4.2]
### Added
* http retry on login
* http timeout increased

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [0.4.0]
### Added
* backend reporting is more accurate
* block: false option enforced

### Changed

N/A

### Deprecated

N/A

### Removed

N/A

### Fixed

N/A

### Security

N/A

## [0.3.3] 2016-AUG-9
### Added
* login/logout to Sqreen backend
* basic configuration from file or ENV
* instrumentation of exported methods from third party packages
* execution of callbacks
* execution of rule-defined callbacks
* rule acceptation and enforcements
* attack report to Sqreen backend

### Changed

N/A: first public version

### Deprecated

N/A: first public version

### Removed

N/A: first public version

### Fixed

N/A: first public version

### Security

N/A: first public version
