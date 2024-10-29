import WDIOReporter, {
    AfterCommandArgs,
    CommandArgs,
    HookStats,
    RunnerStats,
    SuiteStats,
    TestStats
} from '@wdio/reporter'

import  {HtmlReporterOptions, InternalReportEvent, Metrics, ReportData} from "./types.js";
import dayjs from 'dayjs';
import ReportEvents from "@rpii/wdio-report-events";
import {String} from 'typescript-string-operations';
import ReportGenerator from "./reportGenerator.js";

import fs from 'fs-extra';
import path from 'path';
import logger from '@wdio/logger' ;

let reportProxy = new ReportEvents();
const timeFormat = "YYYY-MM-DDTHH:mm:ss.SSS[Z]";

export default class HtmlReporter extends WDIOReporter {
    options: HtmlReporterOptions;
    defaultTestIndent: string;
    metrics: Metrics;
    _indents: number;
    _suiteIndents: Record<string, number> = {};
    _suiteUids = new Map();
    _testUids = new Map();
    _specs = new Map();
    _currentSuiteUid: string;
    _currentTestUid: string;
    _currentCid: string;
    private LOG = logger('HtmlReporter') ;

    private _suites: SuiteStats[] = [] ;
    private reportGenerator?: ReportGenerator  ;


    constructor(options: HtmlReporterOptions) {
        super(Object.assign(
            {
                stdout: true,
                logFile: './logs/reporter.log',
                reporterSyncTimeout: 120000,
                reporterSyncInterval: 1000,
            }, options))
        let opts = new HtmlReporterOptions();
        //@ts-ignore
        opts.stdout = true,

        this.options = Object.assign(opts, options);
        const dir = this.options.outputDir + 'screenshots';

        fs.ensureDirSync(dir);
        this._indents = 0;
        this._suiteIndents = {};
        this.metrics = new Metrics();
        this.defaultTestIndent = '   ';
        this._currentSuiteUid = "suite uid";
        this._currentTestUid = "test uid";
        this._currentCid = "cid";
        reportProxy.connectMessageEvent(this.saveMessage.bind(this));
        reportProxy.connectScreenshotEvent(this.saveScreenshot.bind(this))
        reportProxy.connectVideoCaptureEvent(this.saveVideo.bind(this))
        this.reportGenerator = new ReportGenerator(this.options) ;

    }

    get isSynchronised() : boolean {

        //@ts-ignore
        let inSync = this.reportGenerator.isSynchronised()   ;
        this.LOG.debug("isSynchronized: " + inSync);
        return inSync ;
    }
    onRunnerStart(runner: RunnerStats) {
        this.LOG.info(String.format("onRunnerStart: {0}", runner.cid));
        //todo look at fix, not async safe. but one cid per report file
        this._currentCid = runner.cid;
        this.metrics.passed = 0;
        this.metrics.skipped = 0;
        this.metrics.failed = 0;
        this.metrics.start = dayjs().utc().format("YYYY-MM-DDTHH:mm:ss.SSS[Z]");
        this._specs.set(runner.cid, runner);
    }

    onSuiteStart(suite: SuiteStats) {
        this._suiteUids.set(suite.uid, suite);
        if (suite.type === 'feature') {
            this._indents = 0
            this._suiteIndents[suite.uid] = this._indents
        } else {
            this._suiteIndents[suite.uid] = ++this._indents
        }
        this._currentSuiteUid = suite.uid;
        suite.start = new Date();
        this.LOG.info(String.format("onSuiteStart: {0}:{1}", suite.cid, suite.uid));
    }

    onTestStart(theTest: TestStats) {
        this.LOG.info(String.format("onTestStart: {0}:{1}", theTest.cid, theTest.uid));
        this._currentTestUid = theTest.uid;
        //@ts-ignore
        theTest.events = [];
        //@ts-ignore
        theTest.errorIndex = 0;
        this._testUids.set(theTest.uid, theTest);
    }

    onTestPass(theTest: TestStats) {
        this.LOG.info(String.format("onTestPass: {0}:{1}", theTest.cid, theTest.uid));
        let test = this.getTest(theTest.uid);
        if (test) {
            this.moveErrorsToEvents(test);
        }
        this.metrics.passed++;
    }

    onTestSkip(test: TestStats) {
        this.LOG.info(String.format("onTestSkip: {0}:{1}", test.cid, test.uid));
        this.metrics.skipped++;
    }

    onTestFail(theTest: TestStats) {
        this.LOG.info(String.format("onTestFail: {0}:{1}", theTest.cid, theTest.uid));
        let test = this.getTest(theTest.uid);
        if (test) {
            this.moveErrorsToEvents(test);
        }
        this.metrics.failed++;
    }

    onTestEnd(theTest: TestStats) {
        this.LOG.info(String.format("onTestEnd: {0}:{1}", theTest.cid, theTest.uid));
        let test = this.getTest(theTest.uid);
        if (test) {
            this.moveErrorsToEvents(test);
        }
    }

    onHookStart(hook: HookStats) {
        this.LOG.info(String.format("onHookStart: {0}:{1}", hook.cid, hook.uid));
    }

    onHookEnd(hook: HookStats) {
        this.LOG.info(String.format("onHookEnd: {0}:{1}", hook.cid, hook.uid));
        if (hook.error) {
            this.metrics.failed++;
        }
    }

    onSuiteEnd(suite: SuiteStats) {
        this.LOG.info(String.format("onSuiteEnd: {0}:{1}", suite.cid, suite.uid));
        this._indents--;
        suite.end = new Date();
        this._suites.push(suite) ;
    }

    isScreenshotCommand(command: CommandArgs) {
        const isScreenshotEndpoint = /\/session\/[^/]*(\/element\/[^/]*)?\/screenshot/
        return (
            // WebDriver protocol
            (command.endpoint && isScreenshotEndpoint.test(command.endpoint)) ||
            // DevTools protocol
            command.command === 'takeScreenshot'
        );

    }

    //this is a hack to get around lack of onScreenshot event
    onAfterCommand(command: AfterCommandArgs) {
        if (this.options.useOnAfterCommandForScreenshot) {
            if (this.isScreenshotCommand(command) && command.result.value) {
                let timestamp = dayjs().format('YYYYMMDD-HHmmss.SSS');
                const filepath = path.join(this.options.outputDir, '/screenshots/', encodeURIComponent(this._currentCid), timestamp, this.options.filename + '.png');
                this.LOG.info(String.format("onAfterCommand: {0}:{1} taking screenshot {2}", this._currentCid, this._currentTestUid, filepath));
                fs.outputFileSync(filepath, Buffer.from(command.result.value, 'base64'));

                let test = this.getTest(this._currentTestUid);
                if (test) {
                    //@ts-ignore
                    test.events.push({type: 'screenshot', value: filepath});
                }
            }
        }
    }

    async onRunnerEnd(runner: RunnerStats) {
        this.LOG.info(String.format("onRunnerEnd: {0}", runner.cid));
        this.metrics.end = dayjs().utc().format();
        this.metrics.duration = runner._duration;
        let suites = this.filterChildSuites();
        let reportFile = path.join(process.cwd(), this.options.outputDir, encodeURIComponent(this._currentSuiteUid), encodeURIComponent(this._currentCid), this.options.filename);
        let reportData = new ReportData(
            this.options.reportTitle,
            runner,
            suites,
            this.metrics,
            reportFile,
            this.options.browserName);
       await this.reportGenerator?.createReport(reportData) ;

    }

    getSuite(uid: string | undefined): SuiteStats | undefined {
        if (this._suiteUids.has(uid)) {
            return this._suiteUids.get(uid);
        }
        return undefined;
    }

    removeSuite(uid: string | undefined) {
        if (uid && this._suiteUids.has(uid)) {
            this._suiteUids.delete(uid);
        }
    }

    getTest(uid: string): TestStats | undefined {
        if (uid && this._testUids.has(uid)) {
            return this._testUids.get(uid);
        }
    }

    //this is a hack.  we have to move all the things in test.errors before they get blown away
    moveErrorsToEvents(test: TestStats) {
        if (test.errors) {
            //@ts-ignore
            for (let i = test.errorIndex; i < test.errors.length; i++) {
                let errorObj = test.errors[i];
                let stack = test.errors[i].stack;
                if (stack && stack.includes("AssertionError")) {
                    errorObj = {
                        //@ts-ignore
                        message: test.errors[i].message.split("      \n").shift(),
                        stack: test.errors[i].stack,
                    };
                }
                //@ts-ignore
                test.events.push(new InternalReportEvent('Error', errorObj));
            }
            //@ts-ignore
            test.errorIndex = test.errors.length;
        }
    }

    saveScreenshot(filepath: string) {
        this.LOG.info(String.format("saveScreenshot: {0}", filepath));
        let test = this.getTest(this._currentTestUid);
        if (test) {
            this.moveErrorsToEvents(test);
            //@ts-ignore
            test.events.push(new InternalReportEvent('screenshot', filepath));
        }
    }

    saveVideo(filepath: string) {
        this.LOG.info(String.format("saveVideo: {0}", filepath));
        let test = this.getTest(this._currentTestUid);
        if (test) {
            this.moveErrorsToEvents(test);
            //@ts-ignore
            test.events.push(new InternalReportEvent('video-capture', filepath));
        }
    }
    saveMessage(message: string) {
        this.LOG.info(String.format("saveMessage: {0}", message));
        const test = this.getTest(this._currentTestUid);
        if (test) {
            this.moveErrorsToEvents(test);
            //@ts-ignore
            test.events.push({type: 'log', value: message});
        }
    }

    filterChildSuites() : SuiteStats[] {
        let suites = Array.from(this._suiteUids.values());
        for (let i = suites.length - 1; i >= 0; i--) {
            let parentSuite = suites[i];
            if (parentSuite.suites) {
                for (let k = parentSuite.suites.length - 1; k >= 0; k--) {
                    let suite = parentSuite.suites[k];
                    this.removeSuite(suite.uid);
                }
            }
        }
        return Array.from(this._suiteUids.values());
    }

    indent(uid: string) {
        const indents = this._suiteIndents[uid];
        return indents === 0 ? '' : Array(indents).join('    ');
    }


}

