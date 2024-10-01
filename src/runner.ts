import { parseArgs } from "@std/cli/parse-args";
import { testSuite } from "./tests/suite.ts";
import { getTestResults, mainDescribe } from "./tests/utils/bdd/mod.ts";
import { searchSuite } from "./tests/search/search_suite.ts";

const { args } = Deno;
const parsedArgs = parseArgs(args, {
    boolean: ["help"],
    string: ["store"],
    alias: { h: "help", s: "store" },
});

if (parsedArgs.help) {
    console.log(`
Usage: deno run script.ts [options]

Options:
  -h, --help                Show this help message
  -s, --store [filename]    Store test results with http interactions in a JSON file (default: test-results.json)
`);
    Deno.exit(0);
}

const callback = () => {
    if (parsedArgs.store !== undefined) {
        const filename = parsedArgs.store || "test-results.json";
        Deno.writeTextFileSync(
            filename,
            JSON.stringify(getTestResults(), null, 4),
        );
        console.log(`Test results have been stored in ${filename}`);
    } else {
        console.log(
            "Test results were not stored. Use --store option to save results.",
        );
    }
};

//await mainDescribe("FHIR Restful Tests", async () => testSuite(callback));
await mainDescribe("FHIR Search Tests", async () => searchSuite(callback));
