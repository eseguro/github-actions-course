const core = require('@actions/core');
const exec = require('@actions/exec');

function validateInput(input, regex) {
  // Use the provided regex for validation
  return regex.test(input);
}

async function run() {
  const branchRegex = /^[a-zA-Z0-9_\-\.\/]+$/
  const pathRegex = /^[a-zA-Z0-9_\-\/]+$/

  const baseBranch = core.getInput('base-branch', { required: false });
  const targetBranch = core.getInput('target-branch', { required: false });
  const workingDirectory = core.getInput('working-directory', { required: true });
  const debug = core.getBooleanInput('debug', { required: false });
  const ghToken = core.getInput('gh-token');

  core.setSecret(ghToken);

  if (!validateInput(baseBranch, branchRegex)) {
    core.setFailed(`Invalid base-branch ${baseBranch}`);
    return;
  }

  if (!validateInput(targetBranch, branchRegex)) {
    core.setFailed(`Invalid target-branch ${targetBranch}`);
    return;
  }

  if (!validateInput(workingDirectory, pathRegex)) {
    core.setFailed(`Invalid working-directory ${workingDirectory}`);
    return;
  }

  core.info(`base-branch ${baseBranch}`);
  core.info(`target-branch ${targetBranch}`);
  core.info(`working-directory ${workingDirectory}`);

  await exec.exec('npm update', [], {
    cwd: workingDir,
  });

  const gitStatus = await exec.getExecOutput(
    'git status -s package*.json',
    [],
    {
      cwd: workingDir,
    }
  );

  if (gitStatus.stdout.length > 0)
    core.info('[js-dependency-update] : There are updates available!');
  else
    core.info('[js-dependency-update] : No updates at this point in time.');

}

run();