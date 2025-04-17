import { HtmlReporterOptions, ReportData } from "./types.js";
declare class HtmlGenerator {
    private static LOG;
    static writeJson(jsonFile: string, stringified: string, reportOptions: HtmlReporterOptions, reportData: ReportData): void;
    static htmlOutput(reportOptions: HtmlReporterOptions, reportData: ReportData): void;
}
export default HtmlGenerator;
