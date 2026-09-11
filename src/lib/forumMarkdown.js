/**
 * Shared markdown pipeline for the forum (view path).
 *
 * Stored payloads stay markdown *source* as plain text ({title,text} /
 * {text} shapes are frozen) — rendering happens here, at view time:
 *
 *   markdown source → remark-gfm parse → component neutering →
 *   rehype-sanitize allowlist → React tree (no HTML strings anywhere)
 *
 * Blocked by construction: links, images, embeds/iframes, raw HTML,
 * scripts, styles, attributes. The uiw preview builds a React element
 * tree (never an HTML string), and three independent layers each suffice
 * alone:
 *   1. skipHtml: raw HTML blocks/inline never parse into elements.
 *   2. components (ForumMarkdown.jsx): `a` renders as plain text, `img`
 *      renders nothing, h1-h3 demote to h4, task-list inputs become text.
 *   3. FORUM_SANITIZE_SCHEMA below: tag allowlist + zero attributes.
 *
 * Allowed: emphasis, inline/block code, h4-h6, quotes, lists, hr,
 * strikethrough, GFM tables.
 */

import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

export { rehypeSanitize };

/** Tags the forum renderer may emit. No a/img/iframe/script/style/input. */
export const FORUM_MD_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "code",
  "pre",
  "blockquote",
  "ul",
  "ol",
  "li",
  "h4",
  "h5",
  "h6",
  "hr",
  "del",
  "s",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
];

/**
 * rehype-sanitize schema: default schema restricted to FORUM_MD_TAGS
 * with ALL attributes stripped (kills href, src, on-handlers, class and
 * id in one move — protocols and ancestors are moot once no attributes
 * survive).
 */
export const FORUM_SANITIZE_SCHEMA = {
  ...defaultSchema,
  tagNames: FORUM_MD_TAGS,
  attributes: {},
  protocols: {},
  ancestors: {},
};

/**
 * rehypeRewrite callback (used as a second barrier alongside the schema):
 * wipe every element's properties so no attribute survives to the tree,
 * whatever the schema version does.
 */
export function stripForumHtmlAttrs(node) {
  if (node && node.type === "element") {
    node.properties = {};
  }
}
