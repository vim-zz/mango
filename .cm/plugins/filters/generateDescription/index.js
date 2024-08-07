// Parse commit messages
function parseCommitMessages(messages) {
  const commitTypes = {
    feat: [],
    fix: [],
    chore: [],
    docs: [],
    style: [],
    refactor: [],
    perf: [],
    test: [],
    build: [],
    ci: [],
    other: [],
  };

  messages
    .filter((message) => !message.includes("Merge branch"))
    .forEach((message) => {
      const match = message.match(
        /^(feat|fix|chore|docs|style|refactor|perf|test|build|ci):/,
      );
      if (match) {
        commitTypes[match[1]].push(message.replace(`${match[1]}:`, "").trim());
      } else {
        commitTypes.other.push(message);
      }
    });

  return commitTypes;
}

// Format commit section
function formatCommitSection(type, commits) {
  return commits.length
    ? `> - **${type}:**\n${commits.map((msg) => `>     - ${msg}`).join("\n")}\n`
    : "";
}

function containsNewTests(files) {
  const testPattern = /(test_|spec_|__tests__|_test|_tests|\.test|\.spec)/i;
  const testDirectoryPattern = /[\\/]?(tests|test|__tests__)[\\/]/i;
  const testKeywords = /describe\(|it\(|test\(|expect\(/i; // Common test keywords for JavaScript

  for (const file of files) {
    const { new_file, diff, new_content } = file;

    // Check if the filename indicates it's a test file
    if (testPattern.test(new_file) || testDirectoryPattern.test(new_file)) {
      return true;
    }

    // Check if the diff or new content contains test-related code
    if (testKeywords.test(diff) || testKeywords.test(new_content)) {
      return true;
    }
  }

  return false;
}

function extractUserAdditions(description) {
  const match = description.match(
    /<!--- user additions start --->([\s\S]*?)<!--- user additions end --->/,
  );
  return match ? match[1].trim() : description.trim();
}

// Generate PR description
async function generateDescription(branch, pr, repo, source, callback) {
  if (process.env[__filename]) {
    return callback(null, process.env[__filename]);
  }

  const commitTypes = parseCommitMessages(branch.commits.messages);

  const addTests = containsNewTests(source.diff.files) ? "X" : " ";
  const codeApproved = pr.approvals > 0 ? "X" : " ";

  const changes = Object.entries(commitTypes)
    .map(([type, commits]) => formatCommitSection(type, commits))
    .join("");
  const changesWithoutLastBr = changes.slice(0, -1);
  const userAdditions = extractUserAdditions(pr.description);

  const result = `
<!--- user additions start --->
${userAdditions}
<!--- user additions end --->


**PR description below is managed by gitStream**
<!--- Auto-generated by gitStream--->
> #### Commits Summary
> This pull request includes the following changes:
${changesWithoutLastBr}
> #### Checklist
> - [${addTests}] Add tests
> - [${codeApproved}] Code Reviewed and approved
<!--- Auto-generated by gitStream end --->
`;

  process.env[__filename] = result.split("\n").join("\n            ");
  return callback(null, process.env[__filename]);
}

module.exports = { filter: generateDescription, async: true };
