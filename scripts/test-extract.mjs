import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/extract.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const module = { exports: {} };
const mockRequire = (name) => {
  if (name === "./env") {
    return {
      AI_PROVIDER: "",
      GEMINI_API_KEY: "",
      GROQ_API_KEY: "",
      OPENROUTER_API_KEY: "",
    };
  }
  throw new Error(`Unexpected dependency: ${name}`);
};
vm.runInNewContext(outputText, {
  module,
  exports: module.exports,
  require: mockRequire,
  process: { env: {} },
});

const { heuristicParse, shouldUseAI, toIsoDate } = module.exports;
const cases = [
  {
    name: "explicit English title label",
    input: "Job Title: Senior Software Engineer\nCompany: Acme Technologies Ltd.",
    expected: "Senior Software Engineer",
  },
  {
    name: "urgent hiring headline",
    input: "URGENT HIRING FOR CUSTOMER SUPPORT EXECUTIVE\nApply before 30 November",
    expected: "CUSTOMER SUPPORT EXECUTIVE",
  },
  {
    name: "title among copied post text",
    input: "We are hiring now!\nData Entry Executive\nSalary: BDT 25,000\nApply today",
    expected: "Data Entry Executive",
  },
  {
    name: "Bengali title label",
    input: "পদের নাম: সহকারী শিক্ষক\nআবেদনের শেষ তারিখ ২০ নভেম্বর ২০২৬",
    expected: "সহকারী শিক্ষক",
  },
];

for (const testCase of cases) {
  const result = heuristicParse({ text: testCase.input, title: "LinkedIn" });
  assert.equal(result.title, testCase.expected, testCase.name);
}

const deadlineCases = [
  {
    name: "English labeled deadline",
    text: "Position: Software Engineer\nApplication Deadline: 30 November 2026",
    expected: "2026-11-30",
  },
  {
    name: "deadline on following line",
    text: "Last Date of Application\n05/11/2026",
    expected: "2026-11-05",
  },
  {
    name: "bare deadline label with ordinal date",
    text: "Deadline: 30th November, 2026",
    expected: "2026-11-30",
  },
  {
    name: "apply on or before phrase",
    text: "Please apply on or before 15 December 2026",
    expected: "2026-12-15",
  },
  {
    name: "last date to apply phrase",
    text: "Last date to apply: 10/12/2026",
    expected: "2026-12-10",
  },
  {
    name: "Bengali digits and month deadline",
    text: "আবেদনের শেষ তারিখ: ২০ নভেম্বর ২০২৬",
    expected: "2026-11-20",
  },
  {
    name: "Bengali numeric deadline",
    text: "আবেদন করার শেষ তারিখ ০৫/১১/২০২৬",
    expected: "2026-11-05",
  },
  {
    name: "Bengali last date label and Bengali year",
    text: "আবেদন শেষ তারিখঃ ১৫ ডিসেম্বর ২০২৬",
    expected: "2026-12-15",
  },
  {
    name: "Bengali month inflection",
    text: "আবেদনের শেষ তারিখ ২০ নভেম্বরের মধ্যে",
    expected: "2026-11-20",
  },
];

for (const testCase of deadlineCases) {
  const result = heuristicParse({ text: testCase.text });
  assert.equal(result.deadline, testCase.expected, testCase.name);
}

assert.equal(
  heuristicParse({ text: "Posted on 05/11/2026\nSoftware Engineer vacancy" }).deadline,
  "",
  "ignore unrelated post dates"
);
assert.equal(toIsoDate("31 February 2026"), null, "reject impossible calendar dates");

const completeLocalDraft = {
  title: "Senior Software Engineer",
  company: "Acme Ltd.",
  location: "Dhaka",
  salary: "",
  deadline: "",
  job_type: "",
  confidence: { title: 0.95, company: 0.95 },
};
assert.equal(
  shouldUseAI("Job Title: Senior Software Engineer\nCompany: Acme Ltd.\nLocation: Dhaka", completeLocalDraft),
  false,
  "skip AI for complete labeled text"
);
assert.equal(
  shouldUseAI("We are hiring someone, apply soon.", { ...completeLocalDraft, company: "", confidence: { title: 0, company: 0 } }),
  true,
  "use AI when local extraction is incomplete"
);

console.log(`Passed ${cases.length} title, ${deadlineCases.length + 2} deadline, and 2 AI-routing cases.`);

const urlSource = await readFile(new URL("../src/lib/jobUrl.ts", import.meta.url), "utf8");
const { outputText: urlOutput } = ts.transpileModule(urlSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const urlModule = { exports: {} };
vm.runInNewContext(urlOutput, { module: urlModule, exports: urlModule.exports, URL });
const {
  extractJobUrl,
  getApplicationHref,
  isValidApplicationLink,
} = urlModule.exports;
assert.equal(
  extractJobUrl("Role: Analyst\nApply here: https://jobs.example.com/apply?id=42."),
  "https://jobs.example.com/apply?id=42",
  "extract labeled apply URL and strip trailing punctuation"
);
assert.equal(
  extractJobUrl("See our page https://facebook.com/company and apply: https://careers.example.com/form"),
  "https://careers.example.com/form",
  "prefer application URL over social post URL"
);
assert.equal(extractJobUrl("No link in this post"), "", "empty when post contains no URL");
assert.equal(
  extractJobUrl(
    "🚨 We Are Hiring! | Join Bengol Bay Team 🚨\n" +
      "📩 Apply করুন:\nCV পাঠান : cv.jobersbd@gmail.com\n" +
      "আপনার career journey শুরু হোক Bengol Bay-এর সাথে।"
  ),
  "cv.jobersbd@gmail.com",
  "extract the Bengol Bay application email from the example post"
);
assert.equal(
  extractJobUrl("Apply here: https://jobs.example.com/apply\nEmail: cv@example.com"),
  "https://jobs.example.com/apply",
  "prefer a direct application URL over an email"
);
assert.equal(
  extractJobUrl("Apply করুন WhatsApp: ০১৭১২৩৪৫৬৭৮"),
  "০১৭১২৩৪৫৬৭৮",
  "extract Bengali-digit WhatsApp number"
);
assert.equal(
  getApplicationHref("cv.jobersbd@gmail.com"),
  "mailto:cv.jobersbd@gmail.com",
  "make an extracted email clickable"
);
assert.equal(
  getApplicationHref("01712345678"),
  "https://wa.me/8801712345678",
  "make a Bangladesh WhatsApp number clickable"
);
assert.equal(isValidApplicationLink("not a contact or URL"), false);
console.log("Passed 9 copied application-link/contact extraction cases.");

const formatSource = await readFile(new URL("../src/lib/format.ts", import.meta.url), "utf8");
const { outputText: formatOutput } = ts.transpileModule(formatSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const formatModule = { exports: {} };
vm.runInNewContext(formatOutput, {
  module: formatModule,
  exports: formatModule.exports,
});
const { daysUntil } = formatModule.exports;
const beforeDhakaMidnight = new Date("2026-11-19T19:41:00.000Z");
assert.equal(
  daysUntil("2026-11-19", beforeDhakaMidnight),
  -1,
  "a deadline on the previous Dhaka calendar day is overdue, not today"
);
assert.equal(
  daysUntil("2026-11-20", beforeDhakaMidnight),
  0,
  "a deadline on the current Dhaka calendar day is today"
);
assert.equal(daysUntil("2026-02-31", beforeDhakaMidnight), null, "reject impossible dates");
console.log("Passed 3 Bangladesh-time deadline countdown cases.");
