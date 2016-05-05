import { Meteor } from "meteor/meteor";
import s from "underscore.string";
import slugifyPath from "slugify-path";

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

        if (tocItem.type === 'dir') {
          global.TOCCounter++;
        }

        Meteor.defer(function() {

          let matches, sort;
          if (matches = tocItem.name.match(/^(\d+)/)) {
            sort = s.toNumber(matches[1]);
          } else {
            sort = parseInt(sortIndex);
          }
          let tocData = {
            updating: true,
            alias: slugifyPath(s.strLeftBack(tocItem.path, '.md').replace(/^(\d+)[ \.]+/, '')),
            label: s.strLeftBack(tocItem.name, '.md').replace(/^(\d+)[ \.]+/, ''),
            repo: repo,
            branch: branch,
            position: sort,
            docPath: encodeURIComponent(tocItem.path),
            slug: slugifyPath(tocItem.path.replace("README.md", ""), /^\d+(\.\d+)*\.?/),
            sha: tocItem.sha
          };
          // First README.md, on root
          if (tocItem.path === "README.md") {
            tocData.alias = 'welcome';
            tocData.label = 'Welcome';
            tocData.slug = 'welcome';
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
            tocData.position += 1000;
            tocData.docPath += '/README.md';
          }

          if (ReDoc.Collections.TOC.findOne({ slug: tocData.slug, sha: tocData.sha })) {
            ReDoc.Collections.TOC.update({ slug: tocData.slug, sha: tocData.sha }, { $set: { updated: true } });
          } else {
            ReDoc.Collections.TOC.upsert({ slug: tocData.slug }, { $set: tocData });
          }

          if (tocItem.type === 'dir') {
            Meteor.call("redoc/getRepoTOC", repo, branch, tocItem.path, (level || 1) + 1);
          }
        })
      }
    }
  }
  global.TOCCounter--;
  if (global.TOCCounter === 0) {
    Meteor.call("redoc/getDocSet", repo);
  }
}

export default getRepoToc;
