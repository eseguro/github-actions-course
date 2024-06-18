const core = require('@actions/core');
const exec = require('@actions/exec');
const github = require('@actions/github');

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

  const commonExecOpts = {
    cwd: workingDirectory,
  };

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
    ...commonExecOpts,
  });

  const gitStatus = await exec.getExecOutput(
    'git status -s package*.json',
    [],
    {
      ...commonExecOpts,
    });

  if (gitStatus.stdout.length > 0) {
    core.info('[js-dependency-update] : There are updates available!');
    core.setOutput('updates-available', true);
    
    await exec.exec(`git config --global user.name "gh-automation"`);
    await exec.exec(`git config --global user.email "gh-automation@email.com"`);
    await exec.exec(`git checkout -b ${targetBranch}`, [], {
      ...commonExecOpts,
    });
    await exec.exec(`git add package.json package-lock.json`, [], {
      ...commonExecOpts,
    });
    await exec.exec(`git commit -m "chore: update dependencies`, [], {
      ...commonExecOpts,
    });
    await exec.exec(`git push -u origin ${targetBranch} --force`, [], {
      ...commonExecOpts,
    });

    const octokit = github.getOctokit(ghToken);

    try {
      await octokit.rest.pulls.create({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        title: `Update NPM dependencies`,
        body: `This pull request updates NPM packages`,
        base: baseBranch,
        head: targetBranch
      });
    } catch (e) {
      core.error('[js-dependency-update] : Something went wrong while creating the PR. Check logs below.')
      core.setFailed(e.message);
      core.error(e);
    }
  } else {
    core.info('[js-dependency-update] : No updates at this point in time.');
    core.setOutput('updates-available', false);
  }

}

run();