export class HtmlReporterOptions {
    constructor() {
        this.outputDir = 'reports/html-reports/';
        this.filename = 'report.html';
        this.reportTitle = 'Test Report Title';
        this.showInBrowser = false;
        this.collapseTests = false;
        this.collapseSuites = false;
        this.useOnAfterCommandForScreenshot = false;
        this.debug = false;
        this.browserName = "not specified";
        this.removeOutput = true;
        this.linkScreenshots = false;
        this.collapseTests = false;
        this.collapseSuites = false;
        this.produceJson = true;
        this.produceHtml = true;
    }
}
export class Metrics {
    constructor() {
        this.passed = 0;
        this.skipped = 0;
        this.failed = 0;
        this.duration = 0;
    }
}
export class InternalReportEvent {
    constructor(type, value) {
        this.type = type;
        this.value = value;
    }
}
export class ReportData {
    constructor(title, info, suites, metrics, reportFile, browserName) {
        this.info = info;
        this.metrics = metrics;
        this.title = title;
        this.suites = suites;
        this.reportFile = reportFile;
        this.browserName = browserName;
    }
}
