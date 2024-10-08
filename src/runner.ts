import { parseArgs } from "@std/cli/parse-args";
import { testSuite } from "./tests/suite.ts";
import { getTestResults, mainDescribe } from "./tests/utils/bdd/mod.ts";
import { searchSuite } from "./tests/search/search_suite.ts";

const { args } = Deno;
const parsedArgs = parseArgs(args, {
    boolean: ["help"],
    string: ["store", "suite"],
    alias: { h: "help", s: "store", t: "suite" },
});

if (parsedArgs.help) {
    console.log(`
Usage: deno run script.ts [options]

Options:
  -h, --help                Show this help message
  -s, --store [filename]    Store test results with http interactions in a JSON file (default: test-results.json)
  -t, --suite [name]        Specify which test suite to run: 'search' or 'restful' (default: restful)
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

const suite = parsedArgs.suite?.toLowerCase() || "restful";

switch (suite) {
    case "search":
        await mainDescribe(
            "FHIR Search Tests",
            async () => searchSuite(callback),
        );
        break;
    case "restful":
        await mainDescribe(
            "FHIR Restful Tests",
            async () => testSuite(callback),
        );
        break;
    default:
        console.error(
            `Invalid suite specified: ${suite}. Please use 'search' or 'restful'.`,
        );
        Deno.exit(1);
}
