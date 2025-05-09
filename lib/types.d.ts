import type { SuiteStats, RunnerStats } from "@wdio/reporter";
import type { Reporters } from '@wdio/types';
export declare class HtmlReporterOptions implements Reporters.Options {
    outputDir: string;
    filename: string;
    reportTitle: string;
    showInBrowser?: boolean | undefined;
    collapseTests?: boolean;
    collapseSuites?: boolean;
    useOnAfterCommandForScreenshot?: boolean | undefined;
    debug?: boolean | undefined;
    browserName: string;
    removeOutput?: boolean | undefined;
    linkScreenshots?: boolean;
    produceJson?: boolean | undefined;
    produceHtml?: boolean | undefined;
    constructor();
}
export declare class Metrics {
    passed: number;
    skipped: number;
    failed: number;
    start?: string;
    end?: string;
    duration: number;
    constructor();
}
export declare class InternalReportEvent {
    type: string;
    value: any;
    constructor(type: string, value: any);
}
export declare class ReportData {
    info: RunnerStats;
    metrics: Metrics;
    suites: SuiteStats[];
    title: string;
    reportFile: string;
    browserName: string;
    constructor(title: string, info: RunnerStats, suites: SuiteStats[], metrics: Metrics, reportFile: string, browserName: string);
}
