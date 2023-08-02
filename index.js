const axios = require('axios')

const core = require('@actions/core')
const github = require('@actions/github')

const webhook = core.getInput('webhook')

if (github.context.eventName !== 'push') {
  core.setFailed('This action only works on push events.')
}

if (!/https:\/\/discord(app|)\.com\/api\/webhooks\/\d+?\/.+/i.exec(webhook)) {
  core.setFailed('The given discord webhook url is invalid. Please ensure you give a **full** url that start with "https://discordapp.com/api/webhooks"')
}

const shortSha = (i) => i.substr(0, 6)

const escapeMd = (str) => str.replace(/([\[\]\\`\(\)])/g, '\\$1')

const { payload: githubPayload } = github.context

const commits = githubPayload.commits.map(i => `- [\`[${shortSha(i.id)}]\`](${i.url}) ${escapeMd(i.message)} - by ${i.author.name}`)

if (!commits.length) {
  return
}

const beforeSha = githubPayload.before
const afterSha = githubPayload.after
const compareUrl = `${githubPayload.repository.url}/compare/${beforeSha}...${afterSha}`

function embedConstructor(arr, limit = 4096) {
  const result = [];
  let currentChunk = [];

  for (let i = 0; i < arr.length; i++) {
    const currentString = arr[i];

    if (currentChunk.join("\n").length + currentString.length > limit) {
      result.push(currentChunk.join("\n"));
      currentChunk = [];
    }

    currentChunk.push(currentString);
  }

  if (currentChunk.length > 0) {
    result.push(currentChunk.join("\n"));
  }

  return result.map((i, index) => ({
    title: index === 0 ? core.getInput('message-title') || 'Commits received' : '',
    description: i
  }));
}

const payload = {
  content: '',
  embeds: embedConstructor([`[\`\[${shortSha(beforeSha)}...${shortSha(afterSha)}\]\`](${compareUrl})\n`].concat(commits)),
}

axios
  .post(webhook, payload)
  .then((res) => {
    core.setOutput('result', 'Webhook sent')
  })
  .catch((err) => {
    core.setFailed(`Post to webhook failed, ${err}`)
  })
