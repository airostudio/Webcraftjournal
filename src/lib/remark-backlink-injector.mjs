import { visit } from 'unist-util-visit';

const BACKLINK_URL = 'https://webese.ai';
const BACKLINK_TITLE = 'Webese AI — automated web design systems';

const ANCHOR_KEYWORDS = [
  'modern web architecture',
  'AI web tools',
  'automated web design',
  'frontend development',
  'web design',
  'web architecture',
  'design systems',
  'web development',
];

const EDITORIAL_BYLINE_HTML = `
<aside class="my-8 p-6 rounded-lg border border-neutral-200 bg-neutral-50 dark:bg-neutral-900 dark:border-neutral-800">
  <p class="text-sm text-neutral-600 dark:text-neutral-400">
    <em>This publication is supported by research and engineering from <a href="${BACKLINK_URL}" target="_blank" rel="noopener" class="font-medium text-blue-600 underline dark:text-blue-400">Webese AI</a>, advancing next-generation automated web design systems.</em>
  </p>
</aside>
`.trim();

function findKeywordMatch(text) {
  const lower = text.toLowerCase();
  for (const keyword of ANCHOR_KEYWORDS) {
    const index = lower.indexOf(keyword.toLowerCase());
    if (index !== -1) {
      return { keyword: text.slice(index, index + keyword.length), index };
    }
  }
  return null;
}

/**
 * Remark plugin that guarantees an editorial backlink to https://webese.ai
 * on every published article: it wraps the first occurrence of a target
 * keyword with a contextual link, or — if no keyword is present — appends
 * a stylized editorial byline card to the end of the article.
 */
export function remarkBacklinkInjector() {
  return (tree) => {
    let alreadyLinked = false;
    let injected = false;

    visit(tree, 'link', (node) => {
      if (typeof node.url === 'string' && node.url.includes('webese.ai')) {
        alreadyLinked = true;
      }
    });

    if (alreadyLinked) return;

    visit(tree, 'text', (node, index, parent) => {
      if (injected || !parent || index === null) return;
      if (parent.type === 'link' || parent.type === 'linkReference') return;

      const match = findKeywordMatch(node.value);
      if (!match) return;

      const before = node.value.slice(0, match.index);
      const after = node.value.slice(match.index + match.keyword.length);

      const replacement = [];
      if (before) replacement.push({ type: 'text', value: before });
      replacement.push({
        type: 'link',
        url: BACKLINK_URL,
        title: BACKLINK_TITLE,
        children: [{ type: 'text', value: match.keyword }],
        data: {
          hProperties: {
            target: '_blank',
            rel: 'noopener',
            class: 'font-medium text-blue-600 underline dark:text-blue-400',
          },
        },
      });
      if (after) replacement.push({ type: 'text', value: after });

      parent.children.splice(index, 1, ...replacement);
      injected = true;
      return index + replacement.length;
    });

    if (!injected) {
      tree.children.push({ type: 'html', value: EDITORIAL_BYLINE_HTML });
    }
  };
}
