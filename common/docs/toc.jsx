
import ReMarkdown from "./markdown.jsx";
import SearchResults from "../search/searchResults.jsx";
import classnames from "classnames";
import "underscore";

export default React.createClass({
  mixins: [ReactMeteorData],

  getMeteorData() {
    let data = {};
    const tocSub = Meteor.subscribe("TOC");

    if (Meteor.isClient) {
      data = {
        tocIsLoaded: tocSub.ready(),
        docs: ReDoc.Collections.TOC.find({}, { sort: { sort: 1 } }).fetch(),
        isMenuVisible: Session.get("isMenuVisible")
      };
    }

    if (Meteor.isServer) {
      Meteor.subscribe("TOC");
      data = {
        tocIsLoaded: tocSub.ready(),
        docs: ReDoc.Collections.TOC.find().fetch()
      };
    }

    return data;
  },

  handleDocNavigation(event) {
    event.preventDefault();

    if (this.props.onDocNavigation) {
      this.props.onDocNavigation(event.target.href);
    }
  },

  renderMainNavigationLinks(active) {
    let links = [];
    for (link of Meteor.settings.public.redoc.mainNavigationLinks) {
      let className = (link.href === active || link.value === active) ? "nav-link active" : "nav-link";
      links.push(<li className="reaction-nav-item"><a className={className} href={link.href}>{link.value}</a></li>);
    }
    return links;
  },

  renderMenu: function(parentPath) {
    let self = this;
    let items = [];
    let parentItems = _.filter(this.data.docs, function(item) { return item.parentPath === parentPath });
    if (parentItems.length === 0) {
      return [];
    }
    const items = this.data.docs.map((item) => {
      const branch = this.props.params.branch || Meteor.settings.public.redoc.branch || "master";
      const url = `/${item.repo}/${branch}/${item.alias}`;

    const className = parentPath ? 'guide-sub-nav-item' : 'guide-nav-item';
    for (let item of parentItems) {
      const branch = this.props.params.branch || "master";
      const url = `/${item.repo}/${branch}/${item.alias}`;
      items.push (
        <li className={className}>
          <a href={url} onClick={this.handleDocNavigation}>{item.label}</a>
        </li>
      )
      let currentPath = s.strLeftBack(item.docPath, '/README.md'); // Dirs path has /README.md attached to them
      items = items.concat(self.renderMenu(currentPath));
    }

    return items;
  },

  render() {
    const classes = classnames({
      redoc: true,
      navigation: true,
      visible: this.data.isMenuVisible
    });

    return (
        <div className={classes}>
            <div className="menu">
              <ul>
                <li className="reaction-nav-item primary">
                  <img className="logo" src={Meteor.settings.public.redoc.logo.image} />
                  <a className="nav-link" href={Meteor.settings.public.redoc.logo.link.href}>{Meteor.settings.public.redoc.logo.link.value}</a>
                </li>
                {this.renderMainNavigationLinks('Docs')}
                {this.renderMenu()}
              </ul>
            </div>
        </div>
    );
  }
});
