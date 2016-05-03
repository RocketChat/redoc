import { Meteor } from "meteor/meteor";

/**
 *  redoc/getRepoTOC
 *  fetch all docs for a specified repo / branch starting at path
 *  @param {String} repo - repo
 *  @param {String} fetchBranch - optional branch
 *  @param {String} path - optional path
 *  @returns {undefined} returns
 **/
function getRepoToc(repo, fetchBranch, path, level) {
  this.unblock();
  check(repo, String);
  check(fetchBranch,  Match.Optional(String, null));
  check(path, Match.Optional(String, null));
  check(level, Match.Optional(Number, null));

  // get repo details
  const docRepo = ReDoc.Collections.Repos.findOne({
    repo: repo
  });

  // we need to have a repo
  if (!docRepo) {
    console.log(`redoc/getRepoTOC: Failed to load repo data for ${repo}`);
    return false;
  }

  let branch;
  if (fetchBranch) {
    branch = fetchBranch;
  } else if (docRepo.branches && docRepo.branches.length > 0) {
    for (let branch of docRepo.branches) {
      Meteor.call("redoc/getRepoTOC", repo, branch.name, path);
    }
  } else {
    branch = docRepo.defaultBranch || "master";
  }

  if (branch) {

    // assemble TOC
    let requestUrl = docRepo.contentsUrl.replace("{+path}", path ? encodeURIComponent(path) : "") + authString + '&ref=' + branch;
    let contentData = Meteor.http.get(requestUrl, {
      headers: {
        "User-Agent": "ReDoc/1.0"
      }
    });

    if (contentData && contentData.data) {
      for (let sortIndex in contentData.data) {
        let tocItem = contentData.data[sortIndex];

        if (tocItem.type === 'file' && tocItem.path !== "README.md" && (tocItem.name.indexOf('.md') === -1 || tocItem.name === "README.md")) {
          continue;
        }

        let matches, sort;
        if (matches = tocItem.name.match(/^(\d+)/)) {
          sort = s.toNumber(matches[1]);
        } else {
          sort = parseInt(sortIndex);
        }
        let tocData = {
          alias: s.slugify(s.strLeftBack(tocItem.path, '.md').replace(/^(\d+)[ \.]+/, '')),
          label: s.strLeftBack(tocItem.name, '.md').replace(/^(\d+)[ \.]+/, ''),
          repo: repo,
          branch: branch,
          position: sort,
          docPath: encodeURIComponent(tocItem.path)
        };
        // First README.md, on root
        if (tocItem.path === "README.md") {
          tocData.alias = 'welcome';
          tocData.label = 'Welcome';
          tocData.position = 0;
          tocData.default = true;
        }
        if (path) {
          tocData.class = tocItem.type === 'dir' ? 'guide-nav-item' : 'guide-sub-nav-item';
          tocData.parentPath = encodeURIComponent(path);
        } else {
          tocData.class = 'guide-nav-item';
        }
        if (level > 1) {
          tocData.class += ' level-' + level;
        }
        if (tocItem.type === 'dir') {
          tocData.docPath += '/README.md';
        }

        // check for parent doc for slug creation
        let slug = '';
        let slugParentDoc = {};
        if (tocData.parentPath) {
          slugParentDoc = ReDoc.Collections.TOC.findOne({ docPath: tocData.parentPath + '/README.md' });
          if (slugParentDoc) {
            slug = slugParentDoc.slug + '/' + s.slugify(tocData.label);
          }
        } else {
          if (Meteor.settings.public.redoc.repoInLinks) {
            slug = `${repo}/${branch}/${s.slugify(tocData.label)}`;
          } else {
            slug = `${branch}/${s.slugify(tocData.label)}`;
          }
        }
        ReDoc.Collections.TOC.insert(tocData);
        if (tocItem.type === 'dir') {
          Meteor.call("redoc/getRepoTOC", repo, branch, tocItem.path, (level || 1) + 1);
        }
      }
    }
  }
  Meteor.call("redoc/getRepoData");
}

export default getRepoToc;
