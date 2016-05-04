import { check } from "meteor/check";
import initRepoData from "./initRepoData";
import processDoc from "./processDoc";

/**
 *  redoc/flushDocCache
 *  fetch repo profile from github and store in RepoData collection
 *  @param {Boolean} option - if true we'll flush the existing repo records first
 *  @returns {undefined} returns
 */
function flushDocCache() {
  ReDoc.Collections.TOC.update({}, { $unset: { updated: 1, updating: 1 } }, { multi: true });
  ReDoc.Collections.Repos.find().forEach(function(repo) {
    Meteor.call("redoc/getRepoTOC", repo.repo, Meteor.settings.public.redoc.branch || docRepo.defaultBranch);
  });

  ReDoc.Collections.TOC.update({ updated: { $ne: true } }, { $set: { expired: true } }, { multi: true });
}

/**
 *  getDoc
 *  fetch repo profile from github and store in RepoData collection
 *  @param {Object} doc - mongo style selector for the doc
 *  @returns {undefined} returns
 */
function getDoc(options) {
  check(options, Object);

  // get repo details
  const docRepo = ReDoc.Collections.Repos.findOne({
    repo: options.repo
  });

  // we need to have a repo
  if (!docRepo) {
    console.log(`redoc/getDocSet: Failed to load repo data for ${options.repo}`);
    return false;
  }

  // TOC item for this doc
  let tocItem = ReDoc.Collections.TOC.findOne({
    alias: options.alias,
    repo: options.repo
  });

  processDoc({
    branch: options.branch,
    repo: options.repo,
    alias: options.alias,
    slug: tocItem.slug,
    docRepo,
    tocItem,
    sha: tocItem.sha
  });
}

export default getDoc;
export { flushDocCache };
