
import ReMarkdown from "./markdown.jsx";
import SearchResults from "../search/searchResults.jsx";
import classnames from "classnames";
import "underscore";

export default DocView = React.createClass({
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

  renderMenu: function(parentPath) {
    let self = this;
    let items = [];
    let parentItems = _.filter(this.data.docs, function(item) { return item.parentPath === parentPath });
    if (parentItems.length === 0) {
      return [];
    }

    const className = parentPath ? 'guide-sub-nav-item' : 'guide-nav-item';
    for (let item of parentItems) {
      const branch = this.props.params.branch || "master";
      const url = `/${item.repo}/${branch}/${item.alias}`;
      items.push (
        <li className={className}>
          <a href={url} onClick={this.handleDocNavigation}>{item.label}</a>
        </li>
      )
      currentPath = s.strLeftBack(item.docPath, '/README.md'); // Dirs path has /README.md attached to them
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
                  <img className="logo" src="images/logo.png" />
                  <a className="nav-link" href="https://rocket.chat"> {"Rocket.Chat"} </a>
                </li>
                <li className="reaction-nav-item"><a className="nav-link" href="https://demo.rocket.chat">{"Demo"}</a></li>
                <li className="reaction-nav-item"><a className="nav-link" href="https://rocket.chat/#features">{"Features"}</a></li>
                <li className="reaction-nav-item"><a className="nav-link" href="https://rocket.chat/#rocket-team">{"Team"}</a></li>
                <li className="reaction-nav-item"><a className="nav-link active" href="https://rocket.chat/docs">{"Docs"}</a></li>
                <li className="reaction-nav-item"><a className="nav-link" href="https://rocket.chat/blog">{"Blog"}</a></li>
                <li className="reaction-nav-item"><a className="nav-link" href="https://rocket.chat/releases">{"Download"}</a></li>
                <li className="reaction-nav-item"><a className="nav-link" href="https://rocket.chat/contact">{"Contact"}</a></li>

                {this.renderMenu()}
              </ul>
            </div>
        </div>
    );
  }
});
