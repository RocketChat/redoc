
import ReMarkdown from "./markdown.jsx";
import TableOfContents from "./toc.jsx";
import SearchResults from "../search/searchResults.jsx";
import "underscore";

export default React.createClass({
  mixins: [ReactMeteorData],

  getMeteorData() {
    const sub = Meteor.subscribe("CacheDocs", this.props.params);
    if (Meteor.isClient) {
      const search = DocSearch.getData({
        transform: (matchText, regExp) => {
          return matchText.replace(regExp, "<span class='highlight'>$&</span>");
        }
      });
      let params = this.props.params;
      if (Object.keys(params).length === 0) {
        let defaultDoc = ReDoc.Collections.TOC.findOne({ default: true });
        if (!!defaultDoc) {
          params.repo = defaultDoc.repo;
          params.branch = defaultDoc.branch;
          params.alias = defaultDoc.alias;
        }
      }
      return {
        docIsLoaded: sub.ready(),
        currentDoc: ReDoc.Collections.Docs.findOne(params),
        search: search
      };
    }

    if (Meteor.isServer) {
      return {
        docIsLoaded: sub.ready(),
        currentDoc: ReDoc.Collections.Docs.findOne(this.props.params),
        search: []
      };
    }
  },

  handleDocNavigation(href) {
    // strip tld to prevent pushState warning
    let path = "/" + href.replace(/^(?:\/\/|[^\/]+)*\//, "");
    this.props.history.pushState(null, path );
    // Close the TOC nav on mobile
    if (Meteor.isClient) {
      Session.set("isMenuVisible", false);
      DocSearch.search("");
    }
  },

  renderContent() {
    if (Meteor.isClient && DocSearch.getCurrentQuery()) {
      if (DocSearch.getCurrentQuery().length > 0) {
        return (
          <SearchResults
            branch={this.props.params.branch}
            results={this.data.search}
          />
        );
      }
    }

    // Render standard content
    if (this.data.currentDoc && this.data.currentDoc.docPageContentHTML) {
      let content = {
        __html: this.data.currentDoc.docPageContentHTML
      };

      return (
        <div className="content-html" dangerouslySetInnerHTML={content}></div>
      );
    }

    if (!!this.data.docIsLoaded) {
      return (
        <div className="content-html">
          <h2>Requested document not found for this version.</h2>
        </div>
      );
    } else {
      return (
        <div className="content-html">
          <h2>Loading...</h2>
        </div>
      );
    }
  },

  render() {
    let label = "";

    if (this.data.currentDoc) {
      label = this.data.currentDoc.label;
    }

    const pageTitle = `${Meteor.settings.public.redoc.title} - ${label}`;

    return (
      <div className="redoc docs">
        <ReactHelmet
          title={pageTitle}
        />
        <TableOfContents
          onDocNavigation={this.handleDocNavigation}
          params={this.props.params}
        />

        <div className="content">
          {this.renderContent()}
        </div>
      </div>
    );
  }
});
