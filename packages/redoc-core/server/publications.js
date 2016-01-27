// Meteor.publish("Docs", function () {
//   return ReDoc.Collections.Docs.find();
// });

Meteor.publish("TOC", function () {
  return ReDoc.Collections.TOC.find();
});

Meteor.publish("Repos", function () {
  return ReDoc.Collections.Repos.find();
});

/*
 *  CacheDocs returns all docs, filter by branch
 *  checks if request docs exists first then pulls new data if there is none
 */
Meteor.publish("CacheDocs", function (params) {
  // some minor validation
  check(params, {
    repo: Match.Optional(String, null),
    branch: Match.Optional(String, null),
    alias: Match.Optional(String, null)
  });

  // if we have no params, we're the root document
  if (Object.keys(params).length === 0) {
    let defaultDoc = ReDoc.Collections.TOC.findOne({ default: true });
    if (defaultDoc) {
      params.repo = defaultDoc.repo;
      params.branch = defaultDoc.branch || Meteor.settings.public.redoc.branch || "master";
      params.alias = defaultDoc.alias;
    }
  }

  if (!params.branch) {
    params.branch = Meteor.settings.public.redoc.branch || "master";
  }

  // get repo details
  let docRepo = ReDoc.Collections.Repos.findOne({
    repo: params.repo
  });

  // default doc repo
  if (!docRepo) {
    docRepo = ReDoc.Collections.Repos.findOne();
  }
  if (!docRepo) {
    console.log("CacheDocs Publication: Failed to load repo data for document cache request", params);
    return this.ready();
  }

  if (!params.repo) {
    params.repo = docRepo.repo;
  }

  // assemble TOC
  let docTOC = ReDoc.Collections.TOC.findOne({
    alias: params.alias,
    repo: params.repo
  });

  // find specific branch in Docs
  let cacheDoc = ReDoc.Collections.Docs.find({
    repo: params.repo,
    branch: params.branch,
    alias: params.alias
  });

  // check if we need to fetch new docs
  if (cacheDoc.count() === 0 && docTOC) {
    console.log("CacheDocs Publication: Fetch not found document", params);
    Meteor.call("redoc/getDocSet", params.repo, params.branch, params.alias);
  }
  // return cache doc
  return ReDoc.Collections.Docs.find({
    repo: params.repo,
    branch: params.branch
  });
});
