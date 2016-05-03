// Meteor.publish("Docs", function () {
//   return ReDoc.Collections.Docs.find();
// });

Meteor.publish("userData", function () {
  return Meteor.users.find({
    _id: this.userId
  }, {
    fields: {
      "services.github.id": 1
    }
  });
});

Meteor.publish("TOC", function () {
  return ReDoc.Collections.TOC.find({}, {
    sort: {
      position: 1
    }
  });
});

Meteor.publish("Repos", function () {
  return ReDoc.Collections.Repos.find();
});

/*
 *  CacheDocs returns all docs, filter by branch
 *  checks if request docs exists first then pulls new data if there is none
 */
Meteor.publish("CacheDocs", function (docParams) {
  // some minor validation
  check(docParams, {
    repo: Match.Optional(String, null),
    branch: Match.Optional(String, null),
    alias: Match.Optional(String, null),
    subdoc: Match.Optional(String, null),
    splat: Match.Optional(String, null)
  });

  const baseURL = global.baseURL ? global.baseURL.substring(1) : null;

  let params = {};

  // Set params defaults
  params.repo = docParams.repo;
  params.alias = docParams.alias;
  if (docParams.subdoc) {
    params.alias = `${docParams.alias}/${docParams.subdoc}`
  }
  params.branch = docParams.branch || Meteor.settings.public.redoc.branch || "master";
  params.slug = docParams.splat;
  if (baseURL) {
    params.slug = docParams.splat.replace(new RegExp(`^${baseURL}/?`), '');
  }

  // defaults to welcome page if no particular doc requested
  if (docParams.splat === '' || docParams.splat === baseURL || !params.slug) {
    params.slug = `${params.branch}/welcome`;
  }

  // Set params for doc if docParams is empty using the default doc params
  if (Object.keys(docParams).length === 0) {
    const defaultToc = ReDoc.Collections.TOC.findOne({
      default: true
    });

    params.repo = defaultToc.repo;
    params.slug = defaultToc.slug;
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
  }

  if (!params.repo) {
    params.repo = docRepo.repo;
  }

  if (!params.branch) {
    params.branch = docRepo.default_branch || Meteor.settings.public.redoc.branch || "master";
  }

  // assemble TOC
  let docTOC = ReDoc.Collections.TOC.findOne({
    slug: params.slug,
    repo: params.repo
  });

  // find specific branch in Docs
  let cacheDoc = ReDoc.Collections.Docs.find({
    repo: params.repo,
    branch: params.branch,
    slug: params.slug
  });

  // check if we need to fetch new docs
  if (cacheDoc.count() === 0 && docTOC) {
    Meteor.call("redoc/getDocSet", params.repo, params.branch);
  }
  // return cache doc
  return cacheDoc;
});
