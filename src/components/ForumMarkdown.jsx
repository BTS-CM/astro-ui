import React, { memo } from "react";
import MDEditor from "@uiw/react-md-editor/nohighlight";
import "@uiw/react-markdown-preview/markdown.css";
import "./forum-markdown.css";
import {
  FORUM_SANITIZE_SCHEMA,
  rehypeSanitize,
  stripForumHtmlAttrs,
} from "@/lib/forumMarkdown.js";

/**
 * Component overrides: links render as inert text (href never reaches the
 * DOM), images render nothing, h1-h3 demote to h4 (page hierarchy stays
 * intact), task-list checkboxes become literal text, tables get an
 * overflow-x scroll wrapper. `node` is destructured out so hast props are
 * never spread onto DOM elements.
 */
function ForumLink({ node, children }) {
  void node;
  return <span>{children}</span>;
}

function ForumNull() {
  return null;
}

function ForumH4({ node, children }) {
  void node;
  return <h4>{children}</h4>;
}

function ForumTaskBox() {
  return <span>[ ]</span>;
}

function ForumTable({ node, children }) {
  void node;
  return (
    <div className="forum-md-tablewrap">
      <table>{children}</table>
    </div>
  );
}

const FORUM_COMPONENTS = {
  a: ForumLink,
  img: ForumNull,
  h1: ForumH4,
  h2: ForumH4,
  h3: ForumH4,
  input: ForumTaskBox,
  table: ForumTable,
};

/**
 * Hardened markdown viewer for forum topics and replies. `text` is the
 * stored markdown source (untrusted, permanent). Renders the shared
 * pipeline: skipHtml parse → component neutering → sanitize allowlist.
 */
function ForumMarkdown({ text, dark }) {
  return (
    <div className="forum-md" data-color-mode={dark ? "dark" : "light"}>
      <MDEditor.Markdown
        source={text || ""}
        skipHtml
        disableCopy
        rehypePlugins={[[rehypeSanitize, FORUM_SANITIZE_SCHEMA]]}
        rehypeRewrite={stripForumHtmlAttrs}
        components={FORUM_COMPONENTS}
      />
    </div>
  );
}

export { FORUM_COMPONENTS };
export default memo(ForumMarkdown);
