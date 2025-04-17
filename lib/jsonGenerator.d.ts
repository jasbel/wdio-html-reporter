import { HtmlReporterOptions, ReportData } from "./types.js";
declare class JsonGenerator {
    private static LOG;
    static writeJson(jsonFile: string, stringified: string, reportOptions: HtmlReporterOptions, reportData: ReportData): void;
    static serializeJson(jsonFile: string, reportOptions: HtmlReporterOptions, reportData: ReportData): any;
    static jsonOutput(reportOptions: HtmlReporterOptions, reportData: ReportData): any;
}
export default JsonGenerator;
