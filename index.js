/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Probot} app
 */


module.exports = (app) => {
  // Your code here
  app.log.info("Yay, the app was loaded!");

  // ---------- ISSUE EVENTS ----------
  app.on("issues.opened", async (context) => {
    // only reply to issues from actual users and not the bot.
    if (!context.payload.comment.user.login.includes("simple-gh-app")) {
      const issueComment = context.issue({
        body: "Thanks for opening this issue!",
      });
      return context.octokit.issues.createComment(issueComment);
    }
  });

  app.on("issue_comment.created", async (context) => {
    // only reply to comments from actual users and not the bot.
    if (!context.payload.comment.user.login.includes("simple-gh-app")) {
      const issueComment = context.issue({
        body: "Thank you for the comment!",
      });
      return context.octokit.issues.createComment(issueComment);
    }
  });

  app.on("issue_comment.deleted", async (context) => {
    const issueComment = context.issue({
      body: "y u no like us?!?",
    });
    return context.octokit.issues.createComment(issueComment);
  });
  // ---------- END ISSUE EVENTS ----------

  // ---------- REPO EVENTS ----------
  app.on("repository.created", async (context) => {
    const repo = context.payload.repository;
    console.log(repo.description);
    if (repo.description == null) {
      const newIssue = context.issue({
        repo: repo.name,
        owner: repo.owner.login,
        title: "Warning: Repo missing description",
        body: "Company policy requires that all repos have a description."
      });
      return context.octokit.issues.create(newIssue)
    };
  });


  app.on("push", async (context) => {
    const repo = context.payload.repository;

    console.log(`The APP_ID is: ${process.env.APP_ID}`);

    // Fetch token
    const { createAppAuth } = require("@octokit/auth-app");
    const auth = createAppAuth({
      appId: process.env.APP_ID,
      privateKey: process.env.PRIVATE_KEY,
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      installationId: process.env.INSTALLATION_ID,
    });
    
    // Retrieve JSON Web Token (JWT) to authenticate as app
    const installationAuthentication = await auth({ type: "installation" });

    // Assemble the url
    const clone_url = `https://x-access-token:${installationAuthentication.token}@github.com/${repo.owner.name}/${repo.name}.git`;

    // Attempt to clone the repo
    console.log(`Attempting to clone repo: ${clone_url}`);

    const shell = require('shelljs')
    const path = '/workspaces/simple-gh-app/repo'
    shell.cd(path)
    shell.exec(`git clone ${clone_url}`)


    // if (repo.description == null) {
    //   const newIssue = context.issue({
    //     repo: repo.name,
    //     owner: repo.owner.login,
    //     title: "Warning: Repo missing description",
    //     body: "Company policy requires that all repos have a description."
    //   });
    //   return context.octokit.issues.create(newIssue)
    // };
  });
  // ---------- END REPO EVENTS ----------

  // ---------- ACTIONS EVENTS ----------
  app.on("workflow_run.completed", async (context) => {
    const run = context.payload.workflow_run;
    const owner = run.repository.owner.login;
    const repo = run.repository.name;
    const run_id = run.id;
    console.log(` Processing workflow run: ${run_id}`);

    timing = await context.octokit.request(`GET /repos/${owner}/${repo}/actions/runs/${run_id}/timing`, {
      owner: 'OWNER',
      repo: 'REPO',
      run_id: 'RUN_ID'
    })
    body = `| ${run.name} | ${repo} | ${owner} | ${timing.data.run_duration_ms/1000} |`

    loggingOwner = "jmassardo-test-org";
    loggingRepo = "app1";
    loggingIssueNumber = "1";
    today = new Date().toISOString().slice(0, 10);

    loggingIssue = await context.octokit.issues.get({
      owner: loggingOwner,
      repo: loggingRepo,
      issue_number: loggingIssueNumber,
    });

    loggingIssueBody = loggingIssue.data.body + "\r\n" + body;

    const Issue = context.issue({
      issue_number: loggingIssueNumber,
      repo: loggingRepo,
      owner: loggingOwner,
      title: `Action Usage Report. Updated: ${today}`,
      body: loggingIssueBody
    });
    return context.octokit.issues.update(Issue)

  });
  // ---------- END ACTIONS EVENTS ----------
};
