import React, { memo, useMemo } from "react";
// nohighlight entry: same full editor, minus the prism/refractor
// highlighting toolchain (lighter, fewer moving parts; forum code blocks
// read fine unhighlighted).
import MDEditor, { commands } from "@uiw/react-md-editor/nohighlight";
import "@uiw/react-md-editor/markdown-editor.css";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import ForumMarkdown from "@/components/ForumMarkdown.jsx";

/**
 * Toolbar allowlist: formatting, code, quotes, lists, headings (h4-h6 to
 * match the renderer's demotion cap), tables, hr. Deliberately absent:
 * link, image, issue, comment, help (help opens an external page).
 */
const FORUM_COMMANDS = [
  commands.bold,
  commands.italic,
  commands.strikethrough,
  commands.hr,
  commands.divider,
  commands.group([commands.title4, commands.title5, commands.title6], {
    name: "title",
    groupName: "title",
    buttonProps: { "aria-label": "Insert heading" },
  }),
  commands.divider,
  commands.code,
  commands.codeBlock,
  commands.quote,
  commands.unorderedListCommand,
  commands.orderedListCommand,
  commands.table,
];

// Top-right button group: fullscreen only. The Edit/Live/Preview toggles
// are excluded on purpose (the editor is locked to edit mode; our preview
// pane below is the single preview). Must be module-level, NOT an inline
// literal: the editor re-dispatches whenever the array identity changes,
// so a fresh `[]` every render would churn state on every parent render.
const FORUM_EXTRA_COMMANDS = [commands.fullscreen];

/**
 * Shared markdown composer for forum topics and replies. Markdown-first:
 * value IS the stored source (same string the byte budget measures), so
 * nothing is lost between editing, validation, and broadcast.
 *
 * Editor on top, preview below: the editor runs in edit mode (no side by
 * side split) and the preview pane underneath reuses the exact hardened
 * reader pipeline, so authors see byte-for-byte what readers get.
 */
function ForumEditor({
  value,
  onChange,
  placeholder,
  dark,
  disabled,
  minHeight = 180,
  previewBelow = true,
}) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const textareaProps = useMemo(
    () => ({ placeholder, disabled }),
    [placeholder, disabled]
  );
  return (
    <div data-color-mode={dark ? "dark" : "light"}>
      <MDEditor
        value={value}
        onChange={(next) => onChange(next || "")}
        preview="edit"
        minHeight={minHeight}
        visibleDragbar={false}
        hideToolbar={false}
        commands={FORUM_COMMANDS}
        extraCommands={FORUM_EXTRA_COMMANDS}
        textareaProps={textareaProps}
      />
      {previewBelow ? (
        <div className="forum-editor-preview">
          <div className="forum-editor-preview-caption">
            {t("Forum:previewPane", "Preview")}
          </div>
          <div className="forum-editor-preview-body">
            <ForumMarkdown text={value} dark={dark} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default memo(ForumEditor);
