/* eslint no-loop-func: 0 */

import "highlight.js";
import punycode from "punycode";
import "markdown-it";
import "underscore";

export let hljs = require("highlight.js");

md = require("markdown-it")({
  html: true,
  linkify: true,
  typographer: true,
  highlight: function (code) {
    return hljs.highlightAuto(code).value;
  },
  replaceLink: (link, env) => {
    const isImage = link.search(/([a-z\-_0-9\/\:\.]*\.(jpg|jpeg|png|gif))/i) > -1;
    const hasProtocol = link.search(/^http[s]?\:\/\//) > -1;
    let newLink = link;

    if (isImage && !hasProtocol) {
      newLink = `${env.rawUrl}/${env.branch}/${link}`;
    }

    return newLink;
  }
}).use(require("markdown-it-replace-link"));


//
// Meteor Methods
//
Meteor.methods({
  /**
   *  redoc/initRepoData
   *  fetch repo and toc fixtures from private/redoc.json
   *  @returns {undefined} returns
   */
  "redoc/initRepoData": function () {
    let initRepoData = EJSON.parse(Assets.getText(Meteor.settings.redoc.initRepoData || "redoc.json"));
    //
    // populate REPOS from settings
    //
    // for each Repo insert new repoData
    let existingRepos = ReDoc.Collections.Repos.find();
    if (existingRepos.count() === 0) {
      let Repos = initRepoData.repos
      Repos.forEach(function (repoItem) {
        ReDoc.Collections.Repos.insert(repoItem);
      });
    }

    // // populate TOC from settings
    // let TOC = ReDoc.Collections.TOC.find();
    // if (TOC.count() === 0) {
    //   let tocData = initRepoData.tocData;
    //   // if no tocData has been defined, we'll show this projects docs
    //   if (!tocData) {
    //     tocData = [{
    //       class: "guide-nav-item",
    //       alias: "intro",
    //       label: "Introduction",
    //       repo: "redoc",
    //       docPath: "README.md",
    //       default: true
    //     }];
    //   }
    //   // insert TOC fixtures
    //   tocData.forEach(function (tocItem) {
    //     ReDoc.Collections.TOC.insert(tocItem);
    //   });
    // }
    // Run once will get all repo data for current repos
      Meteor.call("redoc/getRepoData");
  },
  /**
   *  redoc/flushData
   *  fetch repo profile from github and store in RepoData collection
   *  @param {Boolean} option - if true we'll flush the existing repo records first
   *  @returns {undefined} returns
   */
  "redoc/flushData": function () {
    ReDoc.Collections.Repos.remove({});
    ReDoc.Collections.TOC.remove({});
    ReDoc.Collections.Docs.remove({});
    return Meteor.call("redoc/initRepoData");
  },
  /**
   *  redoc/getRepoData
   *  fetch repo profile from github and store in RepoData collection
   *
   *  @param {Boolean} option - if true we'll flush the existing repo records first
   *  @returns {undefined} returns
   */
  "redoc/getRepoData": function () {
    this.unblock();
    let repos = ReDoc.Collections.Repos.find().fetch();

    // gather multiple repo gh profiles
    for (let repo of repos) {
      let repoData;
      let releaseData;
      let branchesData;
      const apiUrl = repo.apiUrl || `https://api.github.com/repos/${repo.org}/${repo.repo}`; // should we maybe clean off prefixes?
      const rawUrl = repo.rawUrl || `https://raw.githubusercontent.com/${repo.org}/${repo.repo}`;

      // get repo urls ands stats
      repoData = Meteor.http.get(apiUrl + authString, {
        headers: {
          "User-Agent": "ReDoc/1.0"
        }
      });
      // fetch repo release data
      if (repoData && repoData.data) {
        // get updated release tags
        releaseData = Meteor.http.get(repoData.data.tags_url + authString, {
          headers: {
            "User-Agent": "ReDoc/1.0"
          }
        });
        // get release data
        if (repoData && releaseData) {
          // fetch repo branches data
          branchesData = Meteor.http.get(apiUrl + '/branches' + authString, {
            headers: {
              "User-Agent": "ReDoc/1.0"
            }
          });
          // get branches data
          if (repoData && branchesData) {
            ReDoc.Collections.Repos.upsert({
              _id: repo._id
            }, {
              $set: {
                repo: repo.repo,
                org: repo.org,
                label: repo.label || result.data.name,
                description: repo.description || repoData.data.description,
                data: repoData.data,
                apiUrl: apiUrl || repoData.data.url,
                rawUrl: rawUrl,
                contentsUrl: repoData.data.contents_url,
                release: releaseData.data,
                branches: branchesData.data,
                defaultBranch: repoData.data.default_branch
              }
            });

            // populate docset
            Meteor.call("redoc/getTOC", repo.repo);
          }
        }
      }
    } // end loop
  },
  /**
   *  redoc/getTOC
   *  fetch all docs for a specified repo / branch starting at path
   *  @param {String} repo - repo
   *  @param {String} fetchBranch - optional branch
   *  @param {String} path - optional path
   *  @returns {undefined} returns
   */
  "redoc/getTOC": function (repo, fetchBranch, path) {
    this.unblock();
    check(repo, String);
    check(fetchBranch,  Match.Optional(String, null));
    check(path,  Match.Optional(String, null));

    // get repo details
    const docRepo = ReDoc.Collections.Repos.findOne({
      repo: repo
    });

    // we need to have a repo
    if (!docRepo) {
      console.log(`redoc/getTOC: Failed to load repo data for ${repo}`);
      return false;
    }

    let branch;
    if (fetchBranch) {
      branch = fetchBranch;
    } else if (docRepo.branches.length > 0) {
      for (let branch of docRepo.branches) {
        Meteor.call("redoc/getTOC", repo, branch.name, path);
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
          tocItem = contentData.data[sortIndex];

          if (tocItem.type === 'file' && tocItem.path !== "README.md" && (tocItem.name.indexOf('.md') === -1 || tocItem.name === "README.md")) {
            continue;
          }

          if (matches = tocItem.name.match(/^(\d+)/)) {
            sort = s.toNumber(matches[1]);
          } else {
            sort = parseInt(sortIndex);
          }
          let tocData = {
            alias: s.slugify(s.strLeftBack(tocItem.path, '.md')),
            label: s.strLeftBack(tocItem.name, '.md'),
            repo: repo,
            branch: branch,
            sort: sort,
            docPath: encodeURIComponent(tocItem.path)
          };
          // First README.md, on root
          if (tocItem.path === "README.md") {
            tocData.alias = 'welcome';
            tocData.label = 'Welcome';
            tocData.sort = 0;
            tocData.default = true;
          }
          if (path) {
            tocData.parentPath = encodeURIComponent(path);
          }
          if (tocItem.type === 'dir') {
            tocData.docPath += '/README.md';
          }
          ReDoc.Collections.TOC.insert(tocData);
          if (tocItem.type === 'dir') {
            Meteor.call("redoc/getTOC", repo, branch, tocItem.path);
          }
        }
      }
    }
  },

  /**
   *  redoc/getDocs
   *  fetch all docs from TOC
   *  @param {String} repo - repo
   *  @param {String} branch - branch
   *  @returns {undefined} returns
   */
  "redoc/getDocsFromTOC": function (repo, branch) {
    this.unblock();
    check(repo, String);
    check(branch, String);


    const docRepo = ReDoc.Collections.Repos.findOne({
      repo: repo
    });

    const docTOC = ReDoc.Collections.TOC.find({
      repo: repo,
      branch: branch
    }).fetch();

    for (let tocItem of docTOC) {
      let docSourceUrl = `${docRepo.rawUrl}/${branch}/${tocItem.docPath}`;
      // lets fetch that Github repo
      Meteor.http.get(docSourceUrl, function (error, result) {
        if (error) return error;
        if (result.statusCode === 200) {
          // sensible defaults for every repo
          let docSet = ReDoc.getPathParams(docSourceUrl);
          docSet.docPage = docSourceUrl;
          docSet.docPath = tocItem.docPath;

          // if TOC has different alias, we'll use that
          if (tocItem.alias) {
            docSet.alias = tocItem.alias;
          }

          // pre-process documentation
          if (!result.content) {
            console.log(`redoc/getDocSet: Docset not found for ${docSet.docPath}.`);
            result.content = `# Not found. \n  ${docSourceUrl}`; // default not found, should replace with custom tpl.
          }
          docSet.docPageContent = result.content;
          docSet.docPageContentHTML = md.render(result.content, {
            rawUrl: docRepo.rawUrl,
            branch: branch
          });

          // insert new documentation into Cache
          return ReDoc.Collections.Docs.upsert({
            docPage: docSourceUrl
          }, {
            $set: docSet
          });
        }
      });
    }
  }
});
