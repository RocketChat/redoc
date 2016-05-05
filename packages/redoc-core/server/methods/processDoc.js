import { Meteor } from "meteor/meteor";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import TOCParser, { slugify } from "../../lib/plugins/toc";
import slugifyPath from "slugify-path";
import s from "underscore.string";

const md = MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: function (code) {
    return hljs.highlightAuto(code).value;
  },
  documentTOC(toc, env) {
    ReDoc.Collections.TOC.update({
      repo: env.repo,
      // branch: env.branch,
      alias: env.alias
    }, {
      $set: {
        documentTOC: toc
      }
    });
  },

  replaceLink: (link, env) => {
    const isImage = link.search(/([a-z\-_0-9\/\:\.]*\.(jpg|jpeg|png|gif))/i) > -1;
    const hasProtocol = link.search(/^[a-zA-Z]+:\/\//) > -1;
    let newLink = link;
    if (isImage && !hasProtocol) {
      newLink = `${env.rawUrl}/${env.branch}/${link}`;
    }

    link = link.replace('README.md', '');

    // general link replacement for relative repo links
    if (!isImage && !hasProtocol) {
      switch (link.charAt(0)) {
      case "#":
        newLink = `${global.baseURL}/${env.tocItem.slug}/#${slugify(newLink)}`; // swap any length of whitespace, underscore, hyphen characters with a single -
        break;
      case "/":
        newLink = `${global.baseURL}/${slugifyPath(decodeURIComponent(link.substring(1)), /^\d+(\.\d+)*\.?/)}`;
        break;
      default:
        newLink = `${global.baseURL}/${env.tocItem.slug}/${slugifyPath(decodeURIComponent(link), /^\d+(\.\d+)*\.?/)}`;
        break;
      }

      ReDoc.Collections.Links.upsert({ slug: env.slug, link: s.trim(s.strRight(newLink, global.baseURL), '/') }, { $set: { repo: env.repo, branch: env.branch } });
    }
    if (link.substr(-1) === "/") {
      newLink += "/";
    }
    return newLink;
  }
})
.use(require("markdown-it-replace-link"))
.use(TOCParser);


function article({ docUrl, content }) {
  return (
// This indentation and spacing is correct, leave it alone.
// Otherwise markdown-it might mistake this for a code block rather than just html.
`
<article class="subdoc">
  <header>
    <a href="${docUrl}">Edit on GitHub</a>
  </header>

  ${content}

</article>
`
  );
}

function checkLinks() {
  ReDoc.Collections.TOC.find({ expired: true }).forEach(function(toc) {
    ReDoc.Collections.Links.remove({ slug: toc.slug });
    ReDoc.Collections.Links.update({ link: toc.slug }, { $set: { expired: true }}, { multi: true });
  });
  ReDoc.Collections.Links.update({}, { $unset: { expired: true }}, { multi: true });
  ReDoc.Collections.Links.find({}).forEach(function(link) {
    [linkPart, hashPart] = link.link.split('#');
    query = { slug: s.rtrim(linkPart, '/'), expired: { $ne: true } };

    if (s.trim(hashPart)) {
      query['documentTOC.slug'] = hashPart;
    }

    if (!ReDoc.Collections.TOC.findOne(query)) {
      console.log('expire link', link);
      ReDoc.Collections.Links.update({ link: link.link }, { $set: { expired: true }}, { multi: true });
    }
  });
}

function processDoc({docRepo, tocItem, ...options}) {
  const alias = options.alias || tocItem.alias;
  const slug = options.slug || tocItem.slug;
  const style = options.style || tocItem.style;
  const rawUrl = options.rawUrl || docRepo.rawUrl;
  const repo = options.repo;
  const branch = options.branch || "master";
  const sha = options.sha;
  const docPath = tocItem.docPath;
  const docHtmlUrl = docRepo.data.html_url;
  const docSourceUrl = `${rawUrl}/${branch}/${docPath}`;
  const docRepoUrl = `${docHtmlUrl}/tree/${branch}/${docPath}`;

  // lets fetch that Github repo
  Meteor.http.get(docSourceUrl, function (error, result) {
    if (error) return error;
    if (result.statusCode === 200) {
      // sensible defaults for every repo
      let docSet = ReDoc.getPathParams(docSourceUrl);
      docSet.docPage = docSourceUrl;
      docSet.docPath = docPath;

      // if TOC has different alias, we'll use that
      if (alias) {
        docSet.alias = alias;
      }

      if (sha) {
        docSet.sha = sha;
      }

      if (slug) {
        docSet.slug = slug;
      }

      // if TOC has different label, we'll use that
      if (tocItem.label) {
        let label = tocItem.label;
        if (tocItem.parentPath) {
          const parentDoc = ReDoc.Collections.TOC.findOne({ docPath: tocItem.parentPath + "/README.md" });

          if (parentDoc) {
            label = parentDoc.label + " - " + label;
          }
        }
        docSet.label = label;
      }

      // pre-process documentation
      if (!result.content) {
        console.log(`redoc/getDocSet: Docset not found for ${docSet.docPath}.`);
        result.content = `# ${docSet.labell || tocItem.label || ''}` // `# Not found. \n  ${docSourceUrl}`; // default not found, should replace with custom tpl.
        // result.content = `# Not found. \n  ${docSourceUrl}`; // default not found, should replace with custom tpl.
      }

      let documentContent = article({
        docUrl: docRepoUrl,
        content: result.content
      });

      ReDoc.Collections.Links.remove({ slug: slug });

      docSet.docPageContent = documentContent;
      docSet.docPageContentHTML = md.render(documentContent, {
        rawUrl,
        branch,
        alias: docSet.alias,
        repo,
        style,
        docPath,
        tocItem,
        slug
      });

      ReDoc.Collections.TOC.update({ _id: tocItem._id }, { $set: { updated: true }, $unset: { updating: 1 } });

      // insert new documentation into Cache
      upsertResult = ReDoc.Collections.Docs.upsert({
        docPage: docSourceUrl
      }, {
        $set: docSet
      });


      global.DocCounter--;
      if (global.DocCounter === 0) {
        ReDoc.Collections.TOC.update({ updated: { $ne: true } }, { $set: { expired: true } }, { multi: true });
        checkLinks();
      }

      return upsertResult;

    }
  });
}

export default processDoc;
export { article };
